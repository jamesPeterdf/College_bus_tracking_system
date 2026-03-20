const { io } = require('socket.io-client');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

async function mockDriver() {
    try {
        const routeRes = await pool.query(`SELECT route_id FROM Routes WHERE route_code = 'R1'`);
        const routeId = routeRes.rows[0].route_id;

        const busRes = await pool.query(`SELECT bus_id FROM Buses WHERE route_id = $1`, [routeId]);
        const busId = busRes.rows[0].bus_id;

        const socket = io('http://localhost:5000');

        socket.on('connect', () => {
            console.log('Driver Mock Connected:', socket.id);

            let lat = 13.0827;
            let lng = 80.2707;

            // Simulate moving roughly towards the destination (Library stopping at 13.085, 80.272)
            setInterval(() => {
                lat += 0.0001;
                lng += 0.0001;

                const data = {
                    route_id: routeId,
                    bus_id: busId,
                    lat,
                    lng,
                    heading: 45
                };

                socket.emit('driver_location_update', data);
                console.log(`Pushed location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            }, 3000);
        });

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

mockDriver();
