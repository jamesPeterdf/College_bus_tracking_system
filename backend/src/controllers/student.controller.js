const db = require('../config/db');

exports.getProfile = async (req, res) => {
    try {
        const { data, error } = await db.from('students').select('student_id, roll_number, name, email, phone, department, semester, year, route_id, stop_id').eq('student_id', req.user.id).single();
        if (error || !data) return res.status(404).json({ message: 'Student not found' });
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getBusMetrics = async (req, res) => {
    try {
        const { data: student } = await db.from('students').select('route_id, stop_id').eq('student_id', req.user.id).single();
        if (!student?.route_id) return res.status(404).json({ message: 'No route assigned.' });

        const today = new Date().toISOString().split('T')[0];
        const { count: occupancy } = await db.from('attendance').select('*', { count: 'exact', head: true }).eq('route_id', student.route_id).eq('date', today).eq('status', 'Present');

        const { data: bus } = await db.from('buses').select(`
            current_lat, current_lng, vehicle_number,
            drivers(name, phone)
        `).eq('route_id', student.route_id).eq('is_active', true).single();

        const { data: stop } = await db.from('stops').select('latitude, longitude').eq('stop_id', student.stop_id).single();

        let driverInfo = { name: 'Pending', phone: 'N/A', bus_number: bus?.vehicle_number || 'Unknown' };
        if (bus?.drivers) {
            driverInfo.name = bus.drivers.name;
            driverInfo.phone = bus.drivers.phone || '+91 90000 00000';
        }

        if (!bus?.current_lat || !stop) {
            return res.json({ eta: '-- MIN', distance: '-- KM', occupancy: `${occupancy || 0} / 45`, isLive: false, driver: driverInfo });
        }

        const R = 6371;
        const dLat = (stop.latitude - bus.current_lat) * (Math.PI / 180);
        const dLon = (stop.longitude - bus.current_lng) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(bus.current_lat * Math.PI / 180) * Math.cos(stop.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        const dist = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
        const eta = Math.max(1, Math.round(dist * 2.4));

        res.json({ eta: `${eta} MIN`, distance: `${dist} KM`, occupancy: `${occupancy || 0} / 45`, isLive: true, driver: driverInfo });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getTimeline = async (req, res) => {
    try {
        const { data: student } = await db.from('students').select('route_id').eq('student_id', req.user.id).single();
        if (!student?.route_id) return res.status(404).json({ message: 'No route assigned.' });

        const { data: stops } = await db.from('stops').select('stop_id, stop_name, latitude, longitude, estimated_arrival_time').eq('route_id', student.route_id).order('stop_order');
        const { data: bus } = await db.from('buses').select('current_lat, current_lng').eq('route_id', student.route_id).eq('is_active', true).single();

        const timeline = stops.map((stop, index) => {
            let status = 'upcoming';
            if (bus?.current_lat) {
                const distM = Math.sqrt((stop.latitude - bus.current_lat) ** 2 + (stop.longitude - bus.current_lng) ** 2) * 111000;
                if (index === 0 || distM < 300) status = 'completed';
            } else { status = (index === 0) ? 'completed' : (index === 1 ? 'active' : 'upcoming'); }
            return { stop_id: stop.stop_id, stop: stop.stop_name, latitude: stop.latitude, longitude: stop.longitude, time: stop.estimated_arrival_time, status };
        });
        res.json(timeline);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.submitReport = async (req, res) => {
    try {
        const { type, severity, description } = req.body;
        const { data: student } = await db.from('students').select('route_id').eq('student_id', req.user.id).single();
        const { data: bus } = await db.from('buses').select('bus_id').eq('route_id', student.route_id).eq('is_active', true).single();
        await db.from('alerts').insert([{ bus_id: bus?.bus_id, type: type || 'Student Report', severity: severity || 'Low', description, status: 'Active' }]);
        res.json({ success: true, message: 'Report submitted.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
