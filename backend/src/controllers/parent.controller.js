const db = require('../config/db');

exports.getDashboard = async (req, res) => {
    try {
        const { data: student } = await db.from('students').select('route_id, stop_id').eq('student_id', req.user.id).single();
        if (!student?.route_id) return res.status(404).json({ message: 'No route assigned.' });

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
            return res.json({ eta: '-- MIN', distance: '-- KM', isLive: false, driver: driverInfo, busLocation: null, stopLocation: stop || null });
        }

        const R = 6371;
        const dLat = (stop.latitude - bus.current_lat) * (Math.PI / 180);
        const dLon = (stop.longitude - bus.current_lng) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(bus.current_lat * Math.PI / 180) * Math.cos(stop.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        const dist = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
        const eta = Math.max(1, Math.round(dist * 2.4));

        res.json({ eta: `${eta} MIN`, distance: `${dist} KM`, isLive: true, driver: driverInfo, busLocation: { lat: bus.current_lat, lng: bus.current_lng }, stopLocation: stop });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAttendance = async (req, res) => {
    try {
        const { data, error } = await db.from('attendance').select('date, status, verification_method, created_at').eq('student_id', req.user.id).order('date', { ascending: false }).limit(30);
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getNewsletters = async (req, res) => {
    try {
        const { data, error } = await db.from('notifications').select('id:notification_id, title, message, sent_at').in('recipient_type', ['parent', 'all']).order('sent_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
};
