const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');

// ── STUDENT LOGIN ────────────────────────────────────────────────────────────
// POST /api/auth/student/login
// Body: { roll_number, password }
router.post('/student/login', async (req, res) => {
    const { roll_number, password } = req.body;
    if (!roll_number || !password)
        return res.status(400).json({ message: 'roll_number and password required.' });

    try {
        const result = await db.query(
            'SELECT * FROM Students WHERE roll_number = $1 AND is_active = true',
            [roll_number]
        );
        if (result.rows.length === 0)
            return res.status(401).json({ message: 'Invalid roll number or password.' });

        const student = result.rows[0];
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
                id:          student.student_id,
                name:        student.name,
                roll_number: student.roll_number,
                route_id:    student.route_id,
            }
        });
    } catch (err) {
        console.error('Student login error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── DRIVER LOGIN ─────────────────────────────────────────────────────────────
// POST /api/auth/driver/login
// Body: { driver_code, password }
router.post('/driver/login', async (req, res) => {
    const { driver_code, password } = req.body;
    if (!driver_code || !password)
        return res.status(400).json({ message: 'driver_code and password required.' });

    try {
        const result = await db.query(
            'SELECT * FROM Drivers WHERE driver_code = $1 AND is_active = true',
            [driver_code]
        );
        if (result.rows.length === 0)
            return res.status(401).json({ message: 'Invalid driver code or password.' });

        const driver = result.rows[0];
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
                id:          driver.driver_id,
                name:        driver.name,
                driver_code: driver.driver_code,
            }
        });
    } catch (err) {
        console.error('Driver login error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── ADMIN LOGIN ──────────────────────────────────────────────────────────────
// POST /api/auth/admin/login
// Body: { email, password }
router.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ message: 'email and password required.' });

    try {
        const emailMatch    = email === process.env.ADMIN_EMAIL;
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
        console.error('Admin login error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
