import api from './api';

export interface ApplicationMessage {
  _id: string;
  applicationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'organizer' | 'exhibitor' | 'attendee' | 'superadmin';
  content: string;
  attachmentUrl?: string;
  isRead?: boolean;
  readAt?: string;
  createdAt: string;
}

export interface DirectMessageItem {
  _id: string;
  senderId: string;
  senderName: string;
  senderRole: 'organizer' | 'exhibitor' | 'attendee' | 'superadmin';
  recipientId: string;
  recipientName: string;
  recipientRole: 'organizer' | 'exhibitor' | 'attendee' | 'superadmin';
  content: string;
  attachmentUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface DirectMessageThread {
  userId: string;
  name: string;
  role: 'organizer' | 'exhibitor' | 'attendee' | 'superadmin';
  unreadCount?: number;
  lastMessage: {
    _id: string;
    senderId: string;
    senderName: string;
    content: string;
    attachmentUrl?: string;
    isRead: boolean;
    createdAt: string;
  } | null;
  totalMessages: number;
}

export interface MessageThread {
  applicationId: string;
  companyName: string;
  category?: string;
  status: string;
  isArchived?: boolean;
  expoId: string;
  expoName: string;
  unreadCount?: number;
  lastMessage: ApplicationMessage | null;
  totalMessages: number;
}

export const messageService = {
  /**
   * Get all booth application conversation threads for current user
   */
  async getThreads(): Promise<MessageThread[]> {
    const res = await api.get<{ success: boolean; data: { threads: MessageThread[] } }>(
      '/api/messages/threads'
    );
    return res.data.data.threads;
  },

  /**
   * Get all messages in the application conversation
   */
  async getByApplication(applicationId: string): Promise<ApplicationMessage[]> {
    const res = await api.get<{ success: boolean; data: { messages: ApplicationMessage[] } }>(
      `/api/messages/application/${applicationId}`
    );
    return res.data.data.messages;
  },

  /**
   * Send a message on the application thread
   */
  async sendMessage(applicationId: string, content: string, attachmentUrl?: string): Promise<ApplicationMessage> {
    const res = await api.post<{ success: boolean; data: { message: ApplicationMessage } }>(
      `/api/messages/application/${applicationId}`,
      { content, attachmentUrl }
    );
    return res.data.data.message;
  },

  /**
   * Get all 1-on-1 direct message threads
   */
  async getDirectThreads(): Promise<DirectMessageThread[]> {
    const res = await api.get<{ success: boolean; data: { threads: DirectMessageThread[] } }>(
      '/api/messages/direct/threads'
    );
    return res.data.data.threads;
  },

  /**
   * Get 1-on-1 message history with a target user
   */
  async getDirectMessages(targetUserId: string): Promise<DirectMessageItem[]> {
    const res = await api.get<{ success: boolean; data: { messages: DirectMessageItem[] } }>(
      `/api/messages/direct/${targetUserId}`
    );
    return res.data.data.messages;
  },

  /**
   * Send a 1-on-1 direct message to a target user
   */
  async sendDirectMessage(targetUserId: string, content: string, attachmentUrl?: string): Promise<DirectMessageItem> {
    const res = await api.post<{ success: boolean; data: { message: DirectMessageItem } }>(
      `/api/messages/direct/${targetUserId}`,
      { content, attachmentUrl }
    );
    return res.data.data.message;
  },
};
