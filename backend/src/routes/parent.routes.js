const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const parentController = require('../controllers/parent.controller');

router.get('/dashboard', auth(['parent']), parentController.getDashboard);
router.get('/attendance', auth(['parent']), parentController.getAttendance);
router.get('/newsletters', auth(['parent']), parentController.getNewsletters);

module.exports = router;
