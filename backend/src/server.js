const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Or specific vercel domains
        methods: ["GET", "POST"]
    },
    connectionStateRecovery: {
        // the backup duration of the sessions and the packets (2 minutes)
        maxDisconnectionDuration: 2 * 60 * 1000,
        // whether to skip middlewares upon successful recovery
        skipMiddlewares: true,
    }
});

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.set('socketio', io);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/driver', require('./routes/driver'));
app.use('/api/student', require('./routes/student'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/parent', require('./routes/parent'));
app.use('/api/ai', require('./routes/ai'));

// Socket.io logic
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    if (socket.recovered) {
        console.log(`Socket ${socket.id} recovered connection state successfully.`);
    }

    socket.on('subscribe_route', (routeId) => {
        socket.join(`route_${routeId}`);
        console.log(`Socket ${socket.id} joined route_${routeId}`);
    });
    
    socket.on('subscribe_admin', () => {
        socket.join('admin_room');
        console.log(`Admin Socket ${socket.id} joined global monitor room.`);
    });

    socket.on('driver_location_update', async (data, callback) => {
        // Broadcast to all clients in the route room except the sender
        socket.broadcast.to(`route_${data.route_id}`).emit('location_update', data);
        
        // Also broadcast to admin monitoring room
        socket.broadcast.to('admin_room').emit('global_location_update', data);
        
        console.log(`Location update for route_${data.route_id}:`, data);

        let persistSuccess = false;
        try {
            // Persist the latest live tracker to the backend database 
            const db = require('./config/db');
            await db.query(`
                UPDATE Buses 
                SET current_lat = $1, current_lng = $2, last_updated = CURRENT_TIMESTAMP
                WHERE route_id = $3 AND is_active = true
            `, [data.lat, data.lng, data.route_id]);
            persistSuccess = true;
        } catch (err) {
            console.error("Socket DB Persist Error:", err.message);
        }
        
        // Acknowledgment back to the driver client that coordinates were stored/broadcasted
        if (callback && typeof callback === 'function') {
            callback({
                status: persistSuccess ? 'ok' : 'error',
                timestamp: new Date().toISOString()
            });
        }
    });

    socket.on('driver_arrival_ping', (data) => {
        // Broadcast arrival ping to all students subscribed to this route
        socket.broadcast.to(`route_${data.route_id}`).emit('arrival_ping', {
            message: data.message || 'Bus is arriving! Please be ready.',
            route_id: data.route_id,
            lat: data.lat,
            lng: data.lng,
            timestamp: new Date().toISOString()
        });
        socket.broadcast.to('admin_room').emit('driver_arrival_ping', data);
        console.log(`Arrival ping for route_${data.route_id}`);
    });

    socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id} Reason: ${reason}`);
    });
});

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = { app, io };
