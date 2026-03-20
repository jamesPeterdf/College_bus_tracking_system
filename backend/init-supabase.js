/**
 * init-supabase.js
 * Full DB initialization + seed for Supabase (Postgres).
 * Column names match EXACTLY with all route query files.
 * Run: node init-supabase.js
 */
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 5432,
    ssl: { rejectUnauthorized: false } // Required for Supabase
});

async function main() {
    console.log('🚀 Starting Supabase DB Initialization...');
    console.log(`   Host : ${process.env.DB_HOST}`);
    console.log(`   DB   : ${process.env.DB_NAME}`);

    try {
        // ── 1. DROP ALL TABLES ──────────────────────────────────────────────
        console.log('\n[1/7] Dropping old tables...');
        await pool.query(`
            DROP TABLE IF EXISTS Alerts     CASCADE;
            DROP TABLE IF EXISTS Attendance CASCADE;
            DROP TABLE IF EXISTS Students   CASCADE;
            DROP TABLE IF EXISTS Buses      CASCADE;
            DROP TABLE IF EXISTS Drivers    CASCADE;
            DROP TABLE IF EXISTS Stops      CASCADE;
            DROP TABLE IF EXISTS Routes     CASCADE;
        `);
        console.log('      ✓ Old tables dropped.');

        // ── 2. CREATE TABLES ────────────────────────────────────────────────
        console.log('\n[2/7] Creating Routes table...');
        await pool.query(`
            CREATE TABLE Routes (
                route_id            SERIAL PRIMARY KEY,
                route_code          VARCHAR(20)  UNIQUE NOT NULL,
                route_name          VARCHAR(100) NOT NULL,
                total_distance_km   DECIMAL      DEFAULT 0,
                waypoints           JSONB        DEFAULT '[]'::jsonb,
                created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('      Creating Stops table...');
        await pool.query(`
            CREATE TABLE Stops (
                stop_id                 SERIAL PRIMARY KEY,
                route_id                INT REFERENCES Routes(route_id) ON DELETE CASCADE,
                stop_name               VARCHAR(150) NOT NULL,
                latitude                DECIMAL      NOT NULL,
                longitude               DECIMAL      NOT NULL,
                stop_order              INT          DEFAULT 1,
                estimated_arrival_time  VARCHAR(20)  DEFAULT '07:30 AM'
            );
        `);

        console.log('      Creating Drivers table...');
        await pool.query(`
            CREATE TABLE Drivers (
                driver_id       SERIAL PRIMARY KEY,
                driver_code     VARCHAR(50)  UNIQUE NOT NULL,
                name            VARCHAR(100) NOT NULL,
                phone           VARCHAR(20),
                license_number  VARCHAR(50),
                password_hash   VARCHAR(255) NOT NULL,
                is_active       BOOLEAN      DEFAULT true
            );
        `);

        console.log('      Creating Buses table...');
        await pool.query(`
            CREATE TABLE Buses (
                bus_id          SERIAL PRIMARY KEY,
                vehicle_number  VARCHAR(50) UNIQUE NOT NULL,
                capacity        INT         DEFAULT 40,
                route_id        INT REFERENCES Routes(route_id)  ON DELETE SET NULL,
                driver_id       INT REFERENCES Drivers(driver_id) ON DELETE SET NULL,
                is_active       BOOLEAN     DEFAULT true,
                current_lat     DECIMAL,
                current_lng     DECIMAL,
                last_updated    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('      Creating Students table...');
        await pool.query(`
            CREATE TABLE Students (
                student_id      SERIAL PRIMARY KEY,
                roll_number     VARCHAR(50)  UNIQUE NOT NULL,
                password_hash   VARCHAR(255) NOT NULL,
                name            VARCHAR(100) NOT NULL,
                email           VARCHAR(150),
                phone           VARCHAR(20),
                department      VARCHAR(100) DEFAULT 'Engineering',
                semester        INT          DEFAULT 1,
                year            INT          DEFAULT 1,
                route_id        INT REFERENCES Routes(route_id)  ON DELETE SET NULL,
                stop_id         INT REFERENCES Stops(stop_id)    ON DELETE SET NULL,
                is_active       BOOLEAN      DEFAULT true,
                created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('      Creating Attendance table...');
        await pool.query(`
            CREATE TABLE Attendance (
                attendance_id       SERIAL PRIMARY KEY,
                student_id          INT REFERENCES Students(student_id) ON DELETE CASCADE,
                route_id            INT REFERENCES Routes(route_id)     ON DELETE CASCADE,
                date                DATE      DEFAULT CURRENT_DATE,
                status              VARCHAR(20) NOT NULL DEFAULT 'Pending',
                verification_method VARCHAR(50) DEFAULT 'Driver Manual',
                UNIQUE(student_id, date)
            );
        `);

        console.log('      Creating Alerts table...');
        await pool.query(`
            CREATE TABLE Alerts (
                alert_id        SERIAL PRIMARY KEY,
                bus_id          INT REFERENCES Buses(bus_id) ON DELETE CASCADE,
                type            VARCHAR(50) NOT NULL,
                severity        VARCHAR(20) DEFAULT 'Medium',
                description     TEXT,
                status          VARCHAR(20) DEFAULT 'Active',
                created_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('      ✓ All tables created.');

        // ── 3. SEED ROUTES ──────────────────────────────────────────────────
        console.log('\n[3/7] Seeding 5 real routes for Jaya Engineering College...');

        const routeData = [
            { code: 'R1', name: 'Avadi Direct' },
            { code: 'R2', name: 'Annanagar Express' },
            { code: 'R3', name: 'Tambaram Long Route' },
            { code: 'R4', name: 'Guindy Specials' },
            { code: 'R5', name: 'Poonamallee Local' },
        ];

        const stopsMap = {
            R1: [
                { name: 'Avadi Checkpost',    lat: 13.1118, lng: 80.1147 },
                { name: 'Pattabiram',         lat: 13.1235, lng: 80.0818 },
                { name: 'Tiruninravur',       lat: 13.1158, lng: 80.0384 },
                { name: 'College Main Gate',  lat: 13.1354, lng: 80.0453 },
            ],
            R2: [
                { name: 'Annanagar Roundana', lat: 13.0845, lng: 80.2185 },
                { name: 'Thirumangalam',      lat: 13.0850, lng: 80.1985 },
                { name: 'Ambattur OT',        lat: 13.1130, lng: 80.1600 },
                { name: 'College Main Gate',  lat: 13.1354, lng: 80.0453 },
            ],
            R3: [
                { name: 'Tambaram Sanatorium',lat: 12.9300, lng: 80.1340 },
                { name: 'Chromepet',          lat: 12.9515, lng: 80.1415 },
                { name: 'Porur Junction',     lat: 13.0360, lng: 80.1550 },
                { name: 'College Main Gate',  lat: 13.1354, lng: 80.0453 },
            ],
            R4: [
                { name: 'Guindy Kathipara',   lat: 13.0110, lng: 80.2015 },
                { name: 'Vadapalani Signal',  lat: 13.0505, lng: 80.2120 },
                { name: 'Koyambedu CMBT',     lat: 13.0690, lng: 80.1965 },
                { name: 'College Main Gate',  lat: 13.1354, lng: 80.0453 },
            ],
            R5: [
                { name: 'Poonamallee Terminus',lat: 13.0483, lng: 80.0913 },
                { name: 'Karayanchavadi',     lat: 13.0385, lng: 80.1000 },
                { name: 'SA Engineering',     lat: 13.1005, lng: 80.0520 },
                { name: 'College Main Gate',  lat: 13.1354, lng: 80.0453 },
            ],
        };

        const routeIds = {};
        const stopIds  = {}; // First stop per route for student assignment

        for (const r of routeData) {
            const res = await pool.query(
                `INSERT INTO Routes (route_code, route_name, total_distance_km)
                 VALUES ($1, $2, 15)
                 RETURNING route_id`,
                [r.code, r.name]
            );
            const rid = res.rows[0].route_id;
            routeIds[r.code] = rid;

            const times = ['07:00 AM', '07:15 AM', '07:30 AM', '08:00 AM'];
            for (let i = 0; i < stopsMap[r.code].length; i++) {
                const s = stopsMap[r.code][i];
                const sRes = await pool.query(
                    `INSERT INTO Stops (route_id, stop_name, latitude, longitude, stop_order, estimated_arrival_time)
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING stop_id`,
                    [rid, s.name, s.lat, s.lng, i + 1, times[i]]
                );
                if (i === 0) stopIds[r.code] = sRes.rows[0].stop_id;
            }
            console.log(`      ✓ Route ${r.code} (${r.name}) + ${stopsMap[r.code].length} stops`);
        }

        // ── 4. SEED DRIVERS ─────────────────────────────────────────────────
        console.log('\n[4/7] Seeding drivers...');
        const driverHash = await bcrypt.hash('driver123', 10);

        const driversData = [
            { code: 'DRV001', name: 'Rajan Kumar',   phone: '9876543210', license: 'TN-DL-001', route: 'R1' },
            { code: 'DRV002', name: 'Selvam Arasu',  phone: '9876543211', license: 'TN-DL-002', route: 'R2' },
            { code: 'DRV003', name: 'Murugan P',     phone: '9876543212', license: 'TN-DL-003', route: 'R3' },
            { code: 'DRV004', name: 'Balachandran K',phone: '9876543213', license: 'TN-DL-004', route: 'R4' },
            { code: 'DRV005', name: 'Senthil Nathan', phone: '9876543214', license: 'TN-DL-005', route: 'R5' },
        ];

        const driverIds = {};
        for (const d of driversData) {
            const res = await pool.query(
                `INSERT INTO Drivers (driver_code, name, phone, license_number, password_hash)
                 VALUES ($1, $2, $3, $4, $5) RETURNING driver_id`,
                [d.code, d.name, d.phone, d.license, driverHash]
            );
            driverIds[d.route] = res.rows[0].driver_id;
            console.log(`      ✓ Driver ${d.code} (${d.name})`);
        }

        // ── 5. SEED BUSES ───────────────────────────────────────────────────
        console.log('\n[5/7] Seeding buses...');
        const busRoutes = ['R1','R2','R3','R4','R5'];
        for (const r of busRoutes) {
            await pool.query(
                `INSERT INTO Buses (vehicle_number, capacity, route_id, driver_id, current_lat, current_lng)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [`TN-BUS-${r}`, 45, routeIds[r], driverIds[r], 13.1354, 80.0453]
            );
            console.log(`      ✓ Bus TN-BUS-${r} → Route ${r}`);
        }

        // ── 6. SEED STUDENTS ────────────────────────────────────────────────
        console.log('\n[6/7] Seeding students...');
        const studentHash = await bcrypt.hash('student123', 10);

        const studentsData = [
            { roll: '2024CS001', name: 'James Peter',     dept: 'CSE', route: 'R1', email: '2024cs001@jaya.edu' },
            { roll: '2024CS002', name: 'Priya Lakshmi',   dept: 'CSE', route: 'R2', email: '2024cs002@jaya.edu' },
            { roll: '2024ME001', name: 'Arun Raj',        dept: 'ME',  route: 'R3', email: '2024me001@jaya.edu' },
            { roll: '2024EC001', name: 'Deepa Sundaram',  dept: 'ECE', route: 'R4', email: '2024ec001@jaya.edu' },
            { roll: '2024CV001', name: 'Rahul Sharma',    dept: 'CIVIL',route:'R5', email: '2024cv001@jaya.edu' },
        ];

        for (const s of studentsData) {
            await pool.query(
                `INSERT INTO Students (roll_number, password_hash, name, email, phone, department, route_id, stop_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [s.roll, studentHash, s.name, s.email, '9000000000', s.dept, routeIds[s.route], stopIds[s.route]]
            );
            console.log(`      ✓ Student ${s.roll} (${s.name}) → Route ${s.route}`);
        }

        // ── 7. SUMMARY ──────────────────────────────────────────────────────
        console.log('\n[7/7] Verification counts:');
        const counts = await Promise.all([
            pool.query('SELECT count(*) FROM Routes'),
            pool.query('SELECT count(*) FROM Stops'),
            pool.query('SELECT count(*) FROM Drivers'),
            pool.query('SELECT count(*) FROM Buses'),
            pool.query('SELECT count(*) FROM Students'),
        ]);
        console.log(`      Routes   : ${counts[0].rows[0].count}`);
        console.log(`      Stops    : ${counts[1].rows[0].count}`);
        console.log(`      Drivers  : ${counts[2].rows[0].count}`);
        console.log(`      Buses    : ${counts[3].rows[0].count}`);
        console.log(`      Students : ${counts[4].rows[0].count}`);

        console.log(`
╔══════════════════════════════════════════╗
║   ✅  SUPABASE SETUP COMPLETE            ║
╠══════════════════════════════════════════╣
║  Login Credentials:                      ║
║                                          ║
║  ADMIN                                   ║
║  Email   : admin@cobus.edu               ║
║  Password: adminpassword                 ║
║                                          ║
║  DRIVER  (any driver)                    ║
║  Code    : DRV001 … DRV005               ║
║  Password: driver123                     ║
║                                          ║
║  STUDENT (any student)                   ║
║  Roll    : 2024CS001 … 2024CV001         ║
║  Password: student123                    ║
╚══════════════════════════════════════════╝
`);

    } catch (err) {
        console.error('\n❌ Migration Error:', err.message);
        console.error(err);
    } finally {
        await pool.end();
    }
}

main();
