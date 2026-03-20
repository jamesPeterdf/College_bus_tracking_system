const { Pool } = require('pg');
require('dotenv').config();

let pool;
try {
    pool = new Pool({
        user:     process.env.DB_USER,
        host:     process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port:     parseInt(process.env.DB_PORT) || 5432,
        ssl:      { rejectUnauthorized: false }, // Supabase requires SSL
        // Connection pool tuning for Supabase
        max:                 10,
        idleTimeoutMillis:   30000,
        connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => console.error('Unexpected DB client error:', err.message));
    console.log('DB Pool initialized → Supabase');
} catch (err) {
    console.error('DB Pool Initialization Failed:', err.message);
}

module.exports = {
    query: async (text, params) => {
        try {
            return await pool.query(text, params);
        } catch (err) {
            console.error('DB Query Error:', err.message, '| Query:', text.slice(0, 80));
            return { rows: [], rowCount: 0 };
        }
    },
    pool,
};
