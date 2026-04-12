const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const validateEnv = require('./config/envValidator');
const errorHandler = require('./middleware/errorHandler');
const db = require('./config/db');

validateEnv();

const app = express();
const server = http.createServer(app);

app.disable('x-powered-by');

const io = socketIo(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
    },
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
    }
});

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.set('socketio', io);

app.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/driver', require('./routes/driver.routes'));
app.use('/api/student', require('./routes/student.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/parent', require('./routes/parent.routes'));
app.use('/api/ai', require('./routes/ai.routes'));

app.use(errorHandler);

io.on('connection', (socket) => {
    if (socket.recovered) {
        console.log(`Socket ${socket.id} recovered.`);
    }

    socket.on('subscribe_route', (routeId) => {
        socket.join(`route_${routeId}`);
    });
    
    socket.on('subscribe_admin', () => {
        socket.join('admin_room');
    });

    socket.on('driver_location_update', async (data, callback) => {
        socket.broadcast.to(`route_${data.route_id}`).emit('location_update', data);
        socket.broadcast.to('admin_room').emit('global_location_update', data);
        
        let success = false;
        try {
            const { error } = await db
                .from('buses')
                .update({ 
                    current_lat: data.lat, 
                    current_lng: data.lng, 
                    last_updated: new Date().toISOString() 
                })
                .eq('route_id', data.route_id)
                .eq('is_active', true);
            success = !error;
        } catch (err) {}
        
        if (callback) callback({ status: success ? 'ok' : 'error' });
    });

    socket.on('driver_arrival_ping', (data) => {
        socket.broadcast.to(`route_${data.route_id}`).emit('arrival_ping', data);
        socket.broadcast.to('admin_room').emit('driver_arrival_ping', data);
    });
});

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log(`✅ Server running on port ${PORT}`);
    });
}

const gracefulShutdown = () => {
    server.close(async () => {
        process.exit(0);
    });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = { app, io };
