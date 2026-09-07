import api from './api';

export const sessionService = {
  list: (expoId: string) =>
    api.get(`/api/expos/${expoId}/sessions`).then(r => {
      // Backend returns: { success, data: { sessions: [...] } }
      const d = r.data.data;
      return Array.isArray(d) ? d : (d?.sessions ?? []);
    }),

  create: (expoId: string, data: Record<string, any>) =>
    api.post(`/api/expos/${expoId}/sessions`, data).then(r => r.data.data),

  update: (expoId: string, sessionId: string, data: Record<string, any>) =>
    api.patch(`/api/expos/${expoId}/sessions/${sessionId}`, data).then(r => r.data.data),

  delete: (expoId: string, sessionId: string) =>
    api.delete(`/api/expos/${expoId}/sessions/${sessionId}`).then(r => r.data),

  register: (expoId: string, sessionId: string) =>
    api.post(`/api/expos/${expoId}/sessions/${sessionId}/register`).then(r => r.data),

  unregister: (expoId: string, sessionId: string) =>
    api.delete(`/api/expos/${expoId}/sessions/${sessionId}/register`).then(r => r.data),

  getMyRegistered: (expoId: string) =>
    api.get(`/api/expos/${expoId}/sessions/registered/mine`).then(r => {
      const d = r.data.data;
      return Array.isArray(d) ? d : (d?.sessions ?? []);
    }),

  listRegistrations: (expoId: string, sessionId: string) =>
    api.get(`/api/expos/${expoId}/sessions/${sessionId}/registrations`).then(r => r.data.data?.registrations ?? []),
};

