import api from './api';

export type FeedbackCategory = 'bug' | 'feature_request' | 'general' | 'billing' | 'other';
export type FeedbackStatus = 'open' | 'in_review' | 'resolved' | 'closed';
export type FeedbackType =
  | 'general_exhibitor'
  | 'booth_visit'
  | 'session'
  | 'organizer_to_superadmin'
  | 'exhibitor_to_superadmin'
  | 'general';

export interface FeedbackRatings {
  overallExperience: number;      // 1–5
  staffOrSpeakerQuality: number;  // 1–5
  contentRelevance: number;       // 1–5
  engagementLevel: number;        // 1–5
  likelihoodToRecommend: number;  // 1–5
}

export interface FeedbackItem {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  feedbackType: FeedbackType;
  targetId?: string;
  targetName?: string;
  recipientRole: 'organizer' | 'superadmin';
  category?: FeedbackCategory;
  ratings?: FeedbackRatings;
  comment?: string;
  subject?: string;
  message?: string;
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

export interface MyRatingItem {
  targetId: string;
  feedbackType: FeedbackType;
  ratings: FeedbackRatings;
}

export const feedbackService = {
  /** Submit free-text platform feedback (any authenticated user) */
  submit: (payload: {
    category: FeedbackCategory;
    subject: string;
    message: string;
    feedbackType?: FeedbackType;
  }) => api.post('/api/feedback', payload).then(r => r.data),

  /** Submit attendee structured rating */
  submitRating: (payload: {
    feedbackType: 'general_exhibitor' | 'booth_visit' | 'session';
    targetId: string;
    ratings: FeedbackRatings;
    comment?: string;
  }) => api.post('/api/feedback', payload).then(r => r.data),

  /** List user's own feedback and rating submissions */
  listMine: (): Promise<FeedbackItem[]> =>
    api.get<{ success: boolean; data: { feedback: FeedbackItem[] } }>('/api/feedback/mine').then(r => r.data.data.feedback),

  /** Fast lookup of all items rated by current attendee */
  listMyRatings: (): Promise<MyRatingItem[]> =>
    api.get<{ success: boolean; data: { ratings: MyRatingItem[] } }>('/api/feedback/my-ratings').then(r => r.data.data.ratings),

  /** List all platform feedback (superadmin only) */
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

  /** List attendee feedback routed to organizer (organizer only) */
  listOrganizerFeedback: (params?: {
    status?: FeedbackStatus;
    feedbackType?: FeedbackType;
    page?: number;
    limit?: number;
  }): Promise<FeedbackListResponse> =>
    api.get('/api/organizer/feedback', { params }).then(r => r.data.data),

  /** Update attendee feedback status (organizer only) */
  updateOrganizerFeedbackStatus: (id: string, status: FeedbackStatus, adminNote?: string) =>
    api
      .patch(`/api/organizer/feedback/${id}/status`, { status, adminNote })
      .then(r => r.data),
};

