import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import socket, { connectSocket, subscribeToRoute, onLocationUpdate, onConnectionChange } from '../services/socket';

export const useBusTracking = (routeId) => {
    const [busLocation, setBusLocation] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [arrivalPing, setArrivalPing] = useState(null);
    const [latestNotification, setLatestNotification] = useState(null);

    useEffect(() => {
        if (!routeId) {
            console.log("useBusTracking: No Route ID yet.");
            return;
        }

        console.log("useBusTracking: Initializing for Route", routeId);
        connectSocket();
        
        onConnectionChange((status) => {
            console.log("Socket Connection:", status);
            setConnectionStatus(status);
            
            // Resume subscriptions if reconnected
            if (status === 'connected') {
                subscribeToRoute(routeId);
            }
        });

        // Initial sub
        subscribeToRoute(routeId);

        onLocationUpdate((data) => {
            console.log("useBusTracking: Received socket data:", data);
            if (data.route_id === routeId) {
                setBusLocation(data);
            }
        });

        // Listen for arrival pings from driver
        socket.on('arrival_ping', (data) => {
            console.log("useBusTracking: Arrival ping received:", data);
            setArrivalPing(data);
            toast.success(`📡 ${data.message}`, { duration: 6000 });
        });

        // Listen for proximity notifications
        socket.on('notification', (data) => {
            console.log("useBusTracking: Notification received:", data);
            toast.success(`🚌 ${data.message}`, { duration: 6000, position: 'top-center' });
            // We can also trigger a custom event or callback here if needed
            // But for now, the toast and returning the data is enough
            setLatestNotification(data);
        });

        return () => {
            socket.off('location_update');
            socket.off('arrival_ping');
            socket.off('notification');
            socket.off('connect');
            socket.off('disconnect');
            socket.io.off('reconnect_attempt');
        };
    }, [routeId]);

    return { busLocation, connectionStatus, arrivalPing, latestNotification };
};
