import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import IntroAnimation from './components/IntroAnimation';

function App() {
    const [showIntro, setShowIntro] = useState(true);

    return (
        <Router>
            <div className="min-h-screen relative overflow-hidden">
                {/* Ambient Background Elements */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full"></div>
                    <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-cyan-400/10 blur-[80px] rounded-full"></div>
                </div>

                <div className="relative z-10 h-full flex flex-col">
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            className: 'glass !bg-[#0A1121] !text-cyan-400 !border !border-cyan-500/50 !shadow-[0_0_15px_rgba(6,182,212,0.2)] !rounded-sm tracking-widest text-xs uppercase font-bold',
                            success: { iconTheme: { primary: '#22d3ee', secondary: '#050B14' } },
                            error: { className: 'glass !bg-[#050B14] !text-red-400 !border !border-red-500/50 !shadow-[0_0_15px_rgba(239,68,68,0.2)] !rounded-sm tracking-widest text-xs uppercase font-bold', iconTheme: { primary: '#ef4444', secondary: '#050B14' } }
                        }}
                    />
                    {showIntro ? (
                        <IntroAnimation onComplete={() => setShowIntro(false)} />
                    ) : (
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route
                                path="/student/*"
                                element={
                                    <ProtectedRoute allowedRoles={['student']}>
                                        <StudentDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/driver/*"
                                element={
                                    <ProtectedRoute allowedRoles={['driver']}>
                                        <DriverDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/*"
                                element={
                                    <ProtectedRoute allowedRoles={['admin']}>
                                        <AdminDashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="/" element={<Navigate to="/login" replace />} />
                        </Routes>
                    )}
                </div>
            </div>
        </Router>
    );
}

export default App;
