import api from './api';

export const bookmarkService = {
  add: (expoId: string, sessionId: string) =>
    api.post(`/api/expos/${expoId}/sessions/${sessionId}/bookmarks`).then(r => r.data.data),

  remove: (expoId: string, sessionId: string) =>
    api.delete(`/api/expos/${expoId}/sessions/${sessionId}/bookmarks`).then(r => r.data),

  getMine: (expoId: string) =>
    api.get(`/api/expos/${expoId}/bookmarks/mine`).then(r => r.data.data),
};
