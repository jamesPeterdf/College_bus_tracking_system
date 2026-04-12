const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const driverController = require('../controllers/driver.controller');

router.get('/profile', auth(['driver']), driverController.getProfile);
router.post('/location/update', auth(['driver']), driverController.updateLocation);
router.get('/route/students', auth(['driver']), driverController.getRouteStudents);
router.post('/attendance/mark', auth(['driver']), driverController.markAttendance);
router.post('/alert/sos', auth(['driver']), driverController.sosAlert);

module.exports = router;
