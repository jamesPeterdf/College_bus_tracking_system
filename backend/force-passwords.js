const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function resetPasswords() {
    try {
        const passwordHash = await bcrypt.hash('password123', 10);
        
        // Update all students to use 'password123'
        await pool.query('UPDATE Students SET password_hash = $1', [passwordHash]);
        console.log('All student passwords reset to "password123"');
        
        // Update all drivers to use 'password123'
        await pool.query('UPDATE Drivers SET password_hash = $1', [passwordHash]);
        console.log('All driver passwords reset to "password123"');

        // Print a test user
        const stu = await pool.query('SELECT roll_number, name FROM Students LIMIT 1');
        if (stu.rows.length > 0) console.log('Test Student Login -> Roll:', stu.rows[0].roll_number, '| Password: password123');

        const drv = await pool.query('SELECT driver_code, name FROM Drivers LIMIT 1');
        if (drv.rows.length > 0) console.log('Test Driver Login -> Code:', drv.rows[0].driver_code, '| Password: password123');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

resetPasswords();
