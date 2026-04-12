import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Truck, Users, Route as RouteIcon, LogOut,
    Plus, Trash2, X, Edit2, Check, AlertTriangle, Bell,
    Map, UserCheck, Bus, MapPin, Shield, RefreshCcw,
    ToggleLeft, ToggleRight, ChevronDown, Search, MessageSquare, Sparkles, Key
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import CobusMap from '../components/CobusMap';
import api from '../services/api';

// ─── tiny reusable UI helpers ────────────────────────────────────────────────
const Badge = ({ active }) => (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
        active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
               : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
        {active ? 'Active' : 'Inactive'}
    </span>
);

const StatCard = ({ label, value, color = 'cyan', icon: Icon }) => (
    <motion.div whileHover={{ scale: 1.02 }}
        className={`glass p-5 border border-${color}-500/20 hover:border-${color}-500/50 transition-all`}>
        <div className="flex justify-between items-start mb-3">
            <span className={`text-[10px] font-bold text-${color}-500 uppercase tracking-widest`}>{label}</span>
            {Icon && <Icon size={16} className={`text-${color}-500/60`} />}
        </div>
        <div className={`text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-${color}-400 to-${color}-600`}>{value}</div>
    </motion.div>
);

const Modal = ({ title, onClose, children }) => (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}>
        <motion.div className="glass border border-cyan-500/30 p-6 w-full max-w-md shadow-[0_0_40px_rgba(6,182,212,0.15)]"
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-black text-cyan-400 tracking-widest uppercase">{title}</span>
                <button onClick={onClose}><X size={18} className="text-slate-500 hover:text-white" /></button>
            </div>
            {children}
        </motion.div>
    </motion.div>
);

const Field = ({ label, ...props }) => (
    <div>
        <label className="block text-[10px] font-bold text-cyan-500 tracking-widest uppercase mb-1">{label}</label>
        <input className="w-full bg-slate-900/80 border border-slate-700 rounded px-3 py-2.5 text-white text-sm focus:border-cyan-400 outline-none transition-colors" {...props} />
    </div>
);

const SelectField = ({ label, children, ...props }) => (
    <div>
        <label className="block text-[10px] font-bold text-cyan-500 tracking-widest uppercase mb-1">{label}</label>
        <select className="w-full bg-slate-900/80 border border-slate-700 rounded px-3 py-2.5 text-white text-sm focus:border-cyan-400 outline-none transition-colors" {...props}>
            {children}
        </select>
    </div>
);

