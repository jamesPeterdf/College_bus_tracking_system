const express  = require('express');
const router   = express.Router();
const auth     = require('../middleware/auth');
const db       = require('../config/db');
const bcrypt   = require('bcrypt');

// ════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════
router.get('/dashboard/stats', auth(['admin']), async (req, res) => {
    try {
        const [activeBuses, totalStudents, dailyAttendance, openAlerts, totalDrivers] = await Promise.all([
            db.query('SELECT count(*) FROM Buses WHERE is_active = true'),
            db.query('SELECT count(*) FROM Students WHERE is_active = true'),
            db.query("SELECT count(*) FROM Attendance WHERE date = CURRENT_DATE AND status = 'Present'"),
            db.query("SELECT count(*) FROM Alerts WHERE status = 'Active'"),
            db.query('SELECT count(*) FROM Drivers WHERE is_active = true'),
        ]);
        res.json({
            active_buses:     parseInt(activeBuses.rows[0].count)    || 0,
            total_students:   parseInt(totalStudents.rows[0].count)   || 0,
            attendance_today: parseInt(dailyAttendance.rows[0].count) || 0,
            alerts_open:      parseInt(openAlerts.rows[0].count)      || 0,
            total_drivers:    parseInt(totalDrivers.rows[0].count)    || 0,
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
// STUDENTS
// ════════════════════════════════════════════════════════════
router.get('/students', auth(['admin']), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.student_id as id, s.roll_number as roll, s.name, s.email, s.phone, s.department,
                   r.route_code as route, r.route_id,
                   st.stop_name as stop, st.stop_id,
                   CASE WHEN s.is_active THEN 'Active' ELSE 'Inactive' END as status
            FROM Students s
            LEFT JOIN Routes r  ON s.route_id = r.route_id
            LEFT JOIN Stops  st ON s.stop_id  = st.stop_id
            ORDER BY s.name
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/students', auth(['admin']), async (req, res) => {
    try {
        const { roll_number, name, email, phone, route_id, stop_id, department } = req.body;
        const hashedPassword = await bcrypt.hash('student123', 10);
        const result = await db.query(`
            INSERT INTO Students (roll_number, password_hash, name, email, phone, department, route_id, stop_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING student_id, roll_number, name
        `, [roll_number, hashedPassword, name, email||`${roll_number}@jaya.edu`, phone||'0000000000', department||'Engineering', route_id||null, stop_id||null]);
        res.status(201).json({ message: 'Student created', student: result.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/students/:id', auth(['admin']), async (req, res) => {
    try {
        const { name, email, phone, route_id, stop_id, department } = req.body;
        await db.query(`
            UPDATE Students SET name=$1, email=$2, phone=$3, route_id=$4, stop_id=$5, department=$6
            WHERE student_id=$7
        `, [name, email, phone, route_id||null, stop_id||null, department||'Engineering', req.params.id]);
        res.json({ message: 'Student updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/students/:id/status', auth(['admin']), async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE Students SET is_active=NOT is_active WHERE student_id=$1 RETURNING is_active',
            [req.params.id]
        );
        res.json({ is_active: result.rows[0]?.is_active });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/students/:id', auth(['admin']), async (req, res) => {
    try {
        await db.query('DELETE FROM Attendance WHERE student_id=$1', [req.params.id]);
        await db.query('DELETE FROM Students WHERE student_id=$1', [req.params.id]);
        res.json({ message: 'Student deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
// DRIVERS
// ════════════════════════════════════════════════════════════
router.get('/drivers', auth(['admin']), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT d.driver_id as id, d.driver_code, d.name, d.phone, d.license_number, d.is_active,
                   b.vehicle_number as bus_number, b.bus_id,
                   r.route_code, r.route_name, r.route_id
            FROM Drivers d
            LEFT JOIN Buses b  ON b.driver_id = d.driver_id AND b.is_active = true
            LEFT JOIN Routes r ON b.route_id   = r.route_id
            ORDER BY d.name
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/drivers', auth(['admin']), async (req, res) => {
    try {
        const { driver_code, name, phone, license_number } = req.body;
        const hashedPassword = await bcrypt.hash('driver123', 10);
        const result = await db.query(`
            INSERT INTO Drivers (driver_code, name, phone, license_number, password_hash)
            VALUES ($1,$2,$3,$4,$5)
            RETURNING driver_id, driver_code, name
        `, [driver_code, name, phone||'', license_number||'', hashedPassword]);
        res.status(201).json({ message: 'Driver created', driver: result.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/drivers/:id', auth(['admin']), async (req, res) => {
    try {
        const { name, phone, license_number } = req.body;
        await db.query(
            'UPDATE Drivers SET name=$1, phone=$2, license_number=$3 WHERE driver_id=$4',
            [name, phone, license_number, req.params.id]
        );
        res.json({ message: 'Driver updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/drivers/:id/status', auth(['admin']), async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE Drivers SET is_active=NOT is_active WHERE driver_id=$1 RETURNING is_active',
            [req.params.id]
        );
        res.json({ is_active: result.rows[0]?.is_active });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/drivers/:id', auth(['admin']), async (req, res) => {
    try {
        // Unassign driver from bus first
        await db.query('UPDATE Buses SET driver_id=NULL WHERE driver_id=$1', [req.params.id]);
        await db.query('DELETE FROM Drivers WHERE driver_id=$1', [req.params.id]);
        res.json({ message: 'Driver deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
// BUSES
// ════════════════════════════════════════════════════════════
router.get('/buses', auth(['admin']), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT b.bus_id as id, b.vehicle_number, b.capacity, b.is_active,
                   b.current_lat, b.current_lng, b.last_updated,
                   d.name as driver_name, d.driver_id, d.driver_code,
                   r.route_code, r.route_name, r.route_id
            FROM Buses b
            LEFT JOIN Drivers d ON b.driver_id = d.driver_id
            LEFT JOIN Routes  r ON b.route_id  = r.route_id
            ORDER BY b.vehicle_number
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/buses', auth(['admin']), async (req, res) => {
    try {
        const { vehicle_number, capacity, route_id, driver_id } = req.body;
        const result = await db.query(`
            INSERT INTO Buses (vehicle_number, capacity, route_id, driver_id)
            VALUES ($1,$2,$3,$4)
            RETURNING bus_id, vehicle_number
        `, [vehicle_number, capacity||45, route_id||null, driver_id||null]);
        res.status(201).json({ message: 'Bus created', bus: result.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/buses/:id', auth(['admin']), async (req, res) => {
    try {
        const { vehicle_number, capacity, route_id, driver_id } = req.body;
        await db.query(`
            UPDATE Buses SET vehicle_number=$1, capacity=$2, route_id=$3, driver_id=$4
            WHERE bus_id=$5
        `, [vehicle_number, capacity, route_id||null, driver_id||null, req.params.id]);
        res.json({ message: 'Bus updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/buses/:id/status', auth(['admin']), async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE Buses SET is_active=NOT is_active WHERE bus_id=$1 RETURNING is_active',
            [req.params.id]
        );
        res.json({ is_active: result.rows[0]?.is_active });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/buses/:id', auth(['admin']), async (req, res) => {
    try {
        await db.query('DELETE FROM Alerts WHERE bus_id=$1', [req.params.id]);
        await db.query('DELETE FROM Buses WHERE bus_id=$1', [req.params.id]);
        res.json({ message: 'Bus deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════
router.get('/routes', auth(['admin']), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT r.route_id as id, r.route_code as code, r.route_name as name,
                   r.total_distance_km || ' KM' as distance,
                   (SELECT count(*) FROM Stops  s WHERE s.route_id = r.route_id) as stops,
                   (SELECT count(*) FROM Buses  b WHERE b.route_id = r.route_id) as buses,
                   (SELECT count(*) FROM Students st WHERE st.route_id = r.route_id AND st.is_active = true) as students
            FROM Routes r ORDER BY r.route_code
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/routes', auth(['admin']), async (req, res) => {
    try {
        const { route_code, route_name, total_distance_km } = req.body;
        const result = await db.query(`
            INSERT INTO Routes (route_code, route_name, total_distance_km)
            VALUES ($1,$2,$3) RETURNING route_id, route_code, route_name
        `, [route_code, route_name, total_distance_km||0]);
        res.status(201).json({ message: 'Route created', route: result.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/routes/:id', auth(['admin']), async (req, res) => {
    try {
        await db.query('DELETE FROM Routes WHERE route_id=$1', [req.params.id]);
        res.json({ message: 'Route deleted' });
    } catch (err) {
        if (err.code === '23503') return res.status(400).json({ error: 'Students or Buses still assigned to this route.' });
        res.status(500).json({ error: err.message });
    }
});

// ════════════════════════════════════════════════════════════
// STOPS
// ════════════════════════════════════════════════════════════
router.get('/stops', auth(['admin']), async (req, res) => {
    try {
        const routeId = req.query.route_id;
        const query = routeId
            ? 'SELECT stop_id as id, stop_name as name, latitude, longitude, stop_order, estimated_arrival_time, route_id FROM Stops WHERE route_id=$1 ORDER BY stop_order'
            : 'SELECT stop_id as id, stop_name as name, latitude, longitude, stop_order, estimated_arrival_time, route_id FROM Stops ORDER BY route_id, stop_order';
        const result = await db.query(query, routeId ? [routeId] : []);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/stops', auth(['admin']), async (req, res) => {
    try {
        const { route_id, stop_name, latitude, longitude, stop_order, estimated_arrival_time } = req.body;
        const result = await db.query(`
            INSERT INTO Stops (route_id, stop_name, latitude, longitude, stop_order, estimated_arrival_time)
            VALUES ($1,$2,$3,$4,$5,$6) RETURNING stop_id, stop_name
        `, [route_id, stop_name, latitude, longitude, stop_order||1, estimated_arrival_time||'07:30 AM']);
        res.status(201).json({ message: 'Stop created', stop: result.rows[0] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/stops/:id', auth(['admin']), async (req, res) => {
    try {
        await db.query('UPDATE Students SET stop_id=NULL WHERE stop_id=$1', [req.params.id]);
        await db.query('DELETE FROM Stops WHERE stop_id=$1', [req.params.id]);
        res.json({ message: 'Stop deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
// ATTENDANCE
// ════════════════════════════════════════════════════════════
router.get('/attendance', auth(['admin']), async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const result = await db.query(`
            SELECT a.attendance_id as id, s.name, s.roll_number,
                   r.route_code, a.date, a.status, a.verification_method
            FROM Attendance a
            JOIN Students s ON a.student_id = s.student_id
            LEFT JOIN Routes r ON a.route_id = r.route_id
            WHERE a.date = $1
            ORDER BY r.route_code, s.name
        `, [date]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
// ALERTS
// ════════════════════════════════════════════════════════════
router.get('/alerts', auth(['admin']), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT al.alert_id as id, al.type, al.severity, al.description,
                   al.status, al.created_at,
                   b.vehicle_number
            FROM Alerts al
            LEFT JOIN Buses b ON al.bus_id = b.bus_id
            ORDER BY al.created_at DESC
            LIMIT 50
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/alerts/:id/resolve', auth(['admin']), async (req, res) => {
    try {
        await db.query("UPDATE Alerts SET status='Resolved' WHERE alert_id=$1", [req.params.id]);
        res.json({ message: 'Alert resolved' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/alerts/:id', auth(['admin']), async (req, res) => {
    try {
        await db.query('DELETE FROM Alerts WHERE alert_id=$1', [req.params.id]);
        res.json({ message: 'Alert dismissed' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════
// EMERGENCY (Command Center)
// ════════════════════════════════════════════════════════════
router.post('/emergency/lockdown', auth(['admin']), async (req, res) => {
    try {
        const io = req.app.get('socketio');
        io.emit('global_lockdown', { message: 'EMERGENCY LOCKDOWN ACTIVATED BY ADMIN', timestamp: new Date().toISOString() });
        res.json({ message: 'Global lockdown broadcast sent.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/cache/flush', auth(['admin']), async (req, res) => {
    try {
        // Reset all bus locations to null
        await db.query('UPDATE Buses SET current_lat=NULL, current_lng=NULL');
        res.json({ message: 'Bus location cache cleared from DB.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
