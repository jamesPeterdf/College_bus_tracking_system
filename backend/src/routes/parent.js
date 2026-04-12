const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const db      = require('../config/db');

// GET /api/parent/dashboard
// Fetch student's bus live metrics for the parent dashboard
router.get('/dashboard', auth(['parent']), async (req, res) => {
    try {
        const studentRes = await db.query(
            'SELECT route_id, stop_id FROM Students WHERE student_id=$1',
            [req.user.id] // req.user.id is student_id in parent token
        );
        const { route_id: routeId, stop_id: stopId } = studentRes.rows[0] || {};
        if (!routeId) return res.status(404).json({ message: 'No route assigned.' });

        const today = new Date().toISOString().split('T')[0];

        // Driver details
        let driverInfo = { name: 'Pending', phone: 'N/A', bus_number: 'Unknown' };
        const driverRes = await db.query(`
            SELECT d.name, d.phone, b.vehicle_number as bus_number
            FROM Buses b
            JOIN Drivers d ON b.driver_id = d.driver_id
            WHERE b.route_id=$1 AND b.is_active=true
            LIMIT 1
        `, [routeId]);
        if (driverRes.rows.length > 0) {
            const d = driverRes.rows[0];
            driverInfo = { name: d.name, phone: d.phone || '+91 90000 00000', bus_number: d.bus_number };
        }

        // Student's assigned stop coordinates
        const stopRes = await db.query('SELECT latitude, longitude FROM Stops WHERE stop_id=$1', [stopId]);
        const stopCoords = stopRes.rows[0];

        // Bus live coordinates from DB
        const busRes = await db.query('SELECT current_lat, current_lng FROM Buses WHERE route_id=$1 AND is_active=true LIMIT 1', [routeId]);

        if (!busRes.rows.length || !busRes.rows[0].current_lat || !stopCoords) {
            return res.json({
                eta: '-- MIN', distance: '-- KM',
                isLive: false, driver: driverInfo,
                busLocation: null,
                stopLocation: stopCoords || null
            });
        }

        const { current_lat, current_lng } = busRes.rows[0];

        // Haversine formula for ETA
        const R = 6371;
        const dLat = (stopCoords.latitude - current_lat) * (Math.PI / 180);
        const dLon = (stopCoords.longitude - current_lng) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(current_lat * Math.PI / 180) * Math.cos(stopCoords.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        const distanceKM = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
        const actualEta  = Math.max(1, Math.round(distanceKM * 2.4)); // 25 km/h average

        res.json({
            eta: `${actualEta} MIN`,
            distance: `${distanceKM} KM`,
            isLive: true,
            driver: driverInfo,
            busLocation: { lat: current_lat, lng: current_lng },
            stopLocation: stopCoords
        });

    } catch (err) {
        console.error('Parent dashboard metrics error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/parent/attendance
// Fetch student's attendance history
router.get('/attendance', auth(['parent']), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT date, status, verification_method, created_at
            FROM Attendance
            WHERE student_id=$1
            ORDER BY date DESC
            LIMIT 30
        `, [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/parent/newsletters
// Fetch communications to parents
router.get('/newsletters', auth(['parent']), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT notification_id as id, title, message, sent_at
            FROM Notifications
            WHERE recipient_type IN ('parent', 'all')
            ORDER BY sent_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
