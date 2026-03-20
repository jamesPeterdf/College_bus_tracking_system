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

async function getOrSeedCredentials() {
    try {
        let students = await pool.query('SELECT roll_number, name FROM Students LIMIT 1');
        let drivers = await pool.query('SELECT driver_code, name FROM Drivers LIMIT 1');

        if (students.rows.length === 0 || drivers.rows.length === 0) {
            console.log('Database appears empty or missing test users. Seeding now...');

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

            // Seed Student
            await pool.query(`
                INSERT INTO Students (roll_number, name, email, phone, parent_phone, password_hash, route_id, stop_id) 
                VALUES ('STU001', 'John Doe', 'john@example.com', '9876543210', '9876543211', $1, $2, $3)
                ON CONFLICT (roll_number) DO NOTHING
            `, [passwordHash, route_id, stop_id]);

            // Seed Driver
            await pool.query(`
                INSERT INTO Drivers (driver_code, license_number, name, phone, password_hash) 
                VALUES ('DRV001', 'LIC001', 'Mike Wheeler', '9988776655', $1)
                ON CONFLICT (driver_code) DO NOTHING
            `, [passwordHash]);

            console.log('\n--- Seeded Test Credentials ---');
            console.log('Student List:');
            console.log('Roll Number: STU001');
            console.log('Password: password123');
            console.log('\nDriver List:');
            console.log('Driver Code: DRV001');
            console.log('Password: password123');
        } else {
            console.log('\n--- Existing Credentials Found ---');
            console.log('Note: Since passwords are hashed, try "password123" if you created them via the app earlier.');
            console.log('\nStudents:');
            const allStudents = await pool.query('SELECT roll_number, name FROM Students');
            allStudents.rows.forEach(s => console.log(`- ${s.name} (Roll: ${s.roll_number})`));

            console.log('\nDrivers:');
            const allDrivers = await pool.query('SELECT driver_code, name FROM Drivers');
            allDrivers.rows.forEach(d => console.log(`- ${d.name} (Code: ${d.driver_code})`));
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

getOrSeedCredentials();
