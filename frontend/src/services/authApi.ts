// frontend/src/services/authApi.ts
import axios from 'axios';

// API_BASE_URL nên trỏ đến prefix của user routes, ví dụ: http://localhost:5001/api/v1/users
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '/api/v1/users');


export const authApiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Bật nếu backend của bạn dùng cookie sessions thay vì chỉ Bearer token
});

// Định nghĩa User type (có thể import từ một file types chung)
interface User {
    _id: string;
    email: string;
    name?: string;
    // Các trường khác
}

export interface AuthResponse {
    success: boolean;
    token?: string;
    user?: User;
    message?: string;
}

interface LoginPayload {
    email: string;
    password: string;
}

export interface SignupPayload extends LoginPayload {
    passwordConfirm: string;
    name?: string;
}

export const signupUserApi = async (payload: SignupPayload): Promise<AuthResponse> => {
    try {
        const response = await authApiClient.post<AuthResponse>('/signup', payload);
        if (response.data.token && response.data.user) {
            // Tự động lưu token nếu signup thành công và có token
            localStorage.setItem('authToken', response.data.token);
            configureAxiosAuth(response.data.token); // Cấu hình luôn cho các request tiếp theo
        }
        return response.data;
    } catch (error: any) {
        return error.response?.data || { success: false, message: error.message || 'An unknown error occurred during signup.' };
    }
};

export const loginUserApi = async (payload: LoginPayload): Promise<AuthResponse> => {
    try {
        const response = await authApiClient.post<AuthResponse>('/login', payload);
        if (response.data.token && response.data.user) {
            // AuthContext sẽ gọi hàm login của nó, hàm này sẽ lưu token và user
        }
        return response.data;
    } catch (error: any) {
        return error.response?.data || { success: false, message: error.message || 'An unknown error occurred during login.' };
    }
};

export const logoutUserApi = async (): Promise<AuthResponse> => {
    try {
        // Backend có thể không yêu cầu token cho logout, hoặc có thể
        // Nếu backend dùng httpOnly cookie, thì request này sẽ tự gửi cookie
        const response = await authApiClient.get<AuthResponse>('/logout'); // Hoặc POST tùy backend
        return response.data;
    } catch (error: any) {
        // Ngay cả khi logout API lỗi, client vẫn nên xóa token
        console.error("Logout API error:", error);
        return error.response?.data || { success: false, message: error.message || 'Logout API call failed' };
    }
};


export const configureAxiosAuth = (token: string | null) => {
    if (token) {
        authApiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete authApiClient.defaults.headers.common['Authorization'];
    }
};

authApiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export const forgotPasswordApi = async (email: string): Promise<AuthResponse> => {
    try {
        const response = await authApiClient.post<AuthResponse>('/forgot-password', { email });
        return response.data;
    } catch (error: any) {
        return error.response?.data || { success: false, message: error.message || 'An error occurred during password reset request.' };
    }
};

export const resetPasswordApi = async (token: string, password: string): Promise<AuthResponse> => {
    try {
        const response = await authApiClient.post<AuthResponse>(`/reset-password/${token}`, { password });
        return response.data;
    } catch (error: any) {
        return error.response?.data || { success: false, message: error.message || 'An error occurred during password reset.' };
    }
};

