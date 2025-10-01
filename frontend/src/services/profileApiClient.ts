import axios from 'axios';

// Tạo separate API client cho profile service  
const PROFILE_API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '/api/v1/profile');

export const profileApiClient = axios.create({
    baseURL: PROFILE_API_BASE_URL,
    withCredentials: true, // Để gửi cookies
    headers: {
        'Content-Type': 'application/json',
    }
});

// Interceptor để thêm token vào header
profileApiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor để xử lý lỗi
profileApiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token hết hạn, xóa token và redirect to login
            localStorage.removeItem('authToken');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
