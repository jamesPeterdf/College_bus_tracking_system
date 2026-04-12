const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiController = require('../controllers/ai.controller');

router.post('/chat', auth(['student', 'driver', 'admin']), aiController.chat);
router.post('/optimize-route', auth(['admin']), aiController.optimizeRoute);
router.post('/generate-newsletter', auth(['admin']), aiController.generateNewsletter);

module.exports = router;
