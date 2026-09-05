import api from './api';

export interface ExpoCardDTO {
  _id: string;
  name: string;
  description: string;
  status: 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';
  startDate: string;
  endDate: string;
  venueName: string;
  venueAddress: string;
  bannerUrl?: string;
  approvedExhibitorCount?: number;
  category?: string;
}

export const expoService = {
  // Public listing with optional query params: { status?, search?, page?, limit? }
  list: (query?: Record<string, any>) =>
    api.get('/api/expos', { params: query }).then(r => r.data.data),

  getById: (id: string) =>
    api.get(`/api/expos/${id}`).then(r => r.data.data),

  getBooths: (id: string) =>
    api.get<{ success: boolean; data: { totalBooths: number; occupiedBooths: string[] } }>(`/api/expos/${id}/booths`).then(r => r.data.data),

  // Organizer-scoped fetch — returns draft expos too (getById only returns published/ongoing/completed)
  getByIdForOrganizer: (id: string) =>
    api.get(`/api/organizer/expos/${id}`).then(r => r.data.data),

  create: (data: Record<string, any>) =>
    api.post('/api/expos', data).then(r => r.data.data),

  update: (id: string, data: Record<string, any>) =>
    api.patch(`/api/expos/${id}`, data).then(r => r.data.data),

  // data = { status: string, confirmed?: boolean }
  transitionStatus: (id: string, status: string, confirmed?: boolean) =>
    api.patch(`/api/expos/${id}/status`, { status, confirmed }).then(r => r.data.data),

  getCascadePreview: (id: string) =>
    api.get(`/api/expos/${id}/cascade-preview`).then(r => r.data.data),

  delete: (id: string, confirmed: boolean) =>
    api.delete(`/api/expos/${id}`, { data: { confirmed } }).then(r => r.data),

  getStats: (id: string) =>
    api.get(`/api/dashboard/organizer/${id}`).then(r => r.data.data),

  listMine: () =>
    api.get('/api/organizer/expos').then(r => r.data.data.expos),
};

