import api from './api';

export interface OrganizerItem {
  id: string;
  email: string;
  fullName: string;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  createdAt: string;
}

export interface SuperAdminAnalyticsData {
  totalUsers: number;
  totalExpos: number;
  totalApplications: number;
  totalRegistrations: number;
  totalCheckIns: number;
  overallCheckInRate: number;
  pendingOrganizersCount: number;
  usersByRole: {
    attendee: number;
    exhibitor: number;
    organizer: number;
    superadmin: number;
  };
  usersOverTime: {
    period: string;
    attendees: number;
    exhibitors: number;
    organizers: number;
    total: number;
  }[];
  exposByStatus: {
    status: string;
    count: number;
  }[];
  applicationsByStatus: {
    pending: number;
    approved: number;
    rejected: number;
  };
  organizersRollup: {
    organizerId: string;
    fullName: string;
    email: string;
    status: string;
    expoCount: number;
    totalAttendees: number;
    totalCheckIns: number;
    checkInRate: number;
  }[];
}

export const adminService = {
  getPendingOrganizers: async (): Promise<{ organizers: OrganizerItem[]; count: number }> => {
    const res = await api.get('/api/admin/pending-organizers');
    return res.data.data;
  },

  getOrganizers: async (status?: string): Promise<{ organizers: OrganizerItem[]; count: number; filter: string }> => {
    const url = status && status !== 'all' ? `/api/admin/organizers?status=${status}` : '/api/admin/organizers';
    const res = await api.get(url);
    return res.data.data;
  },

  approveOrganizer: async (id: string) => {
    const res = await api.patch(`/api/admin/organizers/${id}/approve`);
    return res.data;
  },

  rejectOrganizer: async (id: string) => {
    const res = await api.delete(`/api/admin/organizers/${id}/reject`);
    return res.data;
  },

  suspendOrganizer: async (id: string) => {
    const res = await api.patch(`/api/admin/organizers/${id}/suspend`);
    return res.data;
  },

  reactivateOrganizer: async (id: string) => {
    const res = await api.patch(`/api/admin/organizers/${id}/reactivate`);
    return res.data;
  },

  getAnalytics: async (): Promise<SuperAdminAnalyticsData> => {
    const res = await api.get('/api/admin/analytics');
    return res.data.data;
  },
};

export default adminService;
