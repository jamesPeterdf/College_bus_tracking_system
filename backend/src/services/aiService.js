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

module.exports = { getChatResponse };
