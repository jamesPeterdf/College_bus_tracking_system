const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getChatResponse } = require('../services/aiService');

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

module.exports = router;
