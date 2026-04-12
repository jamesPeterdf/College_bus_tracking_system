const Groq = require('groq-sdk');
const db = require('../config/db');
const redisClient = require('../config/redis');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const getChatResponse = async (userId, userRole, message) => {
    let context = "";
    if (userRole === 'student') {
        const { data: student } = await db
            .from('students')
            .select('*, routes(route_name), stops(stop_name)')
            .eq('student_id', userId)
            .single();
        if (student) {
            const busLocation = await redisClient.get(`bus_location:${student.route_id}`);
            context = `User: ${student.name}, Roll: ${student.roll_number}, Dept: ${student.department}. Route: ${student.routes?.route_name || 'N/A'}, Stop: ${student.stops?.stop_name || 'N/A'}. Bus: ${busLocation || 'Offline'}.`;
        }
    }
    const response = await groq.chat.completions.create({
        model: "llama3-70b-8192",
        messages: [
            {
                role: "system",
                content: `You are COBUS AI, a sarcastic college bus assistant. Context: ${context}. Respond in 'Tanglish' (Tamil+English) with humor. Keep it concise.`
            },
            { role: "user", content: message }
        ],
    });
    return response.choices[0].message.content;
};

const optimizeRouteWithAI = async (routeId) => {
    const { data: stops } = await db.from('stops').select('stop_id, stop_name, latitude, longitude').eq('route_id', routeId).order('stop_order');
    if (stops.length <= 2) return { message: 'Too few stops' };
    const response = await groq.chat.completions.create({
        model: "llama3-70b-8192",
        messages: [
            {
                role: "system",
                content: `Return ONLY a valid JSON array of 'stop_id' strings in optimal order. No markdown.`
            },
            { role: "user", content: JSON.stringify(stops) }
        ],
    });
    try {
        let content = response.choices[0].message.content.trim();
        if (content.startsWith('```json')) content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        else if (content.startsWith('```')) content = content.replace(/```/g, '').trim();
        const optimalOrderIds = JSON.parse(content);
        for (let i = 0; i < optimalOrderIds.length; i++) {
            await db.from('stops').update({ stop_order: i + 1 }).eq('stop_id', optimalOrderIds[i]).eq('route_id', routeId);
        }
        return { success: true, optimizedCount: optimalOrderIds.length };
    } catch (err) { throw new Error("AI routing failure"); }
};

const generateNewsletterWithAI = async (prompt) => {
    try {
        const response = await groq.chat.completions.create({
            model: "llama3-70b-8192",
            messages: [
                {
                    role: "system",
                    content: "Write a concise transport notification. Close with 'College Transport Management'."
                },
                { role: "user", content: prompt }
            ],
        });
        return response.choices[0].message.content.trim();
    } catch (err) { throw new Error("AI generation failed"); }
};

module.exports = { getChatResponse, optimizeRouteWithAI, generateNewsletterWithAI };
