const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.studentLogin = async (req, res) => {
    const { roll_number, password } = req.body;
    if (!roll_number || !password)
        return res.status(400).json({ message: 'roll_number and password required.' });

    try {
        const { data: student, error } = await db
            .from('students')
            .select('*')
            .eq('roll_number', roll_number)
            .eq('is_active', true)
            .single();

        if (error || !student)
            return res.status(401).json({ message: 'Invalid roll number or password.' });

        const isMatch = await bcrypt.compare(password, student.password_hash);
        if (!isMatch)
            return res.status(401).json({ message: 'Invalid roll number or password.' });

        const token = jwt.sign(
            { id: student.student_id, role: 'student' },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );
        res.json({
            token,
            role: 'student',
            user: {
                id: student.student_id,
                name: student.name,
                roll_number: student.roll_number,
                route_id: student.route_id,
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.parentLogin = async (req, res) => {
    const { roll_number, password } = req.body;
    if (!roll_number || !password)
        return res.status(400).json({ message: 'roll_number and password required.' });

    try {
        const { data: student, error } = await db
            .from('students')
            .select('*')
            .eq('roll_number', roll_number)
            .eq('is_active', true)
            .single();

        if (error || !student)
            return res.status(401).json({ message: 'Invalid roll number or password.' });

        const isMatch = await bcrypt.compare(password, student.password_hash);
        if (!isMatch)
            return res.status(401).json({ message: 'Invalid roll number or password.' });

        const token = jwt.sign(
            { id: student.student_id, role: 'parent' },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );
        res.json({
            token,
            role: 'parent',
            user: {
                id: student.student_id,
                name: student.name,
                roll_number: student.roll_number,
                route_id: student.route_id,
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.driverLogin = async (req, res) => {
    const { driver_code, password } = req.body;
    if (!driver_code || !password)
        return res.status(400).json({ message: 'driver_code and password required.' });

    try {
        const { data: driver, error } = await db
            .from('drivers')
            .select('*')
            .eq('driver_code', driver_code)
            .eq('is_active', true)
            .single();

        if (error || !driver)
            return res.status(401).json({ message: 'Invalid driver code or password.' });

        const isMatch = await bcrypt.compare(password, driver.password_hash);
        if (!isMatch)
            return res.status(401).json({ message: 'Invalid driver code or password.' });

        const token = jwt.sign(
            { id: driver.driver_id, role: 'driver' },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );
        res.json({
            token,
            role: 'driver',
            user: {
                id: driver.driver_id,
                name: driver.name,
                driver_code: driver.driver_code,
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.adminLogin = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ message: 'email and password required.' });

    try {
        const emailMatch = email === process.env.ADMIN_EMAIL;
        const passwordMatch = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);

        if (!emailMatch || !passwordMatch)
            return res.status(401).json({ message: 'Invalid email or password.' });

        const token = jwt.sign(
            { id: 'admin', role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );
        res.json({
            token,
            role: 'admin',
            user: { email, role: 'admin' }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
