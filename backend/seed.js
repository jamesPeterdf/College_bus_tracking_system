const bcrypt = require('bcrypt');
const db = require('./src/config/db');

async function seedUser() {
    try {
        const hash = await bcrypt.hash('password123', 10);

        let routeRes = await db.query('SELECT route_id FROM Routes LIMIT 1');
        let routeId;
        if (routeRes.rows.length === 0) {
            const newRoute = await db.query('INSERT INTO Routes (route_name, route_code) VALUES ($1, $2) RETURNING route_id', ['Main Route', 'R1']);
            routeId = newRoute.rows[0].route_id;
        } else {
            routeId = routeRes.rows[0].route_id;
        }

        // Insert Student
        await db.query(`
            INSERT INTO Students (roll_number, name, email, phone, parent_phone, password_hash, route_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (roll_number) DO NOTHING
        `, ['2021CS01', 'James Peter', 'james@example.com', '1234567890', '0987654321', hash, routeId]);

        // Insert Driver
        await db.query(`
            INSERT INTO Drivers (driver_code, name, phone, license_number, password_hash) 
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (driver_code) DO NOTHING
        `, ['D001', 'John Driver', '1112223333', 'LIC123', hash]);

        console.log('Mock users seeded successfully: Student (2021CS01), Driver (D001)');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding:', err);
        process.exit(1);
    }
}
seedUser();
