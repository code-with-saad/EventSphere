import api from './api';

export const applicationService = {
  submit: (expoId: string, data: Record<string, any>) =>
    api.post(`/api/expos/${expoId}/applications`, data).then(r => r.data.data),

  getMine: (expoId: string) =>
    api.get(`/api/expos/${expoId}/applications/mine`).then(r => r.data.data),

  listForExpo: (expoId: string) =>
    api.get(`/api/expos/${expoId}/applications`).then(r => r.data.data),

  edit: (expoId: string, applicationId: string, data: Record<string, any>) =>
    api.patch(`/api/expos/${expoId}/applications/${applicationId}`, data).then(r => r.data.data),

  withdraw: (expoId: string, applicationId: string) =>
    api.delete(`/api/expos/${expoId}/applications/${applicationId}`).then(r => r.data),

  // body: { action: 'approve'|'reject'|'revoke', boothLabel?: string, reason?: string }
  review: (expoId: string, applicationId: string, body: Record<string, any>) =>
    api.patch(`/api/expos/${expoId}/applications/${applicationId}/review`, body).then(r => r.data.data),

  listAllMine: () =>
    api.get('/api/exhibitor/applications').then(r => r.data.data),

  listOrganizerOverview: (filters?: { expoId?: string; status?: string }) =>
    api.get('/api/applications/organizer/overview', { params: filters }).then(r => r.data.data),
};
