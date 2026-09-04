import api from './api';

export type FeedbackCategory = 'bug' | 'feature_request' | 'general' | 'billing' | 'other';
export type FeedbackStatus = 'open' | 'in_review' | 'resolved' | 'closed';

export interface FeedbackItem {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  category: FeedbackCategory;
  subject: string;
  message: string;
  status: FeedbackStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackListResponse {
  feedback: FeedbackItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const feedbackService = {
  /** Submit feedback (any authenticated user) */
  submit: (payload: {
    category: FeedbackCategory;
    subject: string;
    message: string;
  }) => api.post('/api/feedback', payload).then(r => r.data),

  /** List all feedback (superadmin only) */
  listAll: (params?: {
    status?: FeedbackStatus;
    category?: FeedbackCategory;
    page?: number;
    limit?: number;
  }): Promise<FeedbackListResponse> =>
    api.get('/api/admin/feedback', { params }).then(r => r.data.data),

  /** Update feedback status (superadmin only) */
  updateStatus: (id: string, status: FeedbackStatus, adminNote?: string) =>
    api
      .patch(`/api/admin/feedback/${id}/status`, { status, adminNote })
      .then(r => r.data),
};
