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
  attendeeCount?: number;
  totalBooths?: number;
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

  exportAttendeesCsvUrl: (expoId: string) =>
    `/api/expos/${expoId}/export/attendees.csv`,

  exportExhibitorsCsvUrl: (expoId: string) =>
    `/api/expos/${expoId}/export/exhibitors.csv`,

  exportCheckinsCsvUrl: (expoId: string) =>
    `/api/expos/${expoId}/export/checkins.csv`,

  downloadCsv: async (url: string, defaultFilename: string) => {
    const response = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'text/csv' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', defaultFilename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Download the full expo schedule as an RFC 5545 .ics calendar file.
   * Compatible with Google Calendar, Apple Calendar, Outlook, etc.
   */
  downloadScheduleIcs: async (expoId: string, expoName: string) => {
    const response = await api.get(`/api/expos/${expoId}/schedule.ics`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/calendar; charset=utf-8' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    const safeFilename = `${expoName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_schedule.ics`;
    link.setAttribute('download', safeFilename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};

