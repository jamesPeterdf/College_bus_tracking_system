const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const studentController = require('../controllers/student.controller');

router.get('/profile', auth(['student']), studentController.getProfile);
router.get('/bus/metrics', auth(['student']), studentController.getBusMetrics);
router.get('/route/timeline', auth(['student']), studentController.getTimeline);
router.post('/report', auth(['student']), studentController.submitReport);

module.exports = router;
