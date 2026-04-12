const bcrypt = require('bcrypt');
const db = require('../config/db');
const blockchainService = require('../services/blockchain.service');

exports.getStats = async (req, res) => {
    try {
        const results = await Promise.all([
            db.from('buses').select('*', { count: 'exact', head: true }).eq('is_active', true),
            db.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true),
            db.from('attendance').select('*', { count: 'exact', head: true }).eq('date', new Date().toISOString().split('T')[0]).eq('status', 'Present'),
            db.from('alerts').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
            db.from('drivers').select('*', { count: 'exact', head: true }).eq('is_active', true)
        ]);

        res.json({
            active_buses: results[0].count || 0,
            total_students: results[1].count || 0,
            attendance_today: results[2].count || 0,
            alerts_open: results[3].count || 0,
            total_drivers: results[4].count || 0
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAllStudents = async (req, res) => {
    try {
        const { data, error } = await db
            .from('students')
            .select(`
                id:student_id, roll:roll_number, name, email, phone, department, is_active,
                routes(route_code, route_id),
                stops(stop_name, stop_id)
            `)
            .order('name');
        
        if (error) throw error;

        const formatted = data.map(s => ({
            id: s.id, roll: s.roll, name: s.name, email: s.email, phone: s.phone, department: s.department,
            route: s.routes?.route_code, route_id: s.routes?.route_id,
            stop: s.stops?.stop_name, stop_id: s.stops?.stop_id,
            status: s.is_active ? 'Active' : 'Inactive'
        }));

        res.json(formatted);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createStudent = async (req, res) => {
    try {
        const { roll_number, name, email, phone, route_id, stop_id, department } = req.body;
        const hashedPassword = await bcrypt.hash('student123', 10);
        const { data, error } = await db
            .from('students')
            .insert([{
                roll_number, password_hash: hashedPassword, name, 
                email: email || `${roll_number}@jaya.edu`, 
                phone: phone || '0000000000', 
                department: department || 'Engineering', 
                route_id, stop_id
            }])
            .select('student_id, roll_number, name')
            .single();
        
        if (error) throw error;
        res.status(201).json({ message: 'Student created', student: data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateStudent = async (req, res) => {
    try {
        const { name, email, phone, route_id, stop_id, department } = req.body;
        const { error } = await db
            .from('students')
            .update({ name, email, phone, route_id, stop_id, department })
            .eq('student_id', req.params.id);
        
        if (error) throw error;
        res.json({ message: 'Student updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.toggleStudentStatus = async (req, res) => {
    try {
        const { data: current } = await db.from('students').select('is_active').eq('student_id', req.params.id).single();
        const { data, error } = await db
            .from('students')
            .update({ is_active: !current.is_active })
            .eq('student_id', req.params.id)
            .select('is_active')
            .single();
        
        if (error) throw error;
        res.json({ is_active: data.is_active });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.resetStudentPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword) return res.status(400).json({ error: 'New password is required' });
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const { error } = await db.from('students').update({ password_hash: hashedPassword }).eq('student_id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Password updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteStudent = async (req, res) => {
    try {
        await db.from('attendance').delete().eq('student_id', req.params.id);
        const { error } = await db.from('students').delete().eq('student_id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Student deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAllDrivers = async (req, res) => {
    try {
        const { data, error } = await db
            .from('drivers')
            .select(`
                id:driver_id, driver_code, name, phone, license_number, is_active,
                buses(vehicle_number, bus_id, routes(route_code, route_name, route_id))
            `)
            .order('name');
        
        if (error) throw error;

        const formatted = data.map(d => {
            const activeBus = d.buses?.find(b => b.is_active) || d.buses?.[0];
            return {
                id: d.id, driver_code: d.driver_code, name: d.name, phone: d.phone, 
                license_number: d.license_number, is_active: d.is_active,
                bus_number: activeBus?.vehicle_number, bus_id: activeBus?.bus_id,
                route_code: activeBus?.routes?.route_code, route_name: activeBus?.routes?.route_name, route_id: activeBus?.routes?.route_id
            };
        });

        res.json(formatted);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getDriverById = async (req, res) => {
    try {
        const { data, error } = await db
            .from('drivers')
            .select(`
                id:driver_id, driver_code, name, phone, license_number, is_active,
                buses(vehicle_number, bus_id, routes(route_code, route_name, route_id))
            `)
            .eq('driver_id', req.params.id)
            .single();
        
        if (error) throw error;
        const activeBus = data.buses?.find(b => b.is_active) || data.buses?.[0];
        res.json({
            id: data.id, driver_code: data.driver_code, name: data.name, phone: data.phone, 
            license_number: data.license_number, is_active: data.is_active,
            bus_number: activeBus?.vehicle_number, bus_id: activeBus?.bus_id,
            route_code: activeBus?.routes?.route_code, route_name: activeBus?.routes?.route_name, route_id: activeBus?.routes?.route_id
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createDriver = async (req, res) => {
    try {
        const { driver_code, name, phone, license_number } = req.body;
        const hashedPassword = await bcrypt.hash('driver123', 10);
        const { data, error } = await db
            .from('drivers')
            .insert([{ driver_code, name, phone: phone || '', license_number: license_number || '', password_hash: hashedPassword }])
            .select('driver_id, driver_code')
            .single();
        if (error) throw error;
        res.status(201).json({ message: 'Driver created', driver: data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateDriver = async (req, res) => {
    try {
        const { name, phone, license_number, driver_code } = req.body;
        const { error } = await db
            .from('drivers')
            .update({ name, phone, license_number, driver_code })
            .eq('driver_id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Driver updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.toggleDriverStatus = async (req, res) => {
    try {
        const { data: current } = await db.from('drivers').select('is_active').eq('driver_id', req.params.id).single();
        const { data, error } = await db.from('drivers').update({ is_active: !current.is_active }).eq('driver_id', req.params.id).select('is_active').single();
        if (error) throw error;
        res.json({ is_active: data.is_active });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.resetDriverPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword) return res.status(400).json({ error: 'New password is required' });
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const { error } = await db.from('drivers').update({ password_hash: hashedPassword }).eq('driver_id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Password updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteDriver = async (req, res) => {
    try {
        await db.from('buses').update({ driver_id: null }).eq('driver_id', req.params.id);
        const { error } = await db.from('drivers').delete().eq('driver_id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Driver deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getDriverHistory = async (req, res) => {
    try {
        // Try fetching with tx_hash
        let { data, error } = await db.from('driverhistory').select('id:history_id, remark, tx_hash, created_at').eq('driver_id', req.params.id).order('created_at', { ascending: false });
        
        // Fallback if column missing (User hasn't run the SQL yet)
        if (error && error.message.includes('column "tx_hash" does not exist')) {
            console.warn('⚠️ tx_hash column missing in DB. Fallback to basic history.');
            const fallback = await db.from('driverhistory').select('id:history_id, remark, created_at').eq('driver_id', req.params.id).order('created_at', { ascending: false });
            data = fallback.data;
            error = fallback.error;
        }

        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createDriverHistory = async (req, res) => {
    try {
        const { remark } = req.body;
        if (!remark) return res.status(400).json({ error: 'Remark is required' });
        
        // 1. Save to Database (Local Audit)
        const { error } = await db.from('driverhistory').insert([{ driver_id: req.params.id, remark }]);
        if (error) throw error;

        // 2. Log to Blockchain (Immutable Audit)
        const txHash = await blockchainService.logRemarkOnChain(req.params.id, remark);

        // 3. Update DB with TX Hash (for history display)
        if (txHash) {
            await db.from('driverhistory').update({ tx_hash: txHash }).eq('remark', remark).eq('driver_id', req.params.id);
        }

        res.status(201).json({ 
            message: 'Remark added', 
            blockchain_tx: txHash || 'Skipped (Config Missing)' 
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAllBuses = async (req, res) => {
    try {
        const { data, error } = await db
            .from('buses')
            .select(`
                id:bus_id, vehicle_number, capacity, is_active,
                current_lat, current_lng, last_updated,
                drivers(name, driver_id, driver_code),
                routes(route_code, route_name, route_id)
            `)
            .order('vehicle_number');
        
        if (error) throw error;

        const formatted = data.map(b => ({
            id: b.id, vehicle_number: b.vehicle_number, capacity: b.capacity, is_active: b.is_active,
            current_lat: b.current_lat, current_lng: b.current_lng, last_updated: b.last_updated,
            driver_name: b.drivers?.name, driver_id: b.drivers?.driver_id, driver_code: b.drivers?.driver_code,
            route_code: b.routes?.route_code, route_name: b.routes?.route_name, route_id: b.routes?.route_id
        }));

        res.json(formatted);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createBus = async (req, res) => {
    try {
        const { vehicle_number, capacity, route_id, driver_id } = req.body;
        const { data, error } = await db
            .from('buses')
            .insert([{ vehicle_number, capacity: capacity || 45, route_id, driver_id }])
            .select('bus_id, vehicle_number')
            .single();
        if (error) throw error;
        res.status(201).json({ message: 'Bus created', bus: data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateBus = async (req, res) => {
    try {
        const { vehicle_number, capacity, route_id, driver_id } = req.body;
        const { error } = await db
            .from('buses')
            .update({ vehicle_number, capacity, route_id, driver_id })
            .eq('bus_id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Bus updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.toggleBusStatus = async (req, res) => {
    try {
        const { data: current } = await db.from('buses').select('is_active').eq('bus_id', req.params.id).single();
        const { data, error } = await db.from('buses').update({ is_active: !current.is_active }).eq('bus_id', req.params.id).select('is_active').single();
        if (error) throw error;
        res.json({ is_active: data.is_active });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteBus = async (req, res) => {
    try {
        await db.from('alerts').delete().eq('bus_id', req.params.id);
        const { error } = await db.from('buses').delete().eq('bus_id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Bus deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAllRoutes = async (req, res) => {
    try {
        const { data, error } = await db
            .from('routes')
            .select(`
                id:route_id, code:route_code, name:route_name, distance:total_distance_km,
                stops(count), buses(count), students(count)
            `)
            .order('route_code');
        
        if (error) throw error;

        // In Supabase SDK, counts for related tables might need separate logic or refined select
        // For simplicity, we'll fetch basic data. If real counts are needed, we'd use .select('*, stops:stops(count)') etc.
        const formatted = data.map(r => ({
            id: r.id, code: r.code, name: r.name, 
            distance: `${r.distance} KM`,
            stops: r.stops?.length || 0,
            buses: r.buses?.length || 0,
            students: r.students?.length || 0
        }));

        res.json(formatted);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createRoute = async (req, res) => {
    try {
        const { route_code, route_name, total_distance_km } = req.body;
        const { data, error } = await db.from('routes').insert([{ route_code, route_name, total_distance_km: total_distance_km || 0 }]).select('route_id, route_code').single();
        if (error) throw error;
        res.status(201).json({ message: 'Route created', route: data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteRoute = async (req, res) => {
    try {
        const { error } = await db.from('routes').delete().eq('route_id', req.params.id);
        if (error) {
            if (error.code === '23503') return res.status(400).json({ error: 'Assigned dependencies exist' });
            throw error;
        }
        res.json({ message: 'Route deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAllStops = async (req, res) => {
    try {
        const routeId = req.query.route_id;
        let query = db.from('stops').select('id:stop_id, name:stop_name, latitude, longitude, stop_order, estimated_arrival_time, route_id');
        if (routeId) query = query.eq('route_id', routeId);
        const { data, error } = await query.order('route_id').order('stop_order');
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createStop = async (req, res) => {
    try {
        const { route_id, stop_name, latitude, longitude, stop_order, estimated_arrival_time } = req.body;
        const { data, error } = await db.from('stops').insert([{ route_id, stop_name, latitude, longitude, stop_order: stop_order || 1, estimated_arrival_time: estimated_arrival_time || '07:30 AM' }]).select('stop_id').single();
        if (error) throw error;
        res.status(201).json({ message: 'Stop created', stop: data });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteStop = async (req, res) => {
    try {
        await db.from('students').update({ stop_id: null }).eq('stop_id', req.params.id);
        const { error } = await db.from('stops').delete().eq('stop_id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Stop deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAttendance = async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const { data, error } = await db
            .from('attendance')
            .select(`
                id:attendance_id, date, status,
                students(name, roll_number),
                routes(route_code)
            `)
            .eq('date', date);
        
        if (error) throw error;

        const formatted = data.map(a => ({
            id: a.id, name: a.students?.name, roll_number: a.students?.roll_number,
            route_code: a.routes?.route_code, date: a.date, status: a.status
        }));

        res.json(formatted);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getCommunications = async (req, res) => {
    try {
        const { data, error } = await db.from('notifications').select('id:notification_id, title, message, sent_at').in('recipient_type', ['parent', 'all']).order('sent_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createCommunication = async (req, res) => {
    try {
        const { title, message } = req.body;
        const { error } = await db.from('notifications').insert([{ recipient_type: 'all', recipient_id: req.user.id || '00000000-0000-0000-0000-000000000000', type: 'Newsletter', title, message, channel: 'app' }]);
        if (error) throw error;
        res.status(201).json({ message: 'Newsletter sent' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.getAlerts = async (req, res) => {
    try {
        const { data, error } = await db
            .from('alerts')
            .select(`
                id:alert_id, type, severity, description, status, created_at,
                buses(vehicle_number)
            `)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;

        const formatted = data.map(al => ({
            id: al.id, type: al.type, severity: al.severity, description: al.description,
            status: al.status, created_at: al.created_at, vehicle_number: al.buses?.vehicle_number
        }));

        res.json(formatted);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.resolveAlert = async (req, res) => {
    try {
        const { error } = await db.from('alerts').update({ status: 'Resolved' }).eq('alert_id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Alert resolved' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteAlert = async (req, res) => {
    try {
        const { error } = await db.from('alerts').delete().eq('alert_id', req.params.id);
        if (error) throw error;
        res.json({ message: 'Alert deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.emergencyLockdown = async (req, res) => {
    try {
        const io = req.app.get('socketio');
        io.emit('global_lockdown', { message: 'EMERGENCY LOCKDOWN ACTIVATED', timestamp: new Date().toISOString() });
        res.json({ message: 'Lockdown broadcasted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.flushCache = async (req, res) => {
    try {
        const { error } = await db.from('buses').update({ current_lat: null, current_lng: null });
        if (error) throw error;
        res.json({ message: 'Cache cleared' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
