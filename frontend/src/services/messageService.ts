import api from './api';

export interface ApplicationMessage {
  _id: string;
  applicationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'organizer' | 'exhibitor' | 'superadmin';
  content: string;
  createdAt: string;
}

export interface MessageThread {
  applicationId: string;
  companyName: string;
  category?: string;
  status: string;
  isArchived?: boolean;
  expoId: string;
  expoName: string;
  lastMessage: ApplicationMessage | null;
  totalMessages: number;
}

export const messageService = {
  /**
   * Get all conversation threads for current user
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
  async sendMessage(applicationId: string, content: string): Promise<ApplicationMessage> {
    const res = await api.post<{ success: boolean; data: { message: ApplicationMessage } }>(
      `/api/messages/application/${applicationId}`,
      { content }
    );
    return res.data.data.message;
  },
};
