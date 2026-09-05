import api from './api';

export interface IExpoZone {
  name: string;
  boothCount: number;
}

export interface IBoothSpatialItem {
  boothLabel: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zoneName?: string;
}

export interface IReferenceShape {
  id: string;
  label: string;
  type: 'stage' | 'entrance' | 'exit' | 'restroom' | 'pillar' | 'custom';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IExpoSpatialLayout {
  canvasWidth: number;
  canvasHeight: number;
  gridSize: number;
  booths: IBoothSpatialItem[];
  referenceShapes?: IReferenceShape[];
}

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
  zones?: IExpoZone[];
  spatialLayout?: IExpoSpatialLayout;
}

export const expoService = {
  // Public listing with optional query params: { status?, search?, page?, limit? }
  list: (query?: Record<string, any>) =>
    api.get('/api/expos', { params: query }).then(r => r.data.data),

  getById: (id: string) =>
    api.get(`/api/expos/${id}`).then(r => r.data.data),

  getBooths: (id: string) =>
    api.get<{
      success: boolean;
      data: {
        totalBooths: number;
        occupiedBooths: string[];
        zones?: IExpoZone[];
        spatialLayout?: IExpoSpatialLayout;
      };
    }>(`/api/expos/${id}/booths`).then(r => r.data.data),

  saveSpatialLayout: (id: string, spatialLayout: IExpoSpatialLayout) =>
    api.put(`/api/expos/${id}/spatial-layout`, { spatialLayout }).then(r => r.data.data),

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

  getCheckIns: (id: string) =>
    api.get(`/api/expos/${id}/checkins`).then(r => r.data.data),

  listMine: () =>
    api.get('/api/organizer/expos').then(r => r.data.data.expos),
};

