import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Clock, Navigation, LogOut, CheckCircle2, User, AlertCircle, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CobusMap from '../components/CobusMap';
import api from '../services/api';

const ParentDashboard = () => {
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState({
        eta: '-- MIN', distance: '-- KM', isLive: false, driver: null, busLocation: null, stopLocation: null
    });
    const [attendance, setAttendance] = useState([]);
    const [newsletters, setNewsletters] = useState([]);
    const [loading, setLoading] = useState(true);

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const fetchData = async () => {
        try {
            const [dashRes, attRes, newsRes] = await Promise.all([
                api.get('/parent/dashboard'),
                api.get('/parent/attendance'),
                api.get('/parent/newsletters')
            ]);
            setMetrics(dashRes.data);
            setAttendance(attRes.data);
            setNewsletters(newsRes.data);
        } catch (err) {
            console.error('Failed to fetch parent dashboard data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login', { replace: true });
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-cyan-400 font-bold uppercase tracking-widest text-sm animate-pulse">Establishing Secure Uplink...</div>;
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-4">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLogout}
                        className="w-14 h-14 rounded-full border-2 border-red-500/50 p-1 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.2)] group hover:border-red-500 transition-colors bg-[#0A1121] shrink-0"
                    >
                        <div className="w-full h-full rounded-full flex items-center justify-center group-hover:bg-red-500/10 transition-colors">
                            <LogOut className="text-red-400 group-hover:text-red-500 transition-colors" />
                        </div>
                    </motion.button>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold font-brand text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wide">
                            PARENT PORTAL
                        </h2>
                        <p className="text-cyan-600/80 font-bold tracking-widest text-[10px] sm:text-xs uppercase mt-0.5">
                            MONITORING LINK: {user.name} ({user.roll_number})
                        </p>
                    </div>
                </div>
            </header>

            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats */}
                <motion.div variants={itemVariants} className="glass p-5 border-t-[3px] border-t-cyan-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 blur-[30px] rounded-full"></div>
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <Clock size={20} className="text-cyan-400" />
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Estimated Arrival</span>
                    </div>
                    <div className="text-3xl font-black text-white relative z-10 tracking-tight">{metrics.eta}</div>
                </motion.div>
                
                <motion.div variants={itemVariants} className="glass p-5 border-t-[3px] border-t-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-[30px] rounded-full"></div>
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <Navigation size={20} className="text-blue-400" />
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Distance Vector</span>
                    </div>
                    <div className="text-3xl font-black text-white relative z-10 tracking-tight">{metrics.distance}</div>
                </motion.div>
                
                <motion.div variants={itemVariants} className="glass p-5 border-t-[3px] border-t-purple-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 blur-[30px] rounded-full"></div>
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <User size={20} className="text-purple-400" />
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Assigned Pilot</span>
                    </div>
                    <div className="text-xl font-bold text-white relative z-10 tracking-tight truncate pb-1">
                        {metrics.driver?.name || 'Pending'}
                    </div>
                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-widest relative z-10">
                        UNIT: {metrics.driver?.bus_number || 'UNKNOWN'}
                    </div>
                </motion.div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Live Map */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="glass flex flex-col overflow-hidden border border-slate-700/50 shadow-[0_0_30px_rgba(14,165,233,0.1)] p-[2px]">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#050B14]">
                        <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                            <MapPin size={16} /> Live Transport Tracking
                        </h3>
                        {metrics.isLive ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">Live Link Active</span>
                        ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-slate-500/20 text-slate-400 border border-slate-500/30">Offline</span>
                        )}
                    </div>
                    <div className="h-[350px] relative w-full bg-slate-900">
                        {metrics.isLive && metrics.busLocation ? (
                            <CobusMap 
                                busLocation={metrics.busLocation} 
                                targetStop={metrics.stopLocation ? { lat: metrics.stopLocation.latitude, lng: metrics.stopLocation.longitude, stop_name: "Assigned Stop" } : null} 
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs font-bold uppercase tracking-widest">Awaiting GPS Lock...</div>
                        )}
                    </div>
                </motion.div>

                {/* Newsletters & Attendance */}
                <div className="space-y-6 flex flex-col flex-1 h-full">
                    {/* Communications Module */}
                    <div className="glass border border-slate-700/50 flex-1 max-h-[350px] flex flex-col">
                        <div className="p-4 border-b border-slate-800">
                            <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                                <AlertCircle size={16} /> Official Newsletters
                            </h3>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-4">
                            {newsletters.length === 0 ? (
                                <p className="text-xs font-bold text-slate-500 text-center py-4">No recent communications.</p>
                            ) : (
                                newsletters.map(n => (
                                    <div key={n.id} className="p-3 bg-slate-800/50 rounded border border-slate-700 hover:border-blue-500/30 transition-colors">
                                        <h4 className="text-sm font-bold text-white leading-tight mb-1">{n.title}</h4>
                                        <p className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">{n.message}</p>
                                        <div className="text-[10px] text-blue-400/60 font-bold uppercase tracking-widest mt-3">
                                            {new Date(n.sent_at).toLocaleString()}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Attendance Module */}
                    <div className="glass border border-slate-700/50 flex-1 flex flex-col">
                        <div className="p-4 items-center flex justify-between border-b border-slate-800">
                            <h3 className="text-sm font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={16} /> Attendance Log
                            </h3>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Last 30 Days</div>
                        </div>
                        <div className="overflow-y-auto max-h-[250px]">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-800 sticky top-0 bg-[#050B14] z-10">
                                        <th className="py-2 px-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Date</th>
                                        <th className="py-2 px-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Status</th>
                                        <th className="py-2 px-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Method</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendance.length === 0 ? (
                                        <tr><td colSpan="3" className="py-4 text-center text-slate-500 font-bold">No records found.</td></tr>
                                    ) : (
                                        attendance.map((a, i) => (
                                            <tr key={i} className="border-b border-slate-800/50 hover:bg-white/5 transition-colors">
                                                <td className="py-2.5 px-4 font-mono text-slate-300">{new Date(a.date).toLocaleDateString()}</td>
                                                <td className="py-2.5 px-4">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                                                        a.status === 'Present' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                        a.status === 'Absent' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                        'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                                    }`}>{a.status}</span>
                                                </td>
                                                <td className="py-2.5 px-4 text-slate-500 text-[10px] uppercase tracking-widest truncate max-w-[100px]">{a.verification_method}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ParentDashboard;
