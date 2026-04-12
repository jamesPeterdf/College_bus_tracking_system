const express  = require('express');
const router   = express.Router();
const auth     = require('../middleware/auth');
const redisClient = require('../config/redis');
const db       = require('../config/db');

// GET /api/driver/profile
router.get('/profile', auth(['driver']), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT d.driver_id, d.name, d.phone, d.driver_code,
                   b.route_id, b.bus_id, b.vehicle_number as bus_number,
                   r.route_code, r.route_name
            FROM Drivers d
            LEFT JOIN Buses b ON b.driver_id = d.driver_id AND b.is_active = true
            LEFT JOIN Routes r ON b.route_id = r.route_id
            WHERE d.driver_id = $1
        `, [req.user.id]);
        if (!result.rows.length)
            return res.status(404).json({ message: 'Driver not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/driver/location/update (HTTP fallback — primary is Socket.io)
router.post('/location/update', auth(['driver']), async (req, res) => {
    const { lat, lng, speed, heading } = req.body;
    const driverId = req.user.id;

    try {
        // Find this driver's active bus + route
        const busRes = await db.query(
            'SELECT bus_id, route_id FROM Buses WHERE driver_id = $1 AND is_active = true LIMIT 1',
            [driverId]
        );
        if (!busRes.rows.length)
            return res.status(404).json({ error: 'No active bus found for driver' });

        const { bus_id, route_id } = busRes.rows[0];

        // Update bus location in DB
        await db.query(
            'UPDATE Buses SET current_lat=$1, current_lng=$2, last_updated=NOW() WHERE bus_id=$3',
            [lat, lng, bus_id]
        );

        // Cache in Redis for fast student reads
        await redisClient.set(`bus_location:${route_id}`, JSON.stringify({ lat, lng, speed, heading }), { EX: 300 });

        // Broadcast via Socket.io
        const io = req.app.get('socketio');
        io.to(`route_${route_id}`).emit('location_update', { route_id, bus_id, lat, lng, heading });

        res.json({ success: true });
    } catch (err) {
        console.error('Location update error:', err.message);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

// GET /api/driver/route/students
router.get('/route/students', auth(['driver']), async (req, res) => {
    try {
        const driverId = req.user.id;

        const driverRes = await db.query(
            'SELECT b.route_id, b.bus_id FROM Buses b WHERE b.driver_id=$1 AND b.is_active=true LIMIT 1',
            [driverId]
        );
        if (!driverRes.rows.length || !driverRes.rows[0].route_id)
            return res.status(404).json({ error: 'No active bus or route assigned' });

        const routeId = driverRes.rows[0].route_id;

        const studentsRes = await db.query(`
            SELECT student_id as id, roll_number as roll, name, stop_id
            FROM Students
            WHERE route_id=$1 AND is_active=true
            ORDER BY stop_id
        `, [routeId]);

        const today = new Date().toISOString().split('T')[0];
        const attRes = await db.query(
            'SELECT student_id, status FROM Attendance WHERE route_id=$1 AND date=$2',
            [routeId, today]
        );

        const attMap = {};
        attRes.rows.forEach(r => { attMap[r.student_id] = r.status; });

        const students = studentsRes.rows.map(s => ({
            ...s,
            status: attMap[s.id] || 'Pending'
        }));

        res.json(students);
    } catch (err) {
        console.error('Route students error:', err.message);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

// POST /api/driver/attendance/mark
router.post('/attendance/mark', auth(['driver']), async (req, res) => {
    const { student_id, status } = req.body;
    try {
        // Find driver's current route
        const busRes = await db.query(
            'SELECT route_id FROM Buses WHERE driver_id=$1 AND is_active=true LIMIT 1',
            [req.user.id]
        );
        const routeId = busRes.rows[0]?.route_id;
        if (!routeId) return res.status(400).json({ error: 'No active route' });

        const today = new Date().toISOString().split('T')[0];

        // Manual Upsert since there's no unique constraint on (student_id, date)
        const existing = await db.query(
            'SELECT attendance_id FROM Attendance WHERE student_id=$1 AND date=$2',
            [student_id, today]
        );

        if (existing.rows.length > 0) {
            await db.query(`
                UPDATE Attendance SET status=$1, verification_method='Driver Manual Override'
                WHERE attendance_id=$2
            `, [status || 'Present', existing.rows[0].attendance_id]);
        } else {
            await db.query(`
                INSERT INTO Attendance (student_id, driver_id, route_id, date, status, verification_method)
                VALUES ($1, $2, $3, $4, $5, 'Driver Manual')
            `, [student_id, req.user.id, routeId, today, status || 'Present']);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Attendance mark error:', err.message);
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
});

// POST /api/driver/alert/sos
router.post('/alert/sos', auth(['driver']), async (req, res) => {
    const { lat, lng } = req.body;
    try {
        const busRes = await db.query(
            'SELECT bus_id FROM Buses WHERE driver_id=$1 AND is_active=true LIMIT 1',
            [req.user.id]
        );
        if (!busRes.rows.length) return res.status(404).json({ error: 'No active bus' });
        const busId = busRes.rows[0].bus_id;

        await db.query(`
            INSERT INTO Alerts (bus_id, type, severity, description, status)
            VALUES ($1, 'SOS', 'Critical', $2, 'Active')
        `, [busId, `Emergency SOS from driver at lat:${lat}, lng:${lng}`]);

        res.json({ success: true, message: 'SOS broadcast activated' });
    } catch (err) {
        console.error('SOS error:', err.message);
        res.status(500).json({ error: 'Failed to broadcast SOS' });
    }
});

module.exports = router;
