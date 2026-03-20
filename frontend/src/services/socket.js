import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
    autoConnect: false,
});

export const connectSocket = () => {
    if (!socket.connected) socket.connect();
};

export const subscribeToRoute = (routeId) => {
    socket.emit('subscribe_route', routeId);
};
export const onConnectionChange = (callback) => {
    socket.on('connect', () => callback('connected'));
    socket.on('disconnect', (reason) => callback(`disconnected: ${reason}`));
    socket.io.on('reconnect_attempt', (attempt) => callback(`reconnecting (attempt ${attempt})`));
};

export const onLocationUpdate = (callback) => {
    socket.on('location_update', callback);
};

export default socket;
