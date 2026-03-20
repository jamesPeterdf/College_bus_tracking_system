const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
    const rootClient = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
        database: 'postgres',
    });

    try {
        await rootClient.connect();
        console.log('Connected to root database.');

        const res = await rootClient.query(`SELECT 1 FROM pg_database WHERE datname = '${process.env.DB_NAME}'`);
        if (res.rowCount === 0) {
            console.log(`Creating database ${process.env.DB_NAME}...`);
            await rootClient.query(`CREATE DATABASE ${process.env.DB_NAME}`);
            console.log('Database created successfully.');
        } else {
            console.log(`Database ${process.env.DB_NAME} already exists.`);
        }
    } catch (err) {
        console.error('Error creating database:', err.message);
    } finally {
        await rootClient.end();
    }

    const dbClient = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
    });

    try {
        await dbClient.connect();
        console.log(`Connected to database ${process.env.DB_NAME}.`);

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Applying schema...');
        await dbClient.query(schemaSql);
        console.log('Schema applied successfully.');

    } catch (err) {
        console.error('Error applying schema:', err.message);
    } finally {
        await dbClient.end();
    }
}

setupDatabase();
