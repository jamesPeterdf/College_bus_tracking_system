const db = require('./src/config/db');

async function seedRoutes() {
    try {
        console.log("Seeding routes...");
        
        // Define realistic routes for Jaya Engineering College
        const routes = [
            { name: "Avadi Direct", code: "R1" },
            { name: "Annanagar Express", code: "R2" },
            { name: "Tambaram Long Route", code: "R3" },
            { name: "Guindy Specials", code: "R4" },
            { name: "Poonamallee Local", code: "R5" }
        ];

        const stopsMap = {
            "R1": [
                { name: "Avadi Checkpost", lat: 13.1118, lng: 80.1147 },
                { name: "Pattabiram", lat: 13.1235, lng: 80.0818 },
                { name: "Tiruninravur", lat: 13.1158, lng: 80.0384 },
                { name: "College Main Gate", lat: 13.1354, lng: 80.0453 }
            ],
            "R2": [
                { name: "Annanagar Roundana", lat: 13.0845, lng: 80.2185 },
                { name: "Thirumangalam", lat: 13.0850, lng: 80.1985 },
                { name: "Ambattur OT", lat: 13.1130, lng: 80.1600 },
                { name: "College Main Gate", lat: 13.1354, lng: 80.0453 }
            ],
            "R3": [
                { name: "Tambaram Sanatorium", lat: 12.9300, lng: 80.1340 },
                { name: "Chromepet", lat: 12.9515, lng: 80.1415 },
                { name: "Porur Junction", lat: 13.0360, lng: 80.1550 },
                { name: "College Main Gate", lat: 13.1354, lng: 80.0453 }
            ],
            "R4": [
                { name: "Guindy Kathipara", lat: 13.0110, lng: 80.2015 },
                { name: "Vadapalani Signal", lat: 13.0505, lng: 80.2120 },
                { name: "Koyambedu CMBT", lat: 13.0690, lng: 80.1965 },
                { name: "College Main Gate", lat: 13.1354, lng: 80.0453 }
            ],
            "R5": [
                { name: "Poonamallee Terminus", lat: 13.0483, lng: 80.0913 },
                { name: "Karayanchavadi", lat: 13.0385, lng: 80.1000 },
                { name: "SA Engineering College", lat: 13.1005, lng: 80.0520 },
                { name: "College Main Gate", lat: 13.1354, lng: 80.0453 }
            ]
        };

        for (const r of routes) {
            // Check if route exists
            let routeRes = await db.query('SELECT route_id FROM Routes WHERE route_code = $1', [r.code]);
            let routeId;
            
            if (routeRes.rows.length === 0) {
                console.log(`Inserting route ${r.code}...`);
                const newRoute = await db.query('INSERT INTO Routes (route_name, route_code) VALUES ($1, $2) RETURNING route_id', [r.name, r.code]);
                routeId = newRoute.rows[0].route_id;
            } else {
                routeId = routeRes.rows[0].route_id;
                console.log(`Route ${r.code} exists, deleting old stops to replace with fresh coordinates...`);
                await db.query('DELETE FROM Stops WHERE route_id = $1', [routeId]);
            }

            const stopsToInsert = stopsMap[r.code];
            if (stopsToInsert) {
                for (let i = 0; i < stopsToInsert.length; i++) {
                    const stop = stopsToInsert[i];
                    await db.query(`
                        INSERT INTO Stops (route_id, stop_name, latitude, longitude, stop_order, estimated_arrival_time) 
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [
                        routeId, 
                        stop.name, 
                        stop.lat, 
                        stop.lng, 
                        i + 1, 
                        `0${7 + i}:30 AM` // mock estimated time
                    ]);
                }
            }
        }

        console.log("Successfully seeded 5 Advanced Routes and real-world stops.");
        process.exit(0);

    } catch (err) {
        console.error("Error seeding routes:", err);
        process.exit(1);
    }
}

seedRoutes();
