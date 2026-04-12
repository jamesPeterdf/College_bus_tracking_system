import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Users, Navigation, Bell, User, RefreshCcw, AlertOctagon, Phone, LogOut, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import CobusMap from '../components/CobusMap';
import { useBusTracking } from '../hooks/useBusTracking';
import api from '../services/api';

const StudentDashboard = () => {
    const [routeId, setRouteId] = useState(null);
    const [studentProfile, setStudentProfile] = useState(null);
    const navigate = useNavigate();

    // Fetch initial profile assignment
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                const role = localStorage.getItem('role');

                if (!token || role !== 'student') {
                    console.warn("No student token found. Access Denied.");
                    navigate('/login', { replace: true });
                    return;
                }

                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                const res = await api.get('/student/profile');
                setStudentProfile(res.data);
                if (res.data.route_id) {
                    console.log("Subscribing to Route:", res.data.route_id);
                    setRouteId(res.data.route_id);
                }
            } catch (err) {
                console.error("Error fetching student profile:", err.response?.data || err.message);
            }
        };
        fetchProfile();
    }, []);

    // Live tracking state from socket dynamically bound to route
    const { busLocation: liveBusLocation, connectionStatus } = useBusTracking(routeId);

    // Fallback if no location data is received yet
    const busLocation = liveBusLocation || { lat: 13.1354, lng: 80.0453, heading: 45 };

    // State
    const [metrics, setMetrics] = useState({
        eta: '-- MIN', distance: '-- KM', occupancy: '-- / --', driver: null
    });
    const [timeline, setTimeline] = useState([]);
    // Tracking the student's own live device location
    const [studentLiveLoc, setStudentLiveLoc] = useState(null);
    const [gpsError, setGpsError] = useState(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([
        { id: 1, text: 'Bus is 2 stops away', time: '2 min ago', read: false },
        { id: 2, text: 'Driver has started the route', time: '18 min ago', read: false },
        { id: 3, text: 'Route 7B is on schedule', time: '1 hr ago', read: true },
    ]);
    const notifRef = useRef(null);

    const [showReportModal, setShowReportModal] = useState(false);
    const [reportForm, setReportForm] = useState({ type: 'Rash Driving', severity: 'High', description: '' });
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    const submitReport = async (e) => {
        e.preventDefault();
        if (!reportForm.description) return toast.error("Please provide a description");
        setIsSubmittingReport(true);
        try {
            await api.post('/student/report', reportForm);
            toast.success('REPORT SUBMITTED SUCCESSFULLY');
            setShowReportModal(false);
            setReportForm({ type: 'Rash Driving', severity: 'High', description: '' });
        } catch (err) {
            toast.error('FAILED TO SUBMIT REPORT');
        } finally {
            setIsSubmittingReport(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Watch student's live location
    useEffect(() => {
        let watchId;
        if ('geolocation' in navigator) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    setStudentLiveLoc({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        stop_name: "Your Live Location"
                    });
                    setGpsError(null);
                },
                (error) => {
                    console.error('Student GPS Error:', error);
                    setGpsError('GPS Signal Lost. Please allow location permissions to see personalized routing.');
                    // Fallback to assigned stop if GPS denied
                    if (studentProfile?.stop_id) {
                        setTimeline(prev => {
                            const assignedStop = prev.find(t => t.stop_id === studentProfile.stop_id);
                            if (assignedStop) {
                                setStudentLiveLoc({
                                    lat: assignedStop.latitude,
                                    lng: assignedStop.longitude,
                                    stop_name: assignedStop.stop
                                });
                            }
                            return prev;
                        });
                    }
                },
                { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
            );
        } else {
            setGpsError('Geolocation is not supported by your browser.');
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [studentProfile]);

    // Live dashboard status
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Fetch live dashboard data
    const fetchStudentData = async () => {
        setIsRefreshing(true);
        try {
            const [metricsRes, timelineRes] = await Promise.all([
                api.get('/student/bus/metrics'),
                api.get('/student/route/timeline')
            ]);
            if (metricsRes.data) setMetrics(metricsRes.data);
            if (timelineRes.data) setTimeline(timelineRes.data);
        } catch (err) {
            console.error("Error fetching student dashboard info:", err);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStudentData(); // load immediately on mount
        const interval = setInterval(fetchStudentData, 30000); // then refresh every 30s
        return () => clearInterval(interval);
    }, []);

    // Fetch precise live OSRM ETA based on exact road paths
    useEffect(() => {
        const getLiveETA = async () => {
            if (!busLocation || !studentLiveLoc) return;
            try {
                const startLon = busLocation.lng;
                const startLat = busLocation.lat;
                const endLon = parseFloat(studentLiveLoc.lng || studentLiveLoc.longitude);
                const endLat = parseFloat(studentLiveLoc.lat || studentLiveLoc.latitude);
                
                if (startLon === endLon && startLat === endLat) return; // distance 0

                const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=false`);
                const data = await response.json();
                
                if (data.routes && data.routes.length > 0) {
                    const durationSec = data.routes[0].duration;
                    const distanceMeters = data.routes[0].distance;
                    const etaMins = Math.max(1, Math.ceil(durationSec / 60));
                    const distKm = (distanceMeters / 1000).toFixed(1);
                    
                    setMetrics(prev => ({
                        ...prev,
                        eta: `${etaMins} MIN`,
                        distance: `${distKm} KM`
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch live OSRM ETA:", err);
            }
        };
        // Debounce slightly to prevent API spam on rapid dragging or GPS drift
        const timeout = setTimeout(getLiveETA, 1000);
        return () => clearTimeout(timeout);
    }, [busLocation.lat, busLocation.lng, studentLiveLoc?.lat, studentLiveLoc?.lng]);

    const stops = timeline.map(t => ({ stop_id: t.stop_id, latitude: t.latitude, longitude: t.longitude, stop_name: t.stop }));
    
    // We are now prioritizing the student's live physical GPS `studentLiveLoc` we derived above
    // over the `targetStop` database mapping as per the new requirement.

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    return (
        <>
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 max-w-7xl mx-auto space-y-6"
        >
            <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
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
                        className="w-16 h-16 rounded-full border-2 border-red-500/50 p-1 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.2)] group hover:border-red-500 transition-colors bg-[#0A1121]"
                    >
                        <div className="w-full h-full rounded-full flex items-center justify-center group-hover:bg-red-500/10 transition-colors">
                            <LogOut className="text-red-400 group-hover:text-red-500 transition-colors" />
                        </div>
                    </motion.button>
                    <div>
                        <h2 className="text-2xl font-bold font-brand text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wide">STUDENT: {studentProfile?.name || 'Loading...'}</h2>
                        <p className="text-cyan-600/80 font-bold tracking-widest text-xs uppercase mt-1">ID-TAG: {studentProfile?.roll_number || 'Loading...'}</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowReportModal(true)}
                        className="glass px-4 py-2 flex items-center gap-2 text-white font-bold hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/50 transition-all border border-slate-700/50"
                    >
                        <AlertOctagon size={18} className="text-orange-500" />
                        <span className="hidden sm:inline tracking-widest text-xs">REPORT ANOMALY</span>
                    </motion.button>
                    <div className="relative" ref={notifRef}>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                setShowNotifications(p => !p);
                                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                            }}
                            className="glass p-3 relative hover:text-cyan-400 text-slate-400 border border-slate-700/50"
                        >
                            <Bell size={24} />
                            {notifications.some(n => !n.read) && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.8)]"></span>
                            )}
                        </motion.button>
                        <AnimatePresence>
                            {showNotifications && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    className="absolute right-0 top-14 w-72 glass border border-slate-700/50 shadow-[0_0_30px_rgba(0,0,0,0.6)] z-50 overflow-hidden"
                                >
                                    <div className="flex justify-between items-center px-4 py-3 border-b border-slate-700/50">
                                        <span className="text-[10px] font-bold text-cyan-400 tracking-widest uppercase">Notifications</span>
                                        <button onClick={() => setShowNotifications(false)}><X size={14} className="text-slate-500 hover:text-white" /></button>
                                    </div>
                                    {notifications.map(n => (
                                        <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-slate-800/50 hover:bg-white/5 transition-colors">
                                            <CheckCircle2 size={14} className="text-cyan-500 mt-0.5 shrink-0" />
                                            <div>
                                                <div className="text-xs text-white font-bold">{n.text}</div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">{n.time}</div>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-4 gap-6"
            >
                {/* Real-time Counter Stats */}
                {[
                    { icon: Clock, label: 'Estimated Arrival', value: metrics.eta, color: 'text-cyan-400', isEta: true },
                    { icon: Navigation, label: 'Distance Vector', value: metrics.distance, color: 'text-cyan-400' },
                    { icon: Users, label: 'Transport Load', value: metrics.occupancy, color: 'text-cyan-400' },
                    { icon: MapPin, label: 'Target Waypoint', value: timeline.length > 0 ? timeline.find(s => s.status === 'upcoming')?.stop || 'At Destination' : 'Loading', color: 'text-cyan-400' }
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        variants={itemVariants}
                        whileHover={{ scale: 1.02, y: -5 }}
                        className="glass p-5 border-t-[3px] border-t-cyan-500 cursor-pointer hover:shadow-cyan-500/20 group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 blur-[30px] rounded-full group-hover:bg-cyan-500/20 transition-all"></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <stat.icon size={20} className={stat.color} />
                                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{stat.label}</span>
                                </div>
                                {stat.isEta && (
                                    <motion.button
                                        onClick={fetchStudentData}
                                        className="text-slate-500 hover:text-cyan-400 transition-colors"
                                        animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                                        transition={{ repeat: isRefreshing ? Infinity : 0, duration: 1, ease: "linear" }}
                                    >
                                        <RefreshCcw size={16} />
                                    </motion.button>
                                )}
                            </div>
                            <div className="text-2xl font-black text-white tracking-tight">{stat.value}</div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Live Map Section */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass overflow-hidden relative h-[400px] border border-slate-700/50 shadow-[0_0_30px_rgba(14,165,233,0.1)] p-[2px]"
                    >
                        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-[#0A1121]/90 backdrop-blur-md px-3 py-1.5 rounded border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_#22d3ee] ${connectionStatus === 'connected' ? 'bg-cyan-400 animate-animate-pulse' : 'bg-red-500'}`}></div>
                            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                                {connectionStatus === 'connected' ? 'Live Sat-Link Active' : `LINK ${connectionStatus}`}
                            </span>
                        </div>
                        <div className="w-full h-full rounded-lg overflow-hidden relative z-10">
                            {gpsError && (
                                <div className="absolute top-14 left-4 z-20 bg-orange-500/90 text-white text-xs px-3 py-1 font-bold rounded shadow-lg backdrop-blur" style={{ maxWidth: '80%'}}>
                                    {gpsError}
                                </div>
                            )}
                            <CobusMap busLocation={busLocation} stops={stops} targetStop={studentLiveLoc} />
                        </div>
                    </motion.div>

                    {/* Assigned Driver Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="glass p-6 border border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-4"
                    >
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                                <User size={28} className="text-cyan-400" />
                            </div>
                            <div>
                                <h4 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Assigned Transport Pilot</h4>
                                <div className="text-xl font-bold text-white tracking-wide">{metrics.driver?.name || "Loading..."}</div>
                                <div className="text-xs text-cyan-500 font-bold tracking-widest mt-1">UNIT: {metrics.driver?.bus_number || "Unknown"}</div>
                            </div>
                        </div>
                        <a
                            href={`tel:${metrics.driver?.phone}`}
                            className="w-full sm:w-auto bg-cyan-500/10 text-cyan-400 border border-cyan-500/50 px-6 py-3 rounded uppercase text-xs tracking-widest font-bold flex items-center justify-center gap-2 hover:bg-cyan-500/20 transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                        >
                            <Phone size={16} /> Comms Link
                        </a>
                    </motion.div>
                </div>

                {/* Route Timeline */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass p-6 border border-slate-700/50"
                >
                    <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2 uppercase tracking-wide">
                        <motion.div
                            initial={{ height: 0 }} animate={{ height: 16 }}
                            className="w-1 bg-cyan-500 shadow-[0_0_8px_#22d3ee]"
                        ></motion.div>
                        Waypoint Timeline
                    </h3>
                    <div className="space-y-8">
                        {timeline.length === 0 ? (
                            <div className="text-sm font-bold text-slate-500">Awaiting vector data...</div>
                        ) : (
                            timeline.map((stop, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + (i * 0.1) }}
                                    className="flex gap-4 relative"
                                >
                                    {i !== timeline.length - 1 && (
                                        <div className="absolute top-6 left-[11px] w-[2px] h-full bg-slate-800 overflow-hidden">
                                            {stop.status === 'completed' && (
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: '100%' }}
                                                    transition={{ duration: 0.5, delay: 0.8 + (i * 0.2) }}
                                                    className="w-full bg-cyan-500 shadow-[0_0_8px_#22d3ee]"
                                                ></motion.div>
                                            )}
                                        </div>
                                    )}
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-[2px] z-10 ${stop.status === 'completed' ? 'bg-cyan-500/20 border-cyan-500' :
                                        stop.status === 'active' ? 'bg-[#0A1121] border-cyan-400 animate-animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-[#0A1121] border-slate-700'
                                        }`}>
                                        {stop.status === 'completed' && (
                                            <motion.div
                                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee]"
                                            ></motion.div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className={`text-sm font-bold ${stop.status === 'upcoming' ? 'text-slate-500' : 'text-white'}`}>
                                            {stop.stop}
                                        </div>
                                        <div className={`text-[10px] tracking-widest font-bold mt-1 ${stop.status === 'upcoming' ? 'text-slate-600' : 'text-cyan-500'}`}>{stop.time}</div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </motion.div>

            {/* Report Modal */}
            <AnimatePresence>
                {showReportModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-[#0A1121] border border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.15)] rounded-lg w-full max-w-lg overflow-hidden"
                        >
                            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-orange-500/10">
                                <h3 className="text-orange-400 font-black tracking-widest uppercase flex items-center gap-2">
                                    <AlertOctagon size={18} /> Driver Incident Report
                                </h3>
                                <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={submitReport} className="p-5 space-y-5">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase">Incident Type</label>
                                    <select
                                        value={reportForm.type}
                                        onChange={(e) => {
                                            const type = e.target.value;
                                            const severity = (type === 'Misbehavior/Violence' || type === 'Rash Driving') ? 'Critical' : 'High';
                                            setReportForm({...reportForm, type, severity});
                                        }}
                                        className="w-full bg-[#050B14] border border-slate-700 rounded px-3 py-3 text-sm text-white focus:border-orange-500 outline-none transition-colors"
                                    >
                                        <option value="Rash Driving">Rash Driving (Speeding/Reckless)</option>
                                        <option value="Misbehavior/Violence">Misbehavior / Violence</option>
                                        <option value="Skipped Stop">Skipped My Stop</option>
                                        <option value="Bus Overcrowded">Severe Overcrowding</option>
                                        <option value="Other">Other Issues</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold text-slate-400 tracking-widest uppercase">Details & Description</label>
                                    <textarea
                                        value={reportForm.description}
                                        onChange={(e) => setReportForm({...reportForm, description: e.target.value})}
                                        rows="4"
                                        placeholder="Please provide specifics about the incident..."
                                        className="w-full bg-[#050B14] border border-slate-700 rounded px-3 py-3 text-sm text-white focus:border-orange-500 outline-none transition-colors resize-none mb-1"
                                    />
                                    <p className="text-[10px] text-slate-500 tracking-wide">This report is sent immediately and securely to the Transport Command Center.</p>
                                </div>
                                <div className="flex gap-3 justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowReportModal(false)}
                                        className="px-5 py-2.5 rounded text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors uppercase tracking-widest"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingReport}
                                        className="px-6 py-2.5 rounded text-xs font-black bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_15px_rgba(234,88,12,0.4)] disabled:opacity-50 transition-all uppercase tracking-widest"
                                    >
                                        {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default StudentDashboard;
