import { profileApiClient } from './profileApiClient';

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  coverPhoto?: string;
  location?: string;
  website?: string;
  dateOfBirth?: Date;
  phoneNumber?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    instagram?: string;
  };
  profileVisibility: 'public' | 'private' | 'friends';
  stats: {
    posts: number;
    followers: number;
    following: number;
    profileViews: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  dateOfBirth?: Date;
  phoneNumber?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    instagram?: string;
  };
  profileVisibility?: 'public' | 'private' | 'friends';
}

class ProfileApiService {
  // Lấy thông tin profile người dùng hiện tại
  async getCurrentProfile(): Promise<UserProfile> {
    const response = await profileApiClient.get('/me');
    return response.data.user;
  }

  // Lấy thông tin profile theo ID (public view)
  async getProfileById(userId: string): Promise<UserProfile> {
    const response = await profileApiClient.get(`/${userId}`);
    return response.data.user;
  }

  // Cập nhật thông tin profile
  async updateProfile(profileData: UpdateProfileData): Promise<UserProfile> {
    const response = await profileApiClient.put('/me', profileData);
    return response.data.user;
  }

  // Upload avatar
  async uploadAvatar(avatarFile: File): Promise<{ user: UserProfile; avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    const response = await profileApiClient.post('/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return {
      user: response.data.user,
      avatarUrl: response.data.avatarUrl,
    };
  }

  // Xóa avatar
  async deleteAvatar(): Promise<UserProfile> {
    const response = await profileApiClient.delete('/avatar');
    return response.data.user;
  }

  // Tìm kiếm người dùng
  async searchUsers(query: string, page: number = 1, limit: number = 10): Promise<UserProfile[]> {
    const response = await profileApiClient.get(`/search/${encodeURIComponent(query)}`, {
      params: { page, limit }
    });
    return response.data.users;
  }
}

export const profileApiService = new ProfileApiService();
