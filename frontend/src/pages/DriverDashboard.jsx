import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Users, AlertTriangle, Truck, Square, Play, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CobusMap from '../components/CobusMap';
import api from '../services/api';
import socket, { connectSocket, onConnectionChange } from '../services/socket';

const DriverDashboard = () => {
    const [activeTab, setActiveTab] = useState('nav'); // nav, attendance, alerts
    const [isShiftActive, setIsShiftActive] = useState(false);
    const navigate = useNavigate();

    // Live driver location state
    // Starting coordinates set slightly away from the college so a route line can be drawn initially
    const [currentLoc, setCurrentLoc] = useState({ lat: 13.1154, lng: 80.0653, heading: 90 });
    const [gpsError, setGpsError] = useState(null);
    const [students, setStudents] = useState([]);
    const [routeId, setRouteId] = useState('7B'); // Fallback
    const [profile, setProfile] = useState(null);
    const [syncStatus, setSyncStatus] = useState('Wait'); // Wait, Syncing, Ok, Error
    const [connectionStatus, setConnectionStatus] = useState('disconnected');

    // Fetch driver profile (Route, Bus mapping)
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                const role = localStorage.getItem('role');

                if (!token || role !== 'driver') {
                    console.warn("No driver token found. Access Denied.");
                    navigate('/login', { replace: true });
                    return;
                }

                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                const res = await api.get('/driver/profile');
                setProfile(res.data);
                if (res.data.route_id) setRouteId(res.data.route_id);
            } catch (err) {
                console.error("Failed to fetch driver profile:", err.response?.data || err.message);
            }
        };
        fetchProfile();
    }, []);

    // Fetch students explicitly assigned to this driver's current route
    useEffect(() => {
        const fetchStudentsForRoute = async () => {
            if (activeTab === 'attendance') {
                try {
                    const res = await api.get('/driver/route/students');
                    setStudents(res.data);
                } catch (err) {
                    console.error("Failed to fetch students for driver:", err);
                }
            }
        };
        fetchStudentsForRoute();
    }, [activeTab]);

    const handleMarkAttendance = async (studentId) => {
        try {
            await api.post('/driver/attendance/mark', {
                student_id: studentId,
                route_id: routeId, // Actually should be pulled dynamically
                status: 'Present'
            });
            // Optimistically update
            setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: 'Present' } : s));
        } catch (err) {
            console.error("Failed to mark attendance", err);
            alert("Failed to mark attendance");
        }
    };

    const handleSos = async () => {
        try {
            await api.post('/driver/alert/sos', { lat: currentLoc.lat, lng: currentLoc.lng });
            alert("EMERGENCY SOS BROADCASTED TO ADMIN AND PARENTS.");
        } catch (err) {
            console.error("Failed to broadcast SOS", err);
            alert("Failed to trigger SOS from server.");
        }
    };

    const handleBroadcastArrival = () => {
        if (!isShiftActive) {
            toast.error('INITIALIZE SHIFT first before broadcasting.');
            return;
        }
        socket.emit('driver_arrival_ping', {
            route_id: routeId,
            bus_id: profile?.bus_id || 'UNKNOWN',
            lat: currentLoc.lat,
            lng: currentLoc.lng,
            message: 'Bus is arriving. Please be ready!'
        });
        toast.success('📡 ARRIVAL PING BROADCAST TO ALL STUDENTS ON ROUTE');
    };

    // Track real-time GPS location via browser API
    useEffect(() => {
        let watchId;

        if (isShiftActive) {
            connectSocket(); // Connect socket when shift starts
            
            onConnectionChange((status) => {
                setConnectionStatus(status);
            });

            if ('geolocation' in navigator) {
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        const newLoc = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            heading: position.coords.heading || currentLoc.heading // Use device heading if available
                        };
                        setCurrentLoc(newLoc);
                        setGpsError(null);

                        setSyncStatus('Syncing');
                        // Emit to server with acknowledgment callback
                        socket.emit('driver_location_update', {
                            route_id: routeId,
                            bus_id: profile?.bus_id || 'UNKNOWN',
                            lat: newLoc.lat,
                            lng: newLoc.lng,
                            heading: newLoc.heading
                        }, (response) => {
                            if (response.status === 'ok') {
                                setSyncStatus('Ok');
                            } else {
                                setSyncStatus('Error');
                            }
                        });
                    },
                    (error) => {
                        console.error('GPS Error:', error);
                        setGpsError('GPS Signal Lost. Please check location permissions.');
                    },
                    {
                        enableHighAccuracy: true,
                        maximumAge: 0,
                        timeout: 5000
                    }
                );
            } else {
                setGpsError('Geolocation is not supported by your browser.');
            }
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            socket.off('connect');
            socket.off('disconnect');
            socket.io.off('reconnect_attempt');
        };
    }, [isShiftActive, routeId, profile]);

    // Tab animation variants
    const tabVariants = {
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
    };

    const listItemVariants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300 } }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 max-w-7xl mx-auto space-y-6"
        >
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-800">
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                    <div className="flex items-center gap-4">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                localStorage.removeItem('token');
                                localStorage.removeItem('role');
                                localStorage.removeItem('user');
                                navigate('/login', { replace: true });
                            }}
                            className="w-12 h-12 rounded bg-red-500/10 border border-red-500/50 flex flex-col items-center justify-center text-red-500 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:bg-red-500 hover:text-[#050B14] transition-all"
                            title="Terminate Interface"
                        >
                            <LogOut size={20} />
                        </motion.button>
                        <h2 className="text-3xl font-brand font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center gap-3 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]">
                            <Truck className="text-cyan-400" />
                            VEHICLE COMM-LINK
                        </h2>
                    </div>
                    <div className="flex items-center gap-3 mt-2 pl-16">
                        <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest border border-cyan-500/30 px-2 py-0.5 rounded bg-cyan-500/10">UNIT: {profile?.bus_number || 'Loading...'}</span>
                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest border border-blue-400/30 px-2 py-0.5 rounded bg-blue-500/10">VECTOR: {profile?.route_code || 'Loading...'}</span>
                        {isShiftActive && (
                            <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded ${connectionStatus === 'connected' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-500/10' : 'text-orange-400 border-orange-400/30 bg-orange-500/10'}`}>
                                LINK: {connectionStatus}
                            </span>
                        )}
                        {isShiftActive && connectionStatus === 'connected' && (
                             <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded ${syncStatus === 'Ok' ? 'text-cyan-400 border-cyan-400/30 bg-cyan-500/10' : syncStatus === 'Syncing' ? 'text-blue-400 border-blue-400/30 bg-blue-500/10 animate-pulse' : 'text-red-400 border-red-400/30 bg-red-500/10'}`}>
                                DB: {syncStatus}
                             </span>
                        )}
                    </div>
                </motion.div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsShiftActive(!isShiftActive)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-sm font-bold uppercase tracking-widest text-xs transition-all shadow-md w-full sm:w-auto justify-center ${isShiftActive
                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        }`}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isShiftActive ? 'active' : 'inactive'}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 180 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-2"
                        >
                            {isShiftActive ? <Square size={16} /> : <Play size={16} />}
                            <span>{isShiftActive ? 'TERMINATE SHIFT' : 'INITIALIZE SHIFT'}</span>
                        </motion.div>
                    </AnimatePresence>
                </motion.button>
            </header>

            {/* Driver Controls */}
            <div className="grid grid-cols-3 gap-2 bg-[#0A1121]/50 p-2 rounded-lg border border-slate-800">
                {[
                    { id: 'nav', icon: Navigation, label: 'SAT-NAV' },
                    { id: 'attendance', icon: Users, label: 'MANIFEST' },
                    { id: 'alerts', icon: AlertTriangle, label: 'ALERTS' }
                ].map((tab) => (
                    <motion.button
                        key={tab.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-4 rounded transition-colors relative ${activeTab === tab.id ? 'text-cyan-400' : 'text-slate-500 font-bold hover:text-slate-300'
                            }`}
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTabBg"
                                className="absolute inset-0 border border-cyan-500/50 rounded bg-cyan-500/10 shadow-[inner_0_0_15px_rgba(6,182,212,0.2)]"
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                        <tab.icon size={18} className="relative z-10" />
                        <span className="font-outfit font-bold uppercase tracking-widest text-[10px] sm:text-xs relative z-10">{tab.label}</span>
                    </motion.button>
                ))}
            </div>

            <div className="glass min-h-[600px] p-6 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    {activeTab === 'nav' && (
                        <motion.div
                            key="nav"
                            variants={tabVariants}
                            initial="initial" animate="animate" exit="exit"
                            className="space-y-6"
                        >
                            <div className="glass p-6 border-l-4 border-l-cyan-500">
                                <span className="text-[10px] text-cyan-500 font-bold tracking-widest uppercase">Upcoming Waypoint</span>
                                <h3 className="text-3xl font-brand font-bold text-white tracking-widest mt-1 neon-text-cyan">Green Square</h3>
                                <p className="text-slate-400 font-bold mt-2 flex items-center gap-2 text-sm tracking-wide">
                                    <Navigation size={16} className="text-cyan-500" /> 1.2 KM TO TARGET | ~4 MIN ETA
                                </p>
                            </div>

                            <div className="h-96 glass p-[2px] rounded border border-cyan-500/20 relative overflow-hidden shadow-[0_0_20px_rgba(14,165,233,0.1)]">
                                <div className="absolute inset-0 bg-cyan-500/5 blur-[20px] pointer-events-none"></div>
                                <div className="w-full h-full rounded overflow-hidden">
                                    <CobusMap 
                                        busLocation={currentLoc} 
                                        targetStop={{ 
                                            lat: 13.1354, 
                                            lng: 80.0453, 
                                            stop_name: 'Jaya Engineering College' 
                                        }} 
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-center sm:items-stretch gap-4 p-4 glass bg-[#0A1121] border border-slate-700/50">
                                <div className="text-center sm:text-left">
                                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-widest mb-1">Awaiting Pickups</span>
                                    <span className="text-xl font-black text-white">{students.filter(s => s.status !== 'Present').length} PERSONNEL</span>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleBroadcastArrival}
                                    className="w-full sm:w-auto bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 px-8 py-3 rounded-sm font-black text-xs tracking-widest uppercase shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:bg-cyan-500 hover:text-black transition-all"
                                >
                                    BROADCAST ARRIVAL PING
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'attendance' && (
                        <motion.div
                            key="attendance"
                            variants={tabVariants}
                            initial="initial" animate="animate" exit="exit"
                            className="space-y-6"
                        >
                            <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                                <div>
                                    <h3 className="text-xl font-brand font-bold text-white tracking-widest uppercase neon-text-cyan">Target Manifest</h3>
                                    <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Awaiting Boarding Confirmation</div>
                                </div>
                                <div className="bg-cyan-500/10 px-4 py-2 rounded border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                                    <span className="text-cyan-400 font-black text-sm">{students.filter(s => s.status === 'Present').length} / {students.length} VERIFIED</span>
                                </div>
                            </div>
                            <motion.div
                                initial="hidden" animate="show"
                                variants={{ show: { transition: { staggerChildren: 0.05 } } }}
                                className="space-y-3"
                            >
                                {students.length === 0 ? (
                                    <div className="text-center p-6 text-slate-500 font-bold tracking-widest uppercase text-xs">No pending personnel logic found.</div>
                                ) : (
                                    students.map(student => (
                                        <motion.div
                                            key={student.id}
                                            variants={listItemVariants}
                                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 glass hover:border-cyan-500/30 transition-colors gap-4"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-[#050B14] rounded-sm flex items-center justify-center border border-slate-700">
                                                    <Users size={20} className="text-cyan-500" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white text-lg tracking-wide neon-text-cyan">{student.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">TAG: {student.roll}</div>
                                                </div>
                                            </div>
                                            {student.status === 'Present' ? (
                                                <div className="w-full sm:w-auto text-center px-6 py-2.5 bg-emerald-500/10 text-emerald-400 font-black rounded border border-emerald-500/30 text-xs tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                                    BOARDING SECURED
                                                </div>
                                            ) : (
                                                <motion.button
                                                    onClick={() => handleMarkAttendance(student.id)}
                                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(6, 182, 212, 0.1)' }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className="w-full sm:w-auto px-6 py-2.5 border border-cyan-500/50 text-cyan-400 rounded transition-colors font-bold text-xs tracking-widest uppercase cursor-pointer"
                                                >
                                                    VERIFY BOARDING
                                                </motion.button>
                                            )}
                                        </motion.div>
                                    ))
                                )}
                            </motion.div>
                        </motion.div>
                    )}

                    {activeTab === 'alerts' && (
                        <motion.div
                            key="alerts"
                            variants={tabVariants}
                            initial="initial" animate="animate" exit="exit"
                            className="flex flex-col items-center justify-center h-[500px] space-y-8"
                        >
                            <motion.button
                                onClick={handleSos}
                                animate={{
                                    scale: [1, 1.05, 1],
                                    boxShadow: ['0 0 20px rgba(249,115,22,0.2)', '0 0 60px rgba(249,115,22,0.6)', '0 0 20px rgba(249,115,22,0.2)']
                                }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                whileHover={{ scale: 1.1, backgroundColor: 'rgba(249, 115, 22, 1)' }}
                                whileTap={{ scale: 0.9 }}
                                className="w-48 h-48 rounded-full bg-orange-500/20 border-4 neon-border-orange flex flex-col items-center justify-center gap-2 group transition-colors cursor-pointer"
                            >
                                <AlertTriangle size={64} className="text-orange-500 group-hover:text-background transition-colors" />
                                <span className="font-outfit font-bold text-orange-500 group-hover:text-background transition-colors">SEND SOS</span>
                            </motion.button>
                            <p className="text-slate-700 font-bold text-center max-w-xs uppercase text-xs tracking-wider leading-relaxed">
                                Pressing SOS will immediately notify college administration and all parents on this route.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default DriverDashboard;
