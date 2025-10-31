import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests - automatically get from localStorage
apiClient.interceptors.request.use(
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

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  location?: string;
  website?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    instagram?: string;
  };
  profileVisibility: 'public' | 'private';
  stats: {
    posts: number;
    followers: number;
    following: number;
    profileViews: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    instagram?: string;
  };
  profileVisibility?: 'public' | 'private';
}

// Get current user profile
export const getMyProfile = async (): Promise<UserProfile> => {
  try {
    const response = await apiClient.get('/v1/profile/me');
    return response.data.user;
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch profile');
  }
};

// Update user profile
export const updateMyProfile = async (data: UpdateProfileData): Promise<UserProfile> => {
  try {
    const response = await apiClient.put('/v1/profile/me', data);
    return response.data.user;
  } catch (error: any) {
    console.error('Error updating profile:', error);
    throw new Error(error.response?.data?.message || 'Failed to update profile');
  }
};

// Upload avatar
export const uploadAvatar = async (file: File): Promise<UserProfile> => {
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await apiClient.post('/v1/profile/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.user;
  } catch (error: any) {
    console.error('Error uploading avatar:', error);
    throw new Error(error.response?.data?.message || 'Failed to upload avatar');
  }
};

// Get user profile by ID (public)
export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  try {
    const response = await apiClient.get(`/v1/profile/${userId}`);
    return response.data.user;
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch user profile');
  }
};
