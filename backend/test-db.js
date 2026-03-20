const { Client } = require('pg');
require('dotenv').config();

console.log('Testing DB connection with:');
console.log('User:', process.env.DB_USER);
console.log('Host:', process.env.DB_HOST);
console.log('Port:', process.env.DB_PORT);
console.log('DB Name:', process.env.DB_NAME);

async function testConnection() {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
        database: 'postgres', // Connect to default DB first
    });

    try {
        console.log('Attempting to connect...');
        await client.connect();
        console.log('Connection successful!');
        const res = await client.query('SELECT NOW()');
        console.log('Query result:', res.rows[0]);
    } catch (err) {
        console.error('Connection failed.');
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Stack trace:', err.stack);
    } finally {
        await client.end();
    }
}

testConnection();
