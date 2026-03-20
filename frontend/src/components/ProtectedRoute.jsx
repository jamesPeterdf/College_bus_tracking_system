import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    // 1. Unauthenticated -> Redirect to login
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // 2. Authenticated, but role not in allowed array -> Redirect to their respective dashboard
    if (allowedRoles && !allowedRoles.includes(role)) {
        // Find optimal fallback or just dump them to their home route
        return <Navigate to={`/${role}`} replace />;
    }

    // 3. Authorized
    return children;
};

export default ProtectedRoute;
