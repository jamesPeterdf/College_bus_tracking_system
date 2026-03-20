const fs = require('fs');
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

async function resetAndSeed() {
    try {
        console.log('Dropping existing tables if any...');
        // Drop existing to avoid conflicts since schema is wrong
        await pool.query(`
            DROP TABLE IF EXISTS AuditLogs CASCADE;
            DROP TABLE IF EXISTS Notifications CASCADE;
            DROP TABLE IF EXISTS Attendance CASCADE;
            DROP TABLE IF EXISTS Stops CASCADE;
            DROP TABLE IF EXISTS Buses CASCADE;
            DROP TABLE IF EXISTS Routes CASCADE;
            DROP TABLE IF EXISTS Drivers CASCADE;
            DROP TABLE IF EXISTS Students CASCADE;
        `);

        console.log('Applying fresh schema.sql...');
        const schema = fs.readFileSync('./schema.sql', 'utf8');
        await pool.query(schema);

        console.log('Seeding mock data for authentication...');
        const passwordHash = await bcrypt.hash('password123', 10);

        // Seed Route & Stop
        const routeRes = await pool.query(`INSERT INTO Routes (route_name, route_code) VALUES ('Main Campus Route', 'R1') ON CONFLICT (route_code) DO NOTHING RETURNING route_id`);
        let route_id;
        if (routeRes.rows.length > 0) {
            route_id = routeRes.rows[0].route_id;
        } else {
            const r = await pool.query(`SELECT route_id FROM Routes WHERE route_code = 'R1'`);
            route_id = r.rows[0].route_id;
        }

        const stopRes = await pool.query(`INSERT INTO Stops (route_id, stop_name, latitude, longitude, stop_order) VALUES ($1, 'Library', 13.085, 80.272, 1) RETURNING stop_id`, [route_id]);
        const stop_id = stopRes.rows[0].stop_id;

        // Seed Driver
        const driverRes = await pool.query(`
            INSERT INTO Drivers (driver_code, license_number, name, phone, password_hash) 
            VALUES ('DRV001', 'LIC001', 'Mike Wheeler', '9988776655', $1)
            ON CONFLICT (driver_code) DO NOTHING RETURNING driver_id
        `, [passwordHash]);

        const driver_id = driverRes.rows[0]?.driver_id || (await pool.query(`SELECT driver_id FROM Drivers WHERE driver_code = 'DRV001'`)).rows[0].driver_id;

        // Seed Bus
        const busRes = await pool.query(`
            INSERT INTO Buses (vehicle_number, capacity, route_id, driver_id)
            VALUES ('TN-01-AB-1234', 40, $1, $2)
            ON CONFLICT (vehicle_number) DO NOTHING RETURNING bus_id
        `, [route_id, driver_id]);
        const bus_id = busRes.rows[0]?.bus_id || (await pool.query(`SELECT bus_id FROM Buses WHERE vehicle_number = 'TN-01-AB-1234'`)).rows[0].bus_id;

        // Seed Student
        await pool.query(`
            INSERT INTO Students (roll_number, name, email, phone, parent_phone, password_hash, route_id, stop_id) 
            VALUES ('STU001', 'John Doe', 'john@example.com', '9876543210', '9876543211', $1, $2, $3)
            ON CONFLICT (roll_number) DO NOTHING
        `, [passwordHash, route_id, stop_id]);


        console.log('\n======================================');
        console.log('✅ DATABASE RESET AND SEEDED SUCCESSFULLY!');
        console.log('======================================\n');

        console.log('--- STUDENT LOGIN ---');
        console.log('Roll Number: STU001');
        console.log('Password: password123\n');

        console.log('--- DRIVER LOGIN ---');
        console.log('Driver Code: DRV001');
        console.log('Password: password123\n');

    } catch (err) {
        console.error('Error applying schema:', err.message);
    } finally {
        await pool.end();
    }
}

resetAndSeed();
