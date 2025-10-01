// frontend/src/components/ProtectedRoute.tsx
import React, { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

interface ProtectedRouteProps {
    children: ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth(); // isLoading từ AuthContext
    const location = useLocation();

    if (isLoading) { // Chờ cho đến khi trạng thái xác thực được xác định
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!isAuthenticated) {
        // Chuyển hướng đến trang login, lưu lại trang hiện tại để redirect lại sau khi login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children; // Nếu đã đăng nhập, render component con
};

export default ProtectedRoute;