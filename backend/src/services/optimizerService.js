const axios = require('axios');
const db = require('../config/db');

const optimizeRoute = async (routeId) => {
    try {
        const stopsRes = await db.query('SELECT * FROM Stops WHERE route_id = $1 ORDER BY stop_order', [routeId]);
        const stops = stopsRes.rows;

        if (stops.length < 2) return stops;

        const origin = `${stops[0].latitude},${stops[0].longitude}`;
        const destination = `${stops[stops.length - 1].latitude},${stops[stops.length - 1].longitude}`;
        const waypoints = stops.slice(1, -1).map(s => `${s.latitude},${s.longitude}`).join('|');

        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=optimize:true|${waypoints}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

        const response = await axios.get(url);
        const order = response.data.routes[0].waypoint_order;

        // Nearest-neighbor or simply using Google's optimization
        // Map order back to stops
        return order;
    } catch (err) {
        console.error('Route Optimization Error:', err);
        throw err;
    }
};

module.exports = { optimizeRoute };