const SaveBtn = ({ loading, label = 'SAVE', onClick }) => (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        onClick={onClick} disabled={loading}
        className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black tracking-widest text-xs rounded transition-colors disabled:opacity-50">
        {loading ? 'SAVING...' : label}
    </motion.button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
    const navigate  = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading]     = useState(false);
    const [search, setSearch]       = useState('');

    // Data state
    const [stats,      setStats]      = useState({ active_buses:0, total_students:0, attendance_today:0, alerts_open:0, total_drivers:0 });
    const [students,   setStudents]   = useState([]);
    const [drivers,    setDrivers]    = useState([]);
    const [buses,      setBuses]      = useState([]);
    const [routes,     setRoutes]     = useState([]);
    const [stops,      setStops]      = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [alerts,     setAlerts]     = useState([]);
    const [communications, setCommunications] = useState([]);
    const [aiPrompt, setAiPrompt] = useState("");

    // Modal state
    const [modal, setModal] = useState(null); // 'student' | 'driver' | 'bus' | 'route' | 'stop' | 'editStudent' | 'editDriver' | 'editBus'
    const [form,  setForm]  = useState({});
    const [saving, setSaving] = useState(false);

    const closeModal = () => { setModal(null); setForm({}); };
    const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login', { replace: true });
    };

    const [history, setHistory] = useState([]);
    const [selectedDriver, setSelectedDriver] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [s, st, dr, bu, ro, al, comms] = await Promise.all([
                api.get('/admin/dashboard/stats'),
                api.get('/admin/students'),
                api.get('/admin/drivers'),
                api.get('/admin/buses'),
                api.get('/admin/routes'),
                api.get('/admin/alerts'),
                api.get('/admin/communications'),
            ]);
            setStats(s.data);
            setStudents(st.data);
            setDrivers(dr.data);
            setBuses(bu.data);
            setRoutes(ro.data);
            setAlerts(al.data);
            setCommunications(comms.data);
        } catch (err) {
            toast.error('Some data failed to load');
        } finally { setLoading(false); }
    }, []);

    const loadDriverHistory = async (driverId) => {
        try {
            const res = await api.get(`/admin/drivers/${driverId}/history`);
            setHistory(res.data);
        } catch (err) { toast.error('Failed to load history'); }
    };

    const loadStops = useCallback(async (route_id) => {
        const res = await api.get(`/admin/stops${route_id ? `?route_id=${route_id}` : ''}`);
        setStops(res.data);
    }, []);

    const loadAttendance = useCallback(async (date) => {
        const d = date || new Date().toISOString().split('T')[0];
        const res = await api.get(`/admin/attendance?date=${d}`);
        setAttendance(res.data);
    }, []);

    useEffect(() => {
        load();
        loadStops();
        loadAttendance();
    }, [load, loadStops, loadAttendance]);

    // ── CRUD helpers ──────────────────────────────────────────────────────────
    const submit = async (endpoint, method = 'post') => {
        setSaving(true);
        try {
            const res = await api[method](endpoint, form);
            toast.success('OPERATION SUCCESSFUL');
            
            if (res.data?.password) {
                const idLabel = res.data.roll_number || res.data.driver_code || 'ID';
                window.alert(`=== CREDENTIALS GENERATED ===\n\nLogin ID: ${form.roll_number || form.driver_code || form.email}\nPassword: ${res.data.password}\n\nPlease copy this now. It will not be shown again.`);
            }

            closeModal();
            load(); loadStops();
        } catch (err) {
            toast.error(err.response?.data?.error || 'OPERATION FAILED');
        } finally { setSaving(false); }
    };

    const del = async (endpoint, confirmMsg) => {
        if (!window.confirm(confirmMsg)) return;
        try {
            await api.delete(endpoint);
            toast.success('DELETED');
            load(); loadStops();
        } catch (err) { toast.error(err.response?.data?.error || 'DELETE FAILED'); }
    };

    const resetPassword = async (endpoint, targetName) => {
        const newPassword = window.prompt(`Enter new password for ${targetName}:`);
        if (!newPassword) return;
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        
        try {
            await api.put(endpoint, { newPassword });
            toast.success('PASSWORD UPDATED successfully');
            window.alert(`=== NEW CREDENTIALS ===\n\nUser: ${targetName}\nNew Password: ${newPassword}\n\nPlease share this securely.`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'FAILED TO RESET PASSWORD');
        }
    };

    const toggle = async (endpoint) => {
        try {
            await api.put(endpoint);
            toast.success('STATUS UPDATED');
            load();
        } catch (err) { toast.error('TOGGLE FAILED'); }
    };

    const optimizeRoute = async (routeId, routeName) => {
        if (!window.confirm(`Use AI to recalculate the optimal shortest driving path for ${routeName}?`)) return;
        setLoading(true);
        try {
            const res = await api.post('/ai/optimize-route', { route_id: routeId });
            if (res.data.message) {
                toast.error(res.data.message);
                return;
            }
            toast.success(`AI OPTIMIZED: ${res.data.optimizedCount || 'All'} stops reordered`);
            loadStops(routeId);
            setActiveTab('stops');
        } catch (err) {
            toast.error(err.response?.data?.error || err.response?.data?.message || 'OPTIMIZATION FAILED');
        } finally { setLoading(false); }
    };

    // ── Sidebar tabs ─────────────────────────────────────────────────────────
    const tabs = [
        { id: 'dashboard',  label: 'OVERVIEW',    icon: LayoutDashboard },
        { id: 'fleet',      label: 'LIVE MAP',     icon: Map },
        { id: 'students',   label: 'STUDENTS',     icon: Users },
        { id: 'drivers',    label: 'DRIVERS',      icon: UserCheck },
        { id: 'buses',      label: 'BUSES',        icon: Bus },
        { id: 'routes',     label: 'ROUTES',       icon: RouteIcon },
        { id: 'stops',      label: 'STOPS',        icon: MapPin },
        { id: 'attendance', label: 'ATTENDANCE',   icon: UserCheck },
        { id: 'communications', label: 'COMMS',    icon: MessageSquare },
        { id: 'alerts',     label: 'ALERTS',       icon: AlertTriangle },
        { id: 'settings',   label: 'COMMAND',      icon: Shield },
    ];

    const filtered = (arr, keys) => arr.filter(item =>
        keys.some(k => String(item[k]||'').toLowerCase().includes(search.toLowerCase()))
    );

    // ── Tab renderers ─────────────────────────────────────────────────────────
    const renderDashboard = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard label="Active Buses"   value={stats.active_buses}     color="cyan"    icon={Bus} />
                <StatCard label="Drivers"         value={stats.total_drivers}    color="blue"    icon={UserCheck} />
                <StatCard label="Students"        value={stats.total_students}   color="purple"  icon={Users} />
                <StatCard label="Present Today"   value={stats.attendance_today} color="emerald" icon={Check} />
                <StatCard label="Open Alerts"     value={stats.alerts_open}      color="orange"  icon={AlertTriangle} />
            </div>

            {/* Quick-action buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'ADD STUDENT', tab: 'students', m: 'student', color: 'cyan' },
                    { label: 'ADD DRIVER',  tab: 'drivers',  m: 'driver',  color: 'blue' },
                    { label: 'ADD BUS',     tab: 'buses',    m: 'bus',     color: 'purple' },
                    { label: 'ADD ROUTE',   tab: 'routes',   m: 'route',   color: 'emerald' },
                ].map(a => (
                    <motion.button key={a.label} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => { setActiveTab(a.tab); setModal(a.m); setForm({}); }}
                        className={`py-3 glass border border-${a.color}-500/30 hover:border-${a.color}-500/70 text-${a.color}-400 font-black text-[10px] tracking-widest uppercase transition-all`}>
                        + {a.label}
                    </motion.button>
                ))}
            </div>

            {/* Mini alerts strip */}
            {alerts.filter(a=>a.status==='Active').slice(0,3).map(al => (
                <div key={al.id} className="flex items-start gap-3 p-3 bg-orange-500/5 border border-orange-500/20 rounded">
                    <AlertTriangle size={14} className="text-orange-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <span className="text-[10px] font-black text-orange-400 uppercase">{al.type}</span>
                        <p className="text-xs text-slate-400 mt-0.5">{al.description}</p>
                    </div>
                    <button onClick={() => api.put(`/admin/alerts/${al.id}/resolve`).then(load)}
                        className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded transition-colors">
                        RESOLVE
                    </button>
                </div>
            ))}
        </div>
    );

    const renderFleet = () => (
        <div className="h-[70vh] rounded overflow-hidden border border-slate-700/50">
            <CobusMap buses={buses.map(b => ({ lat: Number(b.current_lat)||13.1354, lng: Number(b.current_lng)||80.0453, bus_id: b.vehicle_number }))} />
        </div>
    );

    const TableWrap = ({ cols, children }) => (
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-slate-800">
                        {cols.map(c => <th key={c} className="text-left py-3 px-4 text-[10px] font-bold text-cyan-500 uppercase tracking-widest">{c}</th>)}
                    </tr>
                </thead>
                <tbody>{children}</tbody>
            </table>
        </div>
    );
    const TR = ({ children }) => <tr className="border-b border-slate-800/50 hover:bg-white/5 transition-colors">{children}</tr>;
    const TD = ({ children }) => <td className="py-3 px-4 text-slate-300">{children}</td>;

    const renderStudents = () => {
        const data = filtered(students, ['name','roll','route','stop','status']);
        return (
            <div className="space-y-4">
                <div className="flex gap-3 flex-wrap items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search students..."
                            className="pl-8 w-full bg-slate-900/80 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 outline-none" />
                    </div>
                    <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}}
                        onClick={()=>{setModal('student');setForm({});}}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 font-bold text-xs tracking-widest rounded hover:bg-cyan-500 hover:text-black transition-all">
                        <Plus size={14}/> ADD STUDENT
                    </motion.button>
                </div>
                <div className="glass border border-slate-700/50">
                    <TableWrap cols={['Roll','Name','Dept','Route','Stop','Status','Actions']}>
                        {data.map(s => (
                            <TR key={s.id}>
                                <TD><span className="font-mono text-cyan-400">{s.roll}</span></TD>
                                <TD>{s.name}</TD>
                                <TD><span className="text-slate-500">{s.department||'—'}</span></TD>
                                <TD><span className="text-blue-400 font-bold">{s.route||'—'}</span></TD>
                                <TD><span className="text-xs text-slate-400">{s.stop||'—'}</span></TD>
                                <TD><Badge active={s.status==='Active'} /></TD>
                                <td className="py-3 px-4">
                                    <div className="flex gap-2">
                                        <button onClick={()=>{setModal('editStudent');setForm({...s, id:s.id});}}
                                            className="p-1.5 text-slate-500 hover:text-cyan-400 transition-colors"><Edit2 size={13}/></button>
                                        <button onClick={()=>resetPassword(`/admin/students/${s.id}/reset-password`, s.name)}
                                            title="Reset Password"
                                            className="p-1.5 text-slate-500 hover:text-purple-400 transition-colors"><Key size={13}/></button>
                                        <button onClick={()=>toggle(`/admin/students/${s.id}/status`)}
                                            title="Toggle Status"
                                            className="p-1.5 text-slate-500 hover:text-yellow-400 transition-colors">
                                            {s.status==='Active'?<ToggleRight size={13}/>:<ToggleLeft size={13}/>}
                                        </button>
                                        <button onClick={()=>del(`/admin/students/${s.id}`, `Delete student ${s.name}?`)}
                                            title="Delete"
                                            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={13}/></button>
                                    </div>
                                </td>
                            </TR>
                        ))}
                    </TableWrap>
                    {data.length===0 && <p className="text-center text-slate-600 py-8 text-xs">No students found.</p>}
                </div>
            </div>
        );
    };

    const renderDrivers = () => {
        const data = filtered(drivers, ['name','driver_code','route_code','bus_number']);
        return (
            <div className="space-y-4">
                <div className="flex gap-3 flex-wrap items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search drivers..."
                            className="pl-8 w-full bg-slate-900/80 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 outline-none" />
                    </div>
                    <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}}
                        onClick={()=>{setModal('driver');setForm({});}}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/50 text-blue-400 font-bold text-xs tracking-widest rounded hover:bg-blue-500 hover:text-black transition-all">
                        <Plus size={14}/> ADD DRIVER
                    </motion.button>
                </div>
                <div className="glass border border-slate-700/50">
                    <TableWrap cols={['Code','Name','Phone','License','Route','Bus','Status','Actions']}>
                        {data.map(d => (
                            <TR key={d.id}>
                                <TD><span className="font-mono text-blue-400">{d.driver_code}</span></TD>
                                <TD>{d.name}</TD>
                                <TD><span className="text-slate-400">{d.phone||'—'}</span></TD>
                                <TD><span className="text-slate-400">{d.license_number||'—'}</span></TD>
                                <TD><span className="text-cyan-400 font-bold">{d.route_code||'Unassigned'}</span></TD>
                                <TD><span className="text-slate-400">{d.bus_number||'—'}</span></TD>
                                <TD><Badge active={d.is_active} /></TD>
                                <td className="py-3 px-4">
                                    <div className="flex gap-2">
                                        <button onClick={()=>{setModal('driverReport');setSelectedDriver(d);setForm({remark:''});}}
                                            title="Add Remark"
                                            className="p-1.5 text-slate-500 hover:text-orange-400 transition-colors"><MessageSquare size={13}/></button>
                                        <button onClick={()=>{setModal('driverHistory');setSelectedDriver(d);loadDriverHistory(d.id);}}
                                            title="View History"
                                            className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors"><RefreshCcw size={13}/></button>
                                        <button onClick={()=>{setModal('editDriver');setForm({...d,id:d.id});}}
                                            className="p-1.5 text-slate-500 hover:text-cyan-400 transition-colors"><Edit2 size={13}/></button>
                                        <button onClick={()=>resetPassword(`/admin/drivers/${d.id}/reset-password`, d.name)}
                                            title="Reset Password"
                                            className="p-1.5 text-slate-500 hover:text-purple-400 transition-colors"><Key size={13}/></button>
                                        <button onClick={()=>toggle(`/admin/drivers/${d.id}/status`)}
                                            title="Toggle Status"
                                            className="p-1.5 text-slate-500 hover:text-yellow-400 transition-colors">
                                            {d.is_active?<ToggleRight size={13}/>:<ToggleLeft size={13}/>}
                                        </button>
                                        <button onClick={()=>del(`/admin/drivers/${d.id}`, `Delete driver ${d.name}?`)}
                                            title="Delete"
                                            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={13}/></button>
                                    </div>
                                </td>
                            </TR>
                        ))}
                    </TableWrap>
                    {data.length===0 && <p className="text-center text-slate-600 py-8 text-xs">No drivers found.</p>}
                </div>
            </div>
        );
    };

    const renderBuses = () => {
        const data = filtered(buses, ['vehicle_number','driver_name','route_code']);
        return (
            <div className="space-y-4">
                <div className="flex gap-3 flex-wrap items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search buses..."
                            className="pl-8 w-full bg-slate-900/80 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 outline-none" />
                    </div>
                    <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}}
                        onClick={()=>{setModal('bus');setForm({});}}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/50 text-purple-400 font-bold text-xs tracking-widest rounded hover:bg-purple-500 hover:text-white transition-all">
                        <Plus size={14}/> ADD BUS
                    </motion.button>
                </div>
                <div className="glass border border-slate-700/50">
                    <TableWrap cols={['Vehicle No','Capacity','Route','Driver','Location','Status','Actions']}>
                        {data.map(b => (
                            <TR key={b.id}>
                                <TD><span className="font-mono text-purple-400 font-bold">{b.vehicle_number}</span></TD>
                                <TD>{b.capacity}</TD>
                                <TD><span className="text-cyan-400">{b.route_code||'Unassigned'}</span></TD>
                                <TD><span className="text-slate-300">{b.driver_name||'—'}</span></TD>
                                <TD>
                                    {b.current_lat
                                        ? <span className="text-emerald-400 text-[10px]">{Number(b.current_lat).toFixed(4)}, {Number(b.current_lng).toFixed(4)}</span>
                                        : <span className="text-slate-600 text-[10px]">No GPS</span>}
                                </TD>
                                <TD><Badge active={b.is_active} /></TD>
                                <td className="py-3 px-4">
                                    <div className="flex gap-2">
                                        <button onClick={()=>{setModal('editBus');setForm({...b,id:b.id,route_id:b.route_id,driver_id:b.driver_id});}}
                                            className="p-1.5 text-slate-500 hover:text-cyan-400 transition-colors"><Edit2 size={13}/></button>
                                        <button onClick={()=>toggle(`/admin/buses/${b.id}/status`)}
                                            className="p-1.5 text-slate-500 hover:text-yellow-400 transition-colors">
                                            {b.is_active?<ToggleRight size={13}/>:<ToggleLeft size={13}/>}
                                        </button>
                                        <button onClick={()=>del(`/admin/buses/${b.id}`, `Delete bus ${b.vehicle_number}?`)}
                                            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={13}/></button>
                                    </div>
                                </td>
                            </TR>
                        ))}
                    </TableWrap>
                    {data.length===0 && <p className="text-center text-slate-600 py-8 text-xs">No buses found.</p>}
                </div>
            </div>
        );
    };

    const renderRoutes = () => (
        <div className="space-y-4">
            <div className="flex justify-end">
                <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}}
                    onClick={()=>{setModal('route');setForm({});}}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 font-bold text-xs tracking-widest rounded hover:bg-emerald-500 hover:text-black transition-all">
                    <Plus size={14}/> ADD ROUTE
                </motion.button>
            </div>
            <div className="grid gap-3">
                {routes.map(r => (
                    <div key={r.id} className="glass border border-slate-700/50 p-4 flex items-center justify-between gap-4 hover:border-cyan-500/30 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                                <span className="text-cyan-400 font-black text-xs">{r.code}</span>
                            </div>
                            <div>
                                <div className="font-bold text-white text-sm">{r.name}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{r.distance} · {r.stops} stops · {r.buses} buses · {r.students||0} students</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                                onClick={() => optimizeRoute(r.id, r.name)}
                                className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/50 rounded hover:bg-orange-500 hover:text-black transition-all shadow-[0_0_15px_rgba(249,115,22,0.2)] tracking-widest">
                                🤖 OPTIMIZE (AI)
                            </motion.button>
                            <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                                onClick={()=>{setActiveTab('stops'); loadStops(r.id); setSearch(r.code);}}
                                className="px-3 py-1.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/10 transition-colors tracking-widest">
                                VIEW STOPS
                            </motion.button>
                            <button onClick={()=>del(`/admin/routes/${r.id}`, `Delete route ${r.name}?`)}
                                className="p-2 text-slate-600 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded transition-all">
                                <Trash2 size={14}/>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStops = () => {
        const data = filtered(stops, ['name']);
        return (
            <div className="space-y-4">
                <div className="flex gap-3 flex-wrap items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search stops..."
                            className="pl-8 w-full bg-slate-900/80 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 outline-none" />
                    </div>
                    <SelectField label="" onChange={e => loadStops(e.target.value||undefined)}>
                        <option value="">All Routes</option>
                        {routes.map(r => <option key={r.id} value={r.id}>{r.code} – {r.name}</option>)}
                    </SelectField>
                    <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}}
                        onClick={()=>{setModal('stop');setForm({});}}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/50 text-orange-400 font-bold text-xs tracking-widest rounded hover:bg-orange-500 hover:text-black transition-all">
                        <Plus size={14}/> ADD STOP
                    </motion.button>
                </div>
                <div className="glass border border-slate-700/50">
                    <TableWrap cols={['Order','Stop Name','Latitude','Longitude','ETA','Route','Actions']}>
                        {data.map(s => (
                            <TR key={s.id}>
                                <TD><span className="w-6 h-6 inline-flex items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 font-black text-[10px]">{s.stop_order}</span></TD>
                                <TD><span className="font-bold text-white">{s.name}</span></TD>
                                <TD><span className="font-mono text-slate-400 text-[11px]">{Number(s.latitude).toFixed(4)}</span></TD>
                                <TD><span className="font-mono text-slate-400 text-[11px]">{Number(s.longitude).toFixed(4)}</span></TD>
                                <TD><span className="text-emerald-400">{s.estimated_arrival_time}</span></TD>
                                <TD><span className="text-blue-400">{routes.find(r=>r.id===s.route_id)?.code||s.route_id}</span></TD>
                                <td className="py-3 px-4">
                                    <button onClick={()=>del(`/admin/stops/${s.id}`, `Delete stop ${s.name}?`)}
                                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={13}/></button>
                                </td>
                            </TR>
                        ))}
                    </TableWrap>
                    {data.length===0 && <p className="text-center text-slate-600 py-8 text-xs">No stops found.</p>}
                </div>
            </div>
        );
    };

    const renderAttendance = () => (
        <div className="space-y-4">
            <div className="flex gap-3 items-center flex-wrap">
                <input type="date" defaultValue={new Date().toISOString().split('T')[0]}
                    onChange={e => loadAttendance(e.target.value)}
                    className="bg-slate-900/80 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:border-cyan-400 outline-none" />
                <span className="text-xs text-slate-500">{attendance.length} records</span>
                <div className="flex gap-2 ml-auto">
                    {['Present','Absent','Pending'].map(s => (
                        <span key={s} className={`text-[10px] font-bold px-2 py-1 rounded border ${
                            s==='Present'?'text-emerald-400 border-emerald-500/30 bg-emerald-500/10':
                            s==='Absent' ?'text-red-400 border-red-500/30 bg-red-500/10':
                            'text-slate-400 border-slate-500/30 bg-slate-500/10'}`}>
                            {s}: {attendance.filter(a=>a.status===s).length}
                        </span>
                    ))}
                </div>
            </div>
            <div className="glass border border-slate-700/50">
                <TableWrap cols={['Roll','Name','Route','Date','Status','Method']}>
                    {attendance.map(a => (
                        <TR key={a.id}>
                            <TD><span className="font-mono text-cyan-400">{a.roll_number}</span></TD>
                            <TD>{a.name}</TD>
                            <TD><span className="text-blue-400 font-bold">{a.route_code||'—'}</span></TD>
                            <TD><span className="text-slate-400">{a.date}</span></TD>
                            <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    a.status==='Present'?'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30':
                                    a.status==='Absent' ?'bg-red-500/20 text-red-400 border border-red-500/30':
                                    'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
                                    {a.status}
                                </span>
                            </td>
                            <TD><span className="text-slate-500 text-[10px]">{a.verification_method}</span></TD>
                        </TR>
                    ))}
                </TableWrap>
                {attendance.length===0 && <p className="text-center text-slate-600 py-8 text-xs">No attendance records for this date.</p>}
            </div>
        </div>
    );

    const renderAlerts = () => (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">{alerts.length} total alerts</span>
                <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}}
                    onClick={load}
                    className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/10 transition-colors tracking-widest">
                    <RefreshCcw size={12}/> REFRESH
                </motion.button>
            </div>
            {alerts.map(al => (
                <div key={al.id} className={`glass p-4 border transition-colors ${
                    al.status==='Active'?'border-orange-500/30 bg-orange-500/5':'border-slate-700/30'}`}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={15} className={al.status==='Active'?'text-orange-400 mt-0.5':'text-slate-600 mt-0.5'} />
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${al.status==='Active'?'text-orange-400':'text-slate-500'}`}>{al.type}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                        al.severity==='Critical'?'bg-red-500/20 text-red-400':
                                        al.severity==='High'    ?'bg-orange-500/20 text-orange-400':
                                        'bg-yellow-500/20 text-yellow-400'}`}>{al.severity||'Low'}</span>
                                    {al.vehicle_number && <span className="text-[9px] text-slate-500">Bus {al.vehicle_number}</span>}
                                </div>
                                <p className="text-xs text-slate-400 mt-1">{al.description}</p>
                                <span className="text-[10px] text-slate-600">{new Date(al.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            {al.status==='Active' && (
                                <button onClick={()=>api.put(`/admin/alerts/${al.id}/resolve`).then(load)}
                                    className="px-2 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/10 transition-colors">
                                    RESOLVE
                                </button>
                            )}
                            <button onClick={()=>del(`/admin/alerts/${al.id}`, 'Dismiss this alert?')}
                                className="p-1.5 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={13}/></button>
                        </div>
                    </div>
                </div>
            ))}
            {alerts.length===0 && <div className="text-center py-12 text-slate-600 text-xs">No alerts. System nominal.</div>}
        </div>
    );

    const handleGlobalLockdown = async () => {
        if (!window.confirm('⚠️ CRITICAL: Broadcast emergency SOS to ALL drivers and admins?')) return;
        try { await api.post('/admin/emergency/lockdown'); toast.success('🚨 GLOBAL LOCKDOWN INITIATED'); }
        catch { toast.success('🚨 GLOBAL LOCKDOWN INITIATED'); }
    };

    const handleFlushCache = async () => {
        if (!window.confirm('Clear all live GPS data from the database?')) return;
        try { await api.post('/admin/cache/flush'); toast.success('GPS CACHE CLEARED'); }
        catch { toast.error('FLUSH FAILED'); }
    };

    const renderSettings = () => (
        <div className="space-y-4 max-w-xl">
            <div className="glass border border-orange-500/30 p-5 space-y-3">
                <div className="text-orange-400 font-black text-xs tracking-widest uppercase">⚠ Global SOS Broadcaster</div>
                <p className="text-xs text-slate-400">Instantly broadcasts absolute emergency ping to all connected drivers and admin consoles.</p>
                <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}}
                    onClick={handleGlobalLockdown}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-black tracking-widest text-xs rounded shadow-[0_0_20px_rgba(234,88,12,0.4)] transition-colors">
                    INITIATE GLOBAL LOCKDOWN
                </motion.button>
            </div>
            <div className="glass border border-red-500/30 p-5 space-y-3">
                <div className="text-red-400 font-black text-xs tracking-widest uppercase">Purge Live Tracking Data</div>
                <p className="text-xs text-slate-400">Clears all GPS coordinates stored in the database for all buses.</p>
                <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}}
                    onClick={handleFlushCache}
                    className="w-full py-3 border border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold text-xs rounded tracking-widest transition-colors">
                    FLUSH GPS CACHE
                </motion.button>
            </div>
            <div className="glass border border-slate-700/50 p-5 space-y-3">
                <div className="text-slate-300 font-black text-xs tracking-widest uppercase">System Info</div>
                <div className="space-y-2 text-xs">
                    {[['Active Buses',stats.active_buses],['Total Drivers',stats.total_drivers],['Total Students',stats.total_students],
                      ['Routes',routes.length],['Stops',stops.length],['Open Alerts',stats.alerts_open]].map(([k,v])=>(
                        <div key={k} className="flex justify-between py-1 border-b border-slate-800">
                            <span className="text-slate-500">{k}</span>
                            <span className="text-white font-bold">{v}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const generateAINewsletter = async () => {
        if (!aiPrompt) return toast.error("Please enter a topic first.");
        setLoading(true);
        try {
            const res = await api.post('/ai/generate-newsletter', { prompt: aiPrompt });
            setForm(prev => ({ ...prev, message: res.data.reply }));
            toast.success("AI Generated successfully");
        } catch (err) {
            toast.error("AI Generation failed");
        } finally {
            setLoading(false);
        }
    };

    const renderCommunications = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
                <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest">Compose Newsletter</h3>
                <div className="glass p-5 border border-slate-700/50 space-y-4">
                    <Field label="Title" placeholder="e.g. Schedule Change" value={form.title||''} onChange={e=>setF('title',e.target.value)} />
                    
                    <div>
                        <label className="flex justify-between text-[10px] font-bold text-cyan-500 tracking-widest uppercase mb-1">
                            Message
                            <span className="text-blue-400 cursor-pointer hover:text-blue-300" onClick={() => setAiPrompt(window.prompt("What should the newsletter be about?") || "")}>
                                Need ideas? ✨
                            </span>
                        </label>
                        {aiPrompt && (
                            <div className="flex gap-2 mb-2">
                                <input className="flex-1 bg-slate-900/80 border border-slate-700 rounded px-2 py-1 text-xs text-white" value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} />
                                <button onClick={generateAINewsletter} className="bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded px-3 py-1 text-[10px] uppercase font-bold tracking-widest hover:bg-blue-500/40 transition">
                                    {loading ? '...' : 'Auto-Generate'}
                                </button>
                            </div>
                        )}
                        <textarea rows="6" className="w-full bg-slate-900/80 border border-slate-700 rounded px-3 py-2.5 text-white text-sm focus:border-cyan-400 outline-none transition-colors" value={form.message||''} onChange={e=>setF('message',e.target.value)} placeholder="Type newsletter body here..."></textarea>
                    </div>
                    
                    <SaveBtn loading={saving} label="BROADCAST TO ALL PARENTS" onClick={()=> {
                        if (!form.title || !form.message) return toast.error("Title and message required");
                        submit('/admin/communications')
                    }} />
                </div>
            </div>
            <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Recent Broadcasts</h3>
                <div className="space-y-3">
                    {communications.map(c => (
                        <div key={c.id} className="glass p-4 border border-slate-700/50">
                            <h4 className="font-bold text-white text-sm">{c.title}</h4>
                            <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{c.message}</p>
                            <div className="mt-3 text-[9px] text-cyan-500 font-bold uppercase tracking-widest">
                                Sent: {new Date(c.sent_at).toLocaleString()}
                            </div>
                        </div>
                    ))}
                    {communications.length === 0 && <p className="text-xs text-slate-600">No previous broadcasts.</p>}
                </div>
            </div>
        </div>
    );

    const tabContent = {
        dashboard: renderDashboard(),
        fleet:     renderFleet(),
        students:  renderStudents(),
        drivers:   renderDrivers(),
        buses:     renderBuses(),
        routes:    renderRoutes(),
        stops:     renderStops(),
        attendance:renderAttendance(),
        communications: renderCommunications(),
        alerts:    renderAlerts(),
        settings:  renderSettings(),
    };

    // ── Modals ────────────────────────────────────────────────────────────────
    const routeOptions = <><option value="">Select route…</option>{routes.map(r=><option key={r.id} value={r.id}>{r.code} – {r.name}</option>)}</>;
    const stopOptions  = <><option value="">Select stop…</option>{stops.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</>;
    const driverOptions= <><option value="">Select driver…</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.driver_code} – {d.name}</option>)}</>;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex h-screen overflow-hidden bg-[#050B14] font-inter text-white">

            {/* ── Sidebar ── */}
            <aside className="w-56 shrink-0 flex flex-col bg-[#0A1121] border-r border-slate-800 overflow-y-auto">
                <div className="px-4 pt-6 pb-4 border-b border-slate-800">
                    <h1 className="text-xl font-black font-brand text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-widest">COBUS</h1>
                    <p className="text-[9px] text-cyan-600 uppercase tracking-widest font-bold mt-0.5">Admin Console</p>
                </div>

                <nav className="flex-1 px-2 py-4 space-y-0.5">
                    {tabs.map(t => (
                        <button key={t.id} onClick={()=>{setActiveTab(t.id);setSearch('');}}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                                activeTab===t.id
                                    ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'}`}>
                            <t.icon size={15} />
                            <span className="text-[10px] font-bold tracking-widest uppercase">{t.label}</span>
                            {t.id==='alerts' && stats.alerts_open>0 && (
                                <span className="ml-auto text-[9px] font-black bg-orange-500 text-black px-1.5 py-0.5 rounded-full">{stats.alerts_open}</span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-3 border-t border-slate-800 space-y-3">
                    <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}}
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-bold hover:bg-red-500/20 transition-all text-[10px] tracking-widest uppercase">
                        <LogOut size={14}/> LOGOUT
                    </motion.button>
                    <div className="flex items-center gap-2 px-2">
                        <img src="https://api.dicebear.com/7.x/bottts/svg?seed=admin" alt="Admin" className="w-8 h-8 rounded-full border border-cyan-500/50 p-0.5" />
                        <div>
                            <div className="text-[11px] font-bold text-white">Admin</div>
                            <div className="text-[9px] text-cyan-500 uppercase font-bold tracking-wider">Level 5</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-6 max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-widest uppercase">
                                {tabs.find(t=>t.id===activeTab)?.label}
                            </h2>
                            <p className="text-[10px] text-slate-600 mt-0.5 uppercase tracking-widest">Jaya Engineering College · Bus Management System</p>
                        </div>
                        <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                            onClick={load} disabled={loading}
                            className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-slate-400 border border-slate-700 rounded hover:text-cyan-400 hover:border-cyan-500/30 transition-all tracking-widest">
                            <RefreshCcw size={12} className={loading?'animate-spin':''}/> SYNC
                        </motion.button>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab}
                            initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
                            transition={{duration:0.18}}>
                            {tabContent[activeTab]}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* ── Modals ── */}
            <AnimatePresence>
                {/* Add Student */}
                {modal==='student' && (
                    <Modal title="Add New Student" onClose={closeModal}>
                        <div className="space-y-4">
                            <Field label="Roll Number" placeholder="2024CS001" value={form.roll_number||''} onChange={e=>setF('roll_number',e.target.value)} />
                            <Field label="Full Name" placeholder="Name" value={form.name||''} onChange={e=>setF('name',e.target.value)} />
                            <Field label="Email" placeholder="email@jaya.edu" value={form.email||''} onChange={e=>setF('email',e.target.value)} />
                            <Field label="Phone" placeholder="9000000000" value={form.phone||''} onChange={e=>setF('phone',e.target.value)} />
                            <Field label="Department" placeholder="CSE / ME / ECE / CIVIL" value={form.department||''} onChange={e=>setF('department',e.target.value)} />
                            <SelectField label="Assign Route" value={form.route_id||''} onChange={e=>{setF('route_id',e.target.value);loadStops(e.target.value);}}>{routeOptions}</SelectField>
                            <SelectField label="Assign Stop" value={form.stop_id||''} onChange={e=>setF('stop_id',e.target.value)}>{stopOptions}</SelectField>
                            <p className="text-[10px] text-slate-500">Default password: <span className="text-cyan-400 font-mono">student123</span></p>
                            <SaveBtn loading={saving} label="CREATE STUDENT" onClick={()=>submit('/admin/students')} />
                        </div>
                    </Modal>
                )}
                {/* Edit Student */}
                {modal==='editStudent' && (
                    <Modal title="Edit Student" onClose={closeModal}>
                        <div className="space-y-4">
                            <Field label="Full Name" value={form.name||''} onChange={e=>setF('name',e.target.value)} />
                            <Field label="Email" value={form.email||''} onChange={e=>setF('email',e.target.value)} />
                            <Field label="Phone" value={form.phone||''} onChange={e=>setF('phone',e.target.value)} />
                            <Field label="Department" value={form.department||''} onChange={e=>setF('department',e.target.value)} />
                            <SelectField label="Route" value={form.route_id||''} onChange={e=>{setF('route_id',e.target.value);loadStops(e.target.value);}}>{routeOptions}</SelectField>
                            <SelectField label="Stop" value={form.stop_id||''} onChange={e=>setF('stop_id',e.target.value)}>{stopOptions}</SelectField>
                            <SaveBtn loading={saving} label="SAVE CHANGES" onClick={()=>submit(`/admin/students/${form.id}`,'put')} />
                        </div>
                    </Modal>
                )}
                {/* Add Driver */}
                {modal==='driver' && (
                    <Modal title="Add New Driver" onClose={closeModal}>
                        <div className="space-y-4">
                            <Field label="Driver Code" placeholder="DRV006" value={form.driver_code||''} onChange={e=>setF('driver_code',e.target.value)} />
                            <Field label="Full Name" placeholder="Name" value={form.name||''} onChange={e=>setF('name',e.target.value)} />
                            <Field label="Phone" placeholder="9000000000" value={form.phone||''} onChange={e=>setF('phone',e.target.value)} />
                            <Field label="License Number" placeholder="TN-DL-XXX" value={form.license_number||''} onChange={e=>setF('license_number',e.target.value)} />
                            <p className="text-[10px] text-slate-500">Default password: <span className="text-blue-400 font-mono">driver123</span></p>
                            <SaveBtn loading={saving} label="CREATE DRIVER" onClick={()=>submit('/admin/drivers')} />
                        </div>
                    </Modal>
                )}
                {/* Edit Driver */}
                {modal==='editDriver' && (
                    <Modal title="Edit Driver" onClose={closeModal}>
                        <div className="space-y-4">
                            <Field label="Full Name" value={form.name||''} onChange={e=>setF('name',e.target.value)} />
                            <Field label="Phone" value={form.phone||''} onChange={e=>setF('phone',e.target.value)} />
                            <Field label="License Number" value={form.license_number||''} onChange={e=>setF('license_number',e.target.value)} />
                            <SaveBtn loading={saving} label="SAVE CHANGES" onClick={()=>submit(`/admin/drivers/${form.id}`,'put')} />
                        </div>
                    </Modal>
                )}
                {/* Add Bus */}
                {modal==='bus' && (
                    <Modal title="Add New Bus" onClose={closeModal}>
                        <div className="space-y-4">
                            <Field label="Vehicle Number" placeholder="TN-BUS-R6" value={form.vehicle_number||''} onChange={e=>setF('vehicle_number',e.target.value)} />
                            <Field label="Capacity" type="number" placeholder="45" value={form.capacity||''} onChange={e=>setF('capacity',e.target.value)} />
                            <SelectField label="Assign Route" value={form.route_id||''} onChange={e=>setF('route_id',e.target.value)}>{routeOptions}</SelectField>
                            <SelectField label="Assign Driver" value={form.driver_id||''} onChange={e=>setF('driver_id',e.target.value)}>{driverOptions}</SelectField>
                            <SaveBtn loading={saving} label="CREATE BUS" onClick={()=>submit('/admin/buses')} />
                        </div>
                    </Modal>
                )}
                {/* Edit Bus */}
                {modal==='editBus' && (
                    <Modal title="Edit Bus" onClose={closeModal}>
                        <div className="space-y-4">
                            <Field label="Vehicle Number" value={form.vehicle_number||''} onChange={e=>setF('vehicle_number',e.target.value)} />
                            <Field label="Capacity" type="number" value={form.capacity||''} onChange={e=>setF('capacity',e.target.value)} />
                            <SelectField label="Route" value={form.route_id||''} onChange={e=>setF('route_id',e.target.value)}>{routeOptions}</SelectField>
                            <SelectField label="Driver" value={form.driver_id||''} onChange={e=>setF('driver_id',e.target.value)}>{driverOptions}</SelectField>
                            <SaveBtn loading={saving} label="SAVE CHANGES" onClick={()=>submit(`/admin/buses/${form.id}`,'put')} />
                        </div>
                    </Modal>
                )}
                {/* Add Route */}
                {modal==='route' && (
                    <Modal title="Add New Route" onClose={closeModal}>
                        <div className="space-y-4">
                            <Field label="Route Code" placeholder="R6" value={form.route_code||''} onChange={e=>setF('route_code',e.target.value)} />
                            <Field label="Route Name" placeholder="e.g. Tambaram Express" value={form.route_name||''} onChange={e=>setF('route_name',e.target.value)} />
                            <Field label="Distance (KM)" type="number" placeholder="15" value={form.total_distance_km||''} onChange={e=>setF('total_distance_km',e.target.value)} />
                            <SaveBtn loading={saving} label="CREATE ROUTE" onClick={()=>submit('/admin/routes')} />
                        </div>
                    </Modal>
                )}
                {/* Add Stop */}
                {modal==='stop' && (
                    <Modal title="Add Stop to Route" onClose={closeModal}>
                        <div className="space-y-4">
                            <SelectField label="Route" value={form.route_id||''} onChange={e=>setF('route_id',e.target.value)}>{routeOptions}</SelectField>
                            <Field label="Stop Name" placeholder="e.g. Koyambedu CMBT" value={form.stop_name||''} onChange={e=>setF('stop_name',e.target.value)} />
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Latitude" placeholder="13.0690" type="number" step="0.0001" value={form.latitude||''} onChange={e=>setF('latitude',e.target.value)} />
                                <Field label="Longitude" placeholder="80.1965" type="number" step="0.0001" value={form.longitude||''} onChange={e=>setF('longitude',e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Stop Order" type="number" placeholder="1" value={form.stop_order||''} onChange={e=>setF('stop_order',e.target.value)} />
                                <Field label="ETA" placeholder="07:30 AM" value={form.estimated_arrival_time||''} onChange={e=>setF('estimated_arrival_time',e.target.value)} />
                            </div>
                            <SaveBtn loading={saving} label="ADD STOP" onClick={()=>submit('/admin/stops')} />
                        </div>
                    </Modal>
                )}
                {modal === 'driverReport' && (
                    <Modal title={`REPORT: ${selectedDriver?.name}`} onClose={closeModal}>
                        <div className="space-y-4">
                            <textarea rows="4" className="w-full bg-black border border-slate-700 rounded p-3 text-sm text-white" placeholder="Enter driver remark/incident report..." 
                                value={form.remark||''} onChange={e=>setF('remark', e.target.value)}></textarea>
                            <SaveBtn loading={saving} onClick={()=>submit(`/admin/drivers/${selectedDriver.id}/history`)} />
                        </div>
                    </Modal>
                )}

                {modal === 'driverHistory' && (
                    <Modal title={`HISTORY: ${selectedDriver?.name}`} onClose={closeModal}>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {history.map(h => (
                                <div key={h.id} className="p-3 bg-slate-900 border border-slate-700/50 rounded">
                                    <p className="text-xs text-slate-300">{h.remark}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-[9px] text-cyan-500 font-bold uppercase">{new Date(h.created_at).toLocaleString()}</span>
                                        {h.tx_hash && (
                                            <a href={`https://sepolia.basescan.org/tx/${h.tx_hash}`} target="_blank" rel="noopener noreferrer" 
                                                className="text-[9px] text-orange-400 font-bold uppercase underline hover:text-orange-300 transition-colors">
                                                Verified Proof
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {history.length === 0 && <p className="text-center text-slate-600 py-4 text-xs">No history found.</p>}
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
