const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminController = require('../controllers/admin.controller');

router.get('/dashboard/stats', auth(['admin']), adminController.getStats);

router.get('/students', auth(['admin']), adminController.getAllStudents);
router.post('/students', auth(['admin']), adminController.createStudent);
router.put('/students/:id', auth(['admin']), adminController.updateStudent);
router.put('/students/:id/status', auth(['admin']), adminController.toggleStudentStatus);
router.put('/students/:id/reset-password', auth(['admin']), adminController.resetStudentPassword);
router.delete('/students/:id', auth(['admin']), adminController.deleteStudent);

router.get('/drivers', auth(['admin']), adminController.getAllDrivers);
router.post('/drivers', auth(['admin']), adminController.createDriver);
router.get('/drivers/:id', auth(['admin']), adminController.getDriverById);
router.put('/drivers/:id', auth(['admin']), adminController.updateDriver);
router.put('/drivers/:id/status', auth(['admin']), adminController.toggleDriverStatus);
router.put('/drivers/:id/reset-password', auth(['admin']), adminController.resetDriverPassword);
router.delete('/drivers/:id', auth(['admin']), adminController.deleteDriver);
router.get('/drivers/:id/history', auth(['admin']), adminController.getDriverHistory);
router.post('/drivers/:id/history', auth(['admin']), adminController.createDriverHistory);

router.get('/buses', auth(['admin']), adminController.getAllBuses);
router.post('/buses', auth(['admin']), adminController.createBus);
router.put('/buses/:id', auth(['admin']), adminController.updateBus);
router.put('/buses/:id/status', auth(['admin']), adminController.toggleBusStatus);
router.delete('/buses/:id', auth(['admin']), adminController.deleteBus);

router.get('/routes', auth(['admin']), adminController.getAllRoutes);
router.post('/routes', auth(['admin']), adminController.createRoute);
router.delete('/routes/:id', auth(['admin']), adminController.deleteRoute);

router.get('/stops', auth(['admin']), adminController.getAllStops);
router.post('/stops', auth(['admin']), adminController.createStop);
router.delete('/stops/:id', auth(['admin']), adminController.deleteStop);

router.get('/attendance', auth(['admin']), adminController.getAttendance);

router.get('/communications', auth(['admin']), adminController.getCommunications);
router.post('/communications', auth(['admin']), adminController.createCommunication);

router.get('/alerts', auth(['admin']), adminController.getAlerts);
router.put('/alerts/:id/resolve', auth(['admin']), adminController.resolveAlert);
router.delete('/alerts/:id', auth(['admin']), adminController.deleteAlert);

router.post('/emergency/lockdown', auth(['admin']), adminController.emergencyLockdown);
router.post('/cache/flush', auth(['admin']), adminController.flushCache);

module.exports = router;
