const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function checkData() {
    try {
        const stu = await pool.query("SELECT * FROM students LIMIT 1");
        console.log("Student Data:", stu.rows[0]);

        const drv = await pool.query("SELECT * FROM drivers LIMIT 1");
        console.log("Driver Data:", drv.rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
checkData();
