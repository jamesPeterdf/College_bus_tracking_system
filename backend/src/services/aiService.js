const { OpenAI } = require('openai');
const db = require('../config/db');
const redisClient = require('../config/redis');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const getChatResponse = async (userId, userRole, message) => {
    let context = "";

    if (userRole === 'student') {
        const studentRes = await db.query('SELECT s.*, r.route_name, st.stop_name FROM Students s LEFT JOIN Routes r ON s.route_id = r.route_id LEFT JOIN Stops st ON s.stop_id = st.stop_id WHERE s.student_id = $1', [userId]);
        const student = studentRes.rows[0];

        if (student) {
            const busLocation = await redisClient.get(`bus_location:${student.route_id}`);
            context = `User: ${student.name}, Roll: ${student.roll_number}, Dept: ${student.department}. 
                 Route: ${student.route_name || 'N/A'}, Assigned Stop: ${student.stop_name || 'N/A'}.
                 Live Bus Info: ${busLocation || 'Tracking offline'}.`;
        }
    }

    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            {
                role: "system",
                content: `You are COBUS AI, a highly intelligent but slightly sarcastic college bus tracking assistant. 
                  Current context: ${context}
                  You MUST respond in 'Tanglish' (a seamless mix of Tamil and English) like a stand-up comedian. Use common Tamil colloquialisms, movie references, and humor while providing accurate info. 
                  Example: "Machi, un bus varuthu paru! Route 3A is 5 mins away. Tension aagama kelambu."
                  If the bus is late, make a joke about Chennai traffic or driver anna. Keep responses concise but very entertaining.`
            },
            { role: "user", content: message }
        ],
    });

    return response.choices[0].message.content;
};

const optimizeRouteWithAI = async (routeId) => {
    // 1. Fetch stops for the route
    const stopsRes = await db.query(
        'SELECT stop_id, stop_name, latitude, longitude FROM Stops WHERE route_id = $1 ORDER BY stop_order', 
        [routeId]
    );
    const stops = stopsRes.rows;

    if (stops.length <= 2) return { message: 'Too few stops to optimize.' };

    const stopsData = stops.map(s => ({
        id: s.stop_id,
        name: s.stop_name,
        lat: s.latitude,
        lng: s.longitude
    }));

    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            {
                role: "system",
                content: `You are an expert GIS and route optimization AI solving the Traveling Salesperson logic.
Given this array of bus stops with valid coordinates, determine the geographically shortest sequence to visit all stops.
Return ONLY a valid JSON array of 'stop_id' strings in the new optimal order. Do not include markdown formatting or ANY other text. Example: ["stop1", "stop2", "stop3"]`
            },
            { role: "user", content: JSON.stringify(stopsData) }
        ],
    });

    try {
        let content = response.choices[0].message.content.trim();
        // Remove markdown block if AI includes it
        if (content.startsWith('```json')) content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        else if (content.startsWith('```')) content = content.replace(/```/g, '').trim();
        
        const optimalOrderIds = JSON.parse(content);
        
        if (!Array.isArray(optimalOrderIds) || optimalOrderIds.length !== stops.length) {
            throw new Error("AI returned malformed or incomplete optimal order");
        }

        // Update stop_order in database transactionally or sequentially
        for (let i = 0; i < optimalOrderIds.length; i++) {
            await db.query(
                'UPDATE Stops SET stop_order = $1 WHERE stop_id = $2 AND route_id = $3',
                [i + 1, optimalOrderIds[i], routeId]
            );
        }

        return { success: true, optimizedCount: optimalOrderIds.length };
    } catch (parseErr) {
        console.error("AI parse err:", response.choices[0].message.content);
        throw new Error("AI routing parse failure");
    }
};

const generateNewsletterWithAI = async (prompt) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are a professional administrative assistant for a college transport department. Write a concise, polite, and clear notification/newsletter for students and parents based on the given topic. Do not include placeholders like [Your Name], sign off as 'College Transport Management'."
                },
                { role: "user", content: `Topic: ${prompt}` }
            ],
            temperature: 0.7,
            max_tokens: 250,
        });

        return response.choices[0].message.content.trim();
    } catch (err) {
        console.error("AI Newsletter Error:", err);
        throw new Error("AI generation failed");
    }
};

module.exports = { getChatResponse, optimizeRouteWithAI, generateNewsletterWithAI };
