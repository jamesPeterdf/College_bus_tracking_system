const db = require('../config/db');

const detectAnomalies = async (busId, currentLat, currentLng, speed, heading) => {
    const anomalies = [];

    try {
        // 1. Deviated from route (> 500m)
        // Logic: Compare currentLat/lng with planned route points in DB

        // 2. Speeding (> 80 km/h)
        if (speed > 80) {
            anomalies.push({ type: 'SPEEDING', message: `Bus ${busId} is exceeding 80 km/h` });
        }

        // 3. Stationary > 10 mins (Logic would require local persistence/Redis history)

        if (anomalies.length > 0) {
            for (const anomaly of anomalies) {
                await db.query('INSERT INTO Notifications (recipient_type, recipient_id, type, title, message, channel) VALUES ($1, $2, $3, $4, $5, $6)',
                    ['admin', 'system', 'ANOMALY', anomaly.type, anomaly.message, 'push']);
            }
        }

        return anomalies;
    } catch (err) {
        console.error('Anomaly Detection Error:', err);
        return [];
    }
};

module.exports = { detectAnomalies };
