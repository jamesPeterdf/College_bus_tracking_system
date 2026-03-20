import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Truck, ShieldCheck, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const Login = () => {
    const [role, setRole] = useState('student'); // student, driver, admin
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = { password };
            if (role === 'student') payload.roll_number = identifier;
            else if (role === 'driver') payload.driver_code = identifier;
            else if (role === 'admin') payload.email = identifier;

            const res = await api.post(`/auth/${role}/login`, payload);

            // Store auth tokens & user data
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            localStorage.setItem('role', role);

            // Navigate to actual dashboard
            navigate(`/${role}`);
        } catch (err) {
            console.error('Login error:', err);
            toast.error(err.response?.data?.message || 'UPLINK FAILED: VERIFY CREDENTIALS');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-deepBlue/20 rounded-full blur-[120px] pointer-events-none"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.8, bounce: 0.3 }}
                className="max-w-md w-full glass p-8 sm:p-10 space-y-8 relative z-10 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] rounded bg-[#0A1121]/90 backdrop-blur-xl"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400"></div>

                <div className="text-center space-y-2">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-5xl font-black font-brand bg-gradient-to-br from-cyan-400 to-blue-500 bg-clip-text text-transparent pb-1 tracking-wider drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    >
                        COBUS
                    </motion.h1>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center justify-center gap-2 text-cyan-500 font-bold font-inter uppercase tracking-[0.2em] text-[10px]"
                    >
                        <div className="w-8 h-[1px] bg-cyan-500/50"></div>
                        CENTRAL COMMAND PROTOCOL
                        <div className="w-8 h-[1px] bg-cyan-500/50"></div>
                    </motion.div>
                </div>

                <div className="flex justify-between p-1 bg-[#050B14] rounded border border-slate-800 shadow-inner">
                    {[
                        { id: 'student', icon: User, label: 'STUDENT' },
                        { id: 'driver', icon: Truck, label: 'PILOT' },
                        { id: 'admin', icon: ShieldCheck, label: 'COMMAND' }
                    ].map((item) => (
                        <motion.button
                            key={item.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => {
                                setRole(item.id);
                                setIdentifier('');
                                setPassword('');
                            }}
                            className={`flex flex-col items-center justify-center p-3 transition-all w-1/3 relative overflow-hidden rounded-sm ${role === item.id
                                ? 'text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)] bg-cyan-500/10 border border-cyan-500/50'
                                : 'text-slate-400 font-bold hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                                }`}
                        >
                            {role === item.id && (
                                <motion.div
                                    layoutId="loginTypeBg"
                                    className="absolute inset-0 bg-cyan-500/5 shadow-[inner_0_0_10px_rgba(6,182,212,0.3)]"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <item.icon size={20} className="relative z-10 mb-1.5" />
                            <span className="text-[10px] uppercase tracking-widest font-bold relative z-10">{item.label}</span>
                        </motion.button>
                    ))}
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold tracking-widest text-cyan-500 uppercase">
                                {role === 'student' ? 'Student ID (Roll)' : role === 'driver' ? 'Pilot ID (Callsign)' : 'Command ID (Email)'}
                            </label>
                            <div className="relative group">
                                <input
                                    type={role === 'admin' ? 'email' : 'text'}
                                    required
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    className="w-full bg-[#050B14]/60 backdrop-blur-md border border-slate-600 rounded-sm px-4 py-3.5 outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all text-white font-bold placeholder:text-slate-400 uppercase tracking-widest text-sm"
                                    placeholder={`INPUT ${role === 'student' ? 'STUDENT TAG' : role === 'driver' ? 'PILOT TAG' : 'COMMAND EMAIL'}`}
                                />
                                <div className="absolute inset-0 border border-cyan-400/0 group-focus-within:border-cyan-400/50 pointer-events-none rounded-sm transition-colors blur-[2px]"></div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold tracking-widest text-cyan-500 uppercase">
                                Access Code
                            </label>
                            <div className="relative group">
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#050B14]/60 backdrop-blur-md border border-slate-600 rounded-sm px-4 py-3.5 outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all text-white font-bold tracking-[0.3em] placeholder:tracking-widest placeholder:text-slate-400 text-sm"
                                    placeholder="••••••••"
                                />
                                <div className="absolute inset-0 border border-cyan-400/0 group-focus-within:border-cyan-400/50 pointer-events-none rounded-sm transition-colors blur-[2px]"></div>
                            </div>
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={loading}
                        className="w-full relative overflow-hidden group bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 font-brand font-black p-4 rounded-sm flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:bg-cyan-400 hover:text-[#050B14] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] uppercase tracking-widest text-sm"
                    >
                        <div className="relative z-10 flex items-center gap-3">
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin group-hover:border-[#050B14] group-hover:border-t-transparent"></div>
                                    VERIFYING UPLINK...
                                </>
                            ) : (
                                <>
                                    <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                                    INITIALIZE UPLINK
                                </>
                            )}
                        </div>
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
};

export default Login;
