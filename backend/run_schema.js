const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function runSchema() {
    try {
        console.log('Reading schema.sql...');
        const schema = fs.readFileSync('./schema.sql', 'utf8');
        console.log('Applying schema to database...');
        await pool.query(schema);
        console.log('Schema applied successfully.');
    } catch (err) {
        console.error('Error applying schema:');
        console.error(err.message);
        console.error(err.detail);
    } finally {
        await pool.end();
    }
}

runSchema();
