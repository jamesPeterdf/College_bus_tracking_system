const { getChatResponse, optimizeRouteWithAI, generateNewsletterWithAI } = require('../services/aiService');

exports.chat = async (req, res) => {
    const { message } = req.body;
    const userId = req.user.id;
    const role = req.user.role;
    try {
        const reply = await getChatResponse(userId, role, message);
        res.json({ reply });
    } catch (err) {
        res.status(500).json({ error: 'AI processing failed' });
    }
};

exports.optimizeRoute = async (req, res) => {
    const { route_id } = req.body;
    try {
        const result = await optimizeRouteWithAI(route_id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Optimization failed' });
    }
};

exports.generateNewsletter = async (req, res) => {
    const { prompt } = req.body;
    try {
        const reply = await generateNewsletterWithAI(prompt);
        res.json({ reply });
    } catch (err) {
        res.status(500).json({ error: 'AI generation failed' });
    }
};
