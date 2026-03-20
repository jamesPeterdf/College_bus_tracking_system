const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const db      = require('../config/db');

// GET /api/student/profile
router.get('/profile', auth(['student']), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT student_id, roll_number, name, email, phone,
                   department, semester, year, route_id, stop_id
            FROM Students WHERE student_id=$1
        `, [req.user.id]);
        if (!result.rows.length)
            return res.status(404).json({ message: 'Student not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/student/bus/metrics
router.get('/bus/metrics', auth(['student']), async (req, res) => {
    try {
        const studentRes = await db.query(
            'SELECT route_id, stop_id FROM Students WHERE student_id=$1',
            [req.user.id]
        );
        const { route_id: routeId, stop_id: stopId } = studentRes.rows[0] || {};
        if (!routeId) return res.status(404).json({ message: 'No route assigned to this student.' });

        const today = new Date().toISOString().split('T')[0];

        // Occupancy
        const occuRes = await db.query(
            `SELECT count(*) as count FROM Attendance WHERE route_id=$1 AND date=$2 AND status='Present'`,
            [routeId, today]
        );
        const currentOccupancy = parseInt(occuRes.rows[0].count) || 0;
        const totalCapacity = 45;

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
        const stopRes = await db.query(
            'SELECT latitude, longitude FROM Stops WHERE stop_id=$1',
            [stopId]
        );
        const stopCoords = stopRes.rows[0];

        // Bus live coordinates from DB
        const busRes = await db.query(
            'SELECT current_lat, current_lng FROM Buses WHERE route_id=$1 AND is_active=true LIMIT 1',
            [routeId]
        );

        if (!busRes.rows.length || !busRes.rows[0].current_lat || !stopCoords) {
            return res.json({
                eta: '-- MIN', distance: '-- KM',
                occupancy: `${currentOccupancy} / ${totalCapacity}`,
                isLive: false, driver: driverInfo
            });
        }

        const { current_lat, current_lng } = busRes.rows[0];

        // Haversine formula
        const R = 6371;
        const dLat = (stopCoords.latitude - current_lat) * (Math.PI / 180);
        const dLon = (stopCoords.longitude - current_lng) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(current_lat * Math.PI / 180) * Math.cos(stopCoords.latitude * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
        const distanceKM = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
        const actualEta  = Math.max(1, Math.round(distanceKM * 2.4)); // 25 km/h average

        res.json({
            eta:      `${actualEta} MIN`,
            distance: `${distanceKM} KM`,
            occupancy:`${currentOccupancy} / ${totalCapacity}`,
            isLive:   true,
            driver:   driverInfo
        });

    } catch (err) {
        console.error('Student metrics error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/student/route/timeline
router.get('/route/timeline', auth(['student']), async (req, res) => {
    try {
        const studentRes = await db.query(
            'SELECT route_id FROM Students WHERE student_id=$1',
            [req.user.id]
        );
        const routeId = studentRes.rows[0]?.route_id;
        if (!routeId) return res.status(404).json({ message: 'No route assigned.' });

        const stopsRes = await db.query(`
            SELECT stop_id, stop_name, latitude, longitude, estimated_arrival_time
            FROM Stops WHERE route_id=$1
            ORDER BY stop_order ASC
        `, [routeId]);

        if (!stopsRes.rows.length) return res.json([]);

        // Determine which stops are completed/active based on bus position
        const busRes = await db.query(
            'SELECT current_lat, current_lng FROM Buses WHERE route_id=$1 AND is_active=true LIMIT 1',
            [routeId]
        );
        const busLoc = busRes.rows[0];

        const timeline = stopsRes.rows.map((stop, index) => {
            let status = 'upcoming';
            if (busLoc && busLoc.current_lat) {
                const dLat  = stop.latitude  - busLoc.current_lat;
                const dLon  = stop.longitude - busLoc.current_lng;
                const distM = Math.sqrt(dLat * dLat + dLon * dLon) * 111000;
                if (index === 0 || distM < 300) status = 'completed';
            } else {
                if (index === 0) status = 'completed';
                else if (index === 1) status = 'active';
            }

            return {
                stop_id:   stop.stop_id,
                stop:      stop.stop_name,
                latitude:  stop.latitude,
                longitude: stop.longitude,
                time:      stop.estimated_arrival_time || `0${7 + index}:30 AM`,
                status,
            };
        });

        res.json(timeline);
    } catch (err) {
        console.error('Timeline error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/student/report (anomaly report)
router.post('/report', auth(['student']), async (req, res) => {
    const { description } = req.body;
    try {
        const busRes = await db.query(`
            SELECT b.bus_id FROM Buses b
            JOIN Students s ON s.route_id = b.route_id
            WHERE s.student_id=$1 AND b.is_active=true
            LIMIT 1
        `, [req.user.id]);

        const busId = busRes.rows[0]?.bus_id || null;

        await db.query(`
            INSERT INTO Alerts (bus_id, type, severity, description, status)
            VALUES ($1, 'Student Report', 'Low', $2, 'Active')
        `, [busId, description]);

        res.json({ success: true, message: 'Report submitted.' });
    } catch (err) {
        console.error('Report error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
