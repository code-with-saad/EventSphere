import api from './api';
import { ExpoCardDTO } from './expoService';

export interface ExpoFavoriteItem {
  _id: string;
  expoId: string;
  createdAt: string;
  expo: ExpoCardDTO;
}

export const favoriteService = {
  /**
   * Get all favorited expos for the current user
   */
  async getMine(): Promise<ExpoFavoriteItem[]> {
    const res = await api.get<{ success: boolean; data: { favorites: ExpoFavoriteItem[] } }>(
      '/api/favorites/mine'
    );
    return res.data.data.favorites;
  },

  /**
   * Get all favorited expo IDs for fast lookup
   */
  async getFavoriteIds(): Promise<string[]> {
    const res = await api.get<{ success: boolean; data: { favoriteExpoIds: string[] } }>(
      '/api/favorites/mine/ids'
    );
    return res.data.data.favoriteExpoIds;
  },

  /**
   * Add expo to favorites
   */
  async addFavorite(expoId: string): Promise<void> {
    await api.post(`/api/expos/${expoId}/favorite`);
  },

  /**
   * Remove expo from favorites
   */
  async removeFavorite(expoId: string): Promise<void> {
    await api.delete(`/api/expos/${expoId}/favorite`);
  },
};
