const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getChatResponse, optimizeRouteWithAI, generateNewsletterWithAI } = require('../services/aiService');

router.post('/chat', auth(['student', 'driver', 'admin']), async (req, res) => {
    const { message } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    try {
        const reply = await getChatResponse(userId, role, message);
        res.json({ reply });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'AI processing failed' });
    }
});

router.post('/optimize-route', auth(['admin']), async (req, res) => {
    const { route_id } = req.body;
    try {
        const result = await optimizeRouteWithAI(route_id);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Optimization failed' });
    }
});

router.post('/generate-newsletter', auth(['admin']), async (req, res) => {
    const { prompt } = req.body;
    try {
        const reply = await generateNewsletterWithAI(prompt);
        res.json({ reply });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'AI generation failed' });
    }
});

module.exports = router;
