import api from './api';

export const statsService = {
  getOrganizerDashboard: () =>
    api.get('/api/dashboard/organizer').then(r => r.data.data),

  getExpoStats: (expoId: string) =>
    api.get(`/api/dashboard/organizer/${expoId}`).then(r => r.data.data),

  getSuperAdminDashboard: () =>
    api.get('/api/dashboard/superadmin').then(r => r.data.data),
};
