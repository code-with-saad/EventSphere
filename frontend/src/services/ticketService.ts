import api from './api';

export const ticketService = {
  register: (expoId: string) =>
    api.post(`/api/expos/${expoId}/tickets`).then(r => r.data.data),

  getMine: () =>
    api.get('/api/tickets/mine').then(r => r.data.data),

  getById: (ticketId: string) =>
    api.get(`/api/tickets/${ticketId}`).then(r => r.data.data),

  cancel: (ticketId: string) =>
    api.patch(`/api/tickets/${ticketId}/cancel`).then(r => r.data.data),

  checkIn: (ticketId: string, expoId: string) =>
    api.post('/api/tickets/checkin', { ticketId, expoId }).then(r => r.data.data),

  // Returns blob for PDF download — caller creates object URL
  downloadPDF: (ticketId: string) =>
    api.get(`/api/tickets/${ticketId}/pdf`, { responseType: 'blob' }).then(r => r.data),
};
