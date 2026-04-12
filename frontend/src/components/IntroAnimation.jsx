import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, School, Truck } from 'lucide-react';

const IntroAnimation = ({ onComplete }) => {
    const [phase, setPhase] = useState('logo'); // 'logo' -> 'exit'

    useEffect(() => {
        // Logo reveal holds for 3 seconds, then exit
        const exitTimer = setTimeout(() => setPhase('exit'), 3200);
        // Clean up and call onComplete to unmount
        const completeTimer = setTimeout(() => onComplete(), 4200);

        return () => {
            clearTimeout(exitTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <AnimatePresence>
            {phase !== 'exit' && (
                <motion.div
                    key="intro"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
                    transition={{ duration: 1.0, ease: "easeInOut" }}
                    className="fixed inset-0 z-[100] bg-[#020508] flex items-center justify-center overflow-hidden"
                >
                    {/* Background Cyber Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/20 to-transparent"></div>

                    {/* (Phase 1 removed per user request) */}

                    {/* Phase 2: Logo Reveal */}
                    <AnimatePresence>
                        {phase === 'logo' && (
                            <motion.div
                                key="logo"
                                initial={{ scale: 0.5, opacity: 0, filter: 'blur(20px)' }}
                                animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
                                transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                                className="absolute inset-0 flex flex-col items-center justify-center"
                            >
                                <motion.div
                                    animate={{ 
                                        boxShadow: ['0 0 20px rgba(34,211,238,0.2)', '0 0 80px rgba(34,211,238,0.6)', '0 0 20px rgba(34,211,238,0.2)'] 
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="w-32 h-32 rounded-3xl bg-[#0A1121] border border-cyan-400 flex items-center justify-center mb-6 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-cyan-400/20 blur-xl"></div>
                                    <Truck size={64} className="text-cyan-400 relative z-10" />
                                </motion.div>
                                <h1 className="text-5xl md:text-7xl font-brand font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-widest drop-shadow-[0_0_25px_rgba(34,211,238,0.6)]">
                                    COBUS
                                </h1>
                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.0, duration: 0.8 }}
                                    className="text-cyan-600 font-bold tracking-[0.3em] text-sm md:text-base uppercase mt-4"
                                >
                                    Next-Gen Transportation
                                </motion.p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default IntroAnimation;
