import api from './api';
import { User } from '../contexts/AuthContext';

export interface UpdateMePayload {
  fullName?: string;
  avatarUrl?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UserResponse {
  success: boolean;
  message?: string;
  data: {
    user: User;
  };
}

export const userService = {
  /**
   * Get current user's full profile
   */
  async getMe(): Promise<User> {
    const res = await api.get<UserResponse>('/api/users/me');
    return res.data.data.user;
  },

  /**
   * Update current user's profile (fullName and/or avatarUrl)
   */
  async updateMe(payload: UpdateMePayload): Promise<User> {
    const res = await api.patch<UserResponse>('/api/users/me', payload);
    return res.data.data.user;
  },

  /**
   * Change current user's password in-session
   */
  async changePassword(payload: ChangePasswordPayload): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>('/api/auth/change-password', payload);
    return res.data;
  },

  /**
   * Upload user avatar image
   */
  async uploadAvatar(file: File): Promise<{ url: string; publicId: string }> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('purpose', 'avatar');

    const res = await api.post<{ success: boolean; data: { url: string; publicId: string } }>(
      '/api/upload/image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data.data;
  },
};
