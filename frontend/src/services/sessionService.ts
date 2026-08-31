import api from './api';

export const sessionService = {
  list: (expoId: string) =>
    api.get(`/api/expos/${expoId}/sessions`).then(r => r.data.data),

  create: (expoId: string, data: Record<string, any>) =>
    api.post(`/api/expos/${expoId}/sessions`, data).then(r => r.data.data),

  update: (expoId: string, sessionId: string, data: Record<string, any>) =>
    api.patch(`/api/expos/${expoId}/sessions/${sessionId}`, data).then(r => r.data.data),

  delete: (expoId: string, sessionId: string) =>
    api.delete(`/api/expos/${expoId}/sessions/${sessionId}`).then(r => r.data),
};
