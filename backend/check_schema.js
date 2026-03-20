const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function check() {
    try {
        const drv = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'drivers'");
        const stu = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'students'");

        const fs = require('fs');
        fs.writeFileSync('schema.json', JSON.stringify({
            drivers: drv.rows.map(r => r.column_name),
            students: stu.rows.map(r => r.column_name)
        }, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
