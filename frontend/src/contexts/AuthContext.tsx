import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { configureAxiosAuth, logoutUserApi } from '../services/authApi';
import axios from 'axios';

interface User {
    _id: string;
    email: string;
    name?: string;
    role?: string;
    isVerified?: boolean;
    lastLogin?: Date;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    login: (userData: User, authToken: string) => void;
    logout: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setTokenState] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCurrentUser = useCallback(async (currentToken: string) => {
        if (!currentToken) {
            setIsLoading(false);
            return;
        }
        
        try {
            const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/api$/, '');
            const API_CHECK_AUTH_URL = `${baseURL}/api/v1/users/check-auth`;
            
            console.log('Auth - Checking token with URL:', API_CHECK_AUTH_URL);

            const response = await axios.get<{ success: boolean; user: User; message?: string }>(
                API_CHECK_AUTH_URL,
                { 
                    headers: { Authorization: `Bearer ${currentToken}` },
                    withCredentials: true
                }
            );

            console.log('Auth - Response:', response.data);

            if (response.data && response.data.success && response.data.user) {
                setUser(response.data.user);
                setIsAuthenticated(true);
                localStorage.setItem('authUser', JSON.stringify(response.data.user));
            } else {
                throw new Error('Failed to fetch current user');
            }
        } catch (error) {
            console.error("Failed to fetch current user from token:", error);
            // Clear invalid data
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            configureAxiosAuth(null);
            setUser(null);
            setTokenState(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const initializeAuth = async () => {
            const storedToken = localStorage.getItem('authToken');
            const storedUser = localStorage.getItem('authUser');
            
            if (storedToken && storedUser) {
                try {
                    const userData = JSON.parse(storedUser);
                    setUser(userData);
                    setTokenState(storedToken);
                    setIsAuthenticated(true);
                    configureAxiosAuth(storedToken);
                    
                    // Verify token với backend
                    await fetchCurrentUser(storedToken);
                } catch (error) {
                    console.error('Error parsing stored user data:', error);
                    // Clear invalid data
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('authUser');
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, [fetchCurrentUser]);

    const login = (userData: User, authToken: string) => {
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('authUser', JSON.stringify(userData));
        configureAxiosAuth(authToken);
        setUser(userData);
        setTokenState(authToken);
        setIsAuthenticated(true);
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await logoutUserApi();
        } catch (error) {
            console.error("Logout API call failed, proceeding with client-side logout", error);
        } finally {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            configureAxiosAuth(null);
            setUser(null);
            setTokenState(null);
            setIsAuthenticated(false);
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ 
            isAuthenticated, 
            user, 
            token, 
            login, 
            logout, 
            isLoading 
        }}>
            {children}
        </AuthContext.Provider>
    );
};