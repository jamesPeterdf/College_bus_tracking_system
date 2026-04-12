const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/student/login', authController.studentLogin);
router.post('/parent/login', authController.parentLogin);
router.post('/driver/login', authController.driverLogin);
router.post('/admin/login', authController.adminLogin);

module.exports = router;
