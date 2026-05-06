const db = require('../config/db');

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
};

const processedUpdates = new Map(); // Store last state for each stop: { routeId_stopId: 'near' | 'at' | 'left' }

const checkProximity = async (io, routeId, busLat, busLng) => {
    try {
        const { data: stops } = await db
            .from('stops')
            .select('stop_id, stop_name, latitude, longitude')
            .eq('route_id', routeId)
            .order('stop_order');

        if (!stops) return;

        for (const stop of stops) {
            const distance = calculateDistance(busLat, busLng, stop.latitude, stop.longitude);
            const key = `${routeId}_${stop.stop_id}`;
            const lastState = processedUpdates.get(key);

            let newState = null;
            let event = null;
            let message = null;

            if (distance < 100) {
                newState = 'at';
                if (lastState !== 'at') {
                    event = 'bus_at_stop';
                    message = `Bus has reached ${stop.stop_name}`;
                }
            } else if (distance < 500) {
                newState = 'near';
                if (lastState !== 'at' && lastState !== 'near') {
                    event = 'bus_near_stop';
                    message = `Bus is approaching ${stop.stop_name} (within 500m)`;
                }
            } else if (lastState === 'at' && distance >= 150) {
                newState = 'left';
                event = 'bus_left_stop';
                message = `Bus has left ${stop.stop_name}`;
            } else if (distance > 1000) {
                newState = 'far';
            }

            if (event) {
                io.to(`route_${routeId}`).emit('notification', {
                    type: 'PROXIMITY',
                    stop_id: stop.stop_id,
                    stop_name: stop.stop_name,
                    event,
                    message,
                    timestamp: new Date().toISOString()
                });
            }

            if (newState) {
                processedUpdates.set(key, newState);
            }
        }
    } catch (error) {
        console.error('Proximity Check Error:', error);
    }
};

module.exports = { checkProximity };
