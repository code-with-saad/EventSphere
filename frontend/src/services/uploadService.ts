import api from './api';

// purpose: 'expo_banner' | 'company_logo'
export const uploadService = {
  uploadImage: (file: File, purpose: 'expo_banner' | 'company_logo') => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('purpose', purpose);
    return api.post('/api/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.data as { url: string; publicId: string });
  },
};
