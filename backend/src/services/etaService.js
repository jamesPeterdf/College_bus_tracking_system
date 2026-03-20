const axios = require('axios');

const predictETA = async (busLat, busLng, stopLat, stopLng) => {
    try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${busLat},${busLng}&destinations=${stopLat},${stopLng}&mode=driving&departure_time=now&key=${process.env.GOOGLE_MAPS_API_KEY}`;

        const response = await axios.get(url);
        const element = response.data.rows[0].elements[0];

        return {
            duration_min: Math.round(element.duration.value / 60),
            duration_in_traffic_min: Math.round(element.duration_in_traffic?.value / 60 || element.duration.value / 60),
            distance_km: (element.distance.value / 1000).toFixed(1)
        };
    } catch (err) {
        console.error('ETA Prediction Error:', err);
        return null;
    }
};

module.exports = { predictETA };
