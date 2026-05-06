const redisClient = require('../config/redis');
const db = require('../config/db');

exports.getProfile = async (req, res) => {
    try {
        const { data: driver, error } = await db
            .from('drivers')
            .select(`
                driver_id, name, phone, driver_code,
                buses(bus_id, vehicle_number, route_id, routes(route_code, route_name))
            `)
            .eq('driver_id', req.user.id)
            .single();
        
        if (error || !driver) return res.status(404).json({ message: 'Driver not found' });
        
        const activeBus = driver.buses?.find(b => b.is_active) || driver.buses?.[0];
        res.json({
            driver_id: driver.driver_id, name: driver.name, phone: driver.phone, driver_code: driver.driver_code,
            route_id: activeBus?.route_id, bus_id: activeBus?.bus_id, bus_number: activeBus?.vehicle_number,
            route_code: activeBus?.routes?.route_code, route_name: activeBus?.routes?.route_name
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateLocation = async (req, res) => {
    const { lat, lng, speed, heading } = req.body;
    try {
        const { data: bus } = await db.from('buses').select('bus_id, route_id').eq('driver_id', req.user.id).eq('is_active', true).single();
        if (!bus) return res.status(404).json({ error: 'No active bus' });
        await db.from('buses').update({ current_lat: lat, current_lng: lng, last_updated: new Date().toISOString() }).eq('bus_id', bus.bus_id);
        await redisClient.set(`bus_location:${bus.route_id}`, JSON.stringify({ lat, lng, speed, heading }), { EX: 300 });
        const io = req.app.get('socketio');
        io.to(`route_${bus.route_id}`).emit('location_update', { route_id: bus.route_id, bus_id: bus.bus_id, lat, lng, heading });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed to update location' }); }
};

exports.getRouteStudents = async (req, res) => {
    try {
        const { data: bus } = await db.from('buses').select('route_id').eq('driver_id', req.user.id).eq('is_active', true).single();
        if (!bus?.route_id) return res.status(404).json({ error: 'No route' });
        const { data: students } = await db.from('students').select('id:student_id, roll:roll_number, name, stop_id').eq('route_id', bus.route_id).eq('is_active', true).order('stop_id');
        const today = new Date().toISOString().split('T')[0];
        const { data: attendance } = await db.from('attendance').select('student_id, status').eq('route_id', bus.route_id).eq('date', today);
        const attMap = {};
        attendance?.forEach(r => { attMap[r.student_id] = r.status; });
        res.json(students.map(s => ({ ...s, status: attMap[s.id] || 'Pending' })));
    } catch (err) { res.status(500).json({ error: 'Failed to fetch students' }); }
};

const { sendAttendanceEmail } = require('../services/mailService');

exports.markAttendance = async (req, res) => {
    const { student_id, status } = req.body;
    try {
        const { data: bus } = await db.from('buses').select('route_id').eq('driver_id', req.user.id).eq('is_active', true).single();
        if (!bus?.route_id) return res.status(400).json({ error: 'No active route' });
        const today = new Date().toISOString().split('T')[0];
        
        const { data: student } = await db.from('students').select('name, email').eq('student_id', student_id).single();
        
        const { data: existing } = await db.from('attendance').select('attendance_id').eq('student_id', student_id).eq('date', today).single();
        if (existing) {
            await db.from('attendance').update({ status: status || 'Present', verification_method: 'Driver Override' }).eq('attendance_id', existing.attendance_id);
        } else {
            await db.from('attendance').insert([{ student_id, driver_id: req.user.id, route_id: bus.route_id, date: today, status: status || 'Present', verification_method: 'Driver Manual' }]);
        }

        // Send Email Notification in background
        if (student?.email) {
            sendAttendanceEmail(student.email, student.name, status || 'Present', today).catch(e => console.error("Email fail:", e));
        }

        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed to mark attendance' }); }
};

exports.sosAlert = async (req, res) => {
    const { lat, lng } = req.body;
    try {
        const { data: bus } = await db.from('buses').select('bus_id').eq('driver_id', req.user.id).eq('is_active', true).single();
        if (!bus) return res.status(404).json({ error: 'No active bus' });
        await db.from('alerts').insert([{ bus_id: bus.bus_id, type: 'SOS', severity: 'Critical', description: `Emergency SOS at lat:${lat}, lng:${lng}`, status: 'Active' }]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed SOS' }); }
};
