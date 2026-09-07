import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import MessageModel from '../models/Message.model';
import DirectMessageModel from '../models/DirectMessage.model';
import ApplicationModel from '../models/Application.model';
import ExpoModel from '../models/Expo.model';
import UserModel from '../models/User.model';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

/**
 * Check whether the user is authorized to read/write messages for this application.
 * Must be either the exhibitor who submitted the application or the organizer who owns the expo.
 */
async function verifyApplicationAccess(applicationId: string, userId: string, role: string) {
  const application = await ApplicationModel.findById(applicationId);
  if (!application) {
    const err: any = new Error('Application not found');
    err.statusCode = 404;
    throw err;
  }

  if (role === 'superadmin') {
    return { application };
  }

  if (application.exhibitorId.toString() === userId) {
    return { application };
  }

  // Check if organizer owns the expo
  const expo = await ExpoModel.findById(application.expoId);
  if (expo && expo.organizerId.toString() === userId) {
    return { application, expo };
  }

  const err: any = new Error('Unauthorized to access messages for this application');
  err.statusCode = 403;
  throw err;
}

/**
 * GET /api/messages/threads
 * Returns list of conversation threads for the authenticated organizer or exhibitor.
 * Includes unread message counts per thread.
 */
router.get(
  '/threads',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const role = req.user!.role;

    let applications: any[] = [];

    if (role === 'organizer') {
      // Find all expos belonging to this organizer
      const expos = await ExpoModel.findByOrganizer(userId);
      const expoIds = expos.map((e) => e._id);
      if (expoIds.length > 0) {
        applications = await ApplicationModel.getCollection()
          .find({ expoId: { $in: expoIds } })
          .toArray();
      }
    } else if (role === 'exhibitor') {
      // Find all applications submitted by this exhibitor
      applications = await ApplicationModel.findByExhibitor(userId);
    } else if (role === 'superadmin') {
      applications = await ApplicationModel.getCollection().find({}).limit(50).toArray();
    }

    if (applications.length === 0) {
      return res.status(200).json({
        success: true,
        data: { threads: [] },
      });
    }

    const applicationIds = applications.map((a) => a._id);
    const messages = await MessageModel.getCollection()
      .find({ applicationId: { $in: applicationIds } })
      .sort({ createdAt: -1 })
      .toArray();

    // Map expos for lookup
    const uniqueExpoIds = [...new Set(applications.map((a) => a.expoId.toString()))];
    const expos = await ExpoModel.getCollection()
      .find({ _id: { $in: uniqueExpoIds.map((id) => new ObjectId(id)) } })
      .toArray();
    const expoMap = new Map<string, any>();
    expos.forEach((e) => expoMap.set(e._id.toString(), e));

    const appMap = new Map<string, any>();
    applications.forEach((a) => appMap.set(a._id.toString(), a));

    // Group messages by applicationId & compute unread counts
    const threadMap = new Map<string, any>();
    for (const msg of messages) {
      const appIdStr = msg.applicationId.toString();
      const isIncomingUnread = msg.senderId.toString() !== userId && !msg.isRead;

      if (!threadMap.has(appIdStr)) {
        const app = appMap.get(appIdStr);
        const expo = app ? expoMap.get(app.expoId.toString()) : null;
        const appStatus = app?.status || 'pending';
        const isArchived = appStatus === 'rejected' || appStatus === 'withdrawn';

        threadMap.set(appIdStr, {
          applicationId: appIdStr,
          companyName: app?.companyName || 'Applicant',
          category: app?.category || '',
          status: appStatus,
          isArchived,
          expoId: app?.expoId?.toString() || '',
          expoName: expo?.name || 'Expo',
          unreadCount: isIncomingUnread ? 1 : 0,
          lastMessage: {
            _id: msg._id.toString(),
            senderId: msg.senderId.toString(),
            senderName: msg.senderName,
            senderRole: msg.senderRole,
            content: msg.content,
            attachmentUrl: msg.attachmentUrl,
            isRead: msg.isRead,
            createdAt: msg.createdAt,
          },
          totalMessages: 1,
        });
      } else {
        const thread = threadMap.get(appIdStr);
        thread.totalMessages += 1;
        if (isIncomingUnread) {
          thread.unreadCount = (thread.unreadCount || 0) + 1;
        }
      }
    }

    // Include active applications (pending/approved) that don't have messages yet so user can start conversations.
    for (const app of applications) {
      const appIdStr = app._id.toString();
      const isClosed = app.status === 'rejected' || app.status === 'withdrawn';

      if (!threadMap.has(appIdStr)) {
        if (isClosed) {
          // Skip closed/withdrawn/rejected applications with zero messages
          continue;
        }

        const expo = expoMap.get(app.expoId.toString());
        threadMap.set(appIdStr, {
          applicationId: appIdStr,
          companyName: app.companyName || 'Applicant',
          category: app.category || '',
          status: app.status || 'pending',
          isArchived: false,
          expoId: app.expoId?.toString() || '',
          expoName: expo?.name || 'Expo',
          unreadCount: 0,
          lastMessage: null,
          totalMessages: 0,
        });
      }
    }

    const threads = Array.from(threadMap.values()).sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return res.status(200).json({
      success: true,
      data: { threads },
    });
  })
);

/**
 * GET /api/messages/application/:applicationId
 * Returns list of messages for the specified application and marks incoming messages as read.
 */
router.get(
  '/application/:applicationId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const applicationId = req.params.applicationId as string;
    const userId = req.user!.userId;
    const role = req.user!.role;

    await verifyApplicationAccess(applicationId, userId, role);

    const messages = await MessageModel.findByApplication(applicationId);

    // Auto mark incoming messages as read
    await MessageModel.markAsRead(applicationId, userId);

    return res.status(200).json({
      success: true,
      data: { messages },
    });
  })
);

/**
 * POST /api/messages/application/:applicationId
 * Post a new message to the application thread (supports optional attachmentUrl).
 */
router.post(
  '/application/:applicationId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const applicationId = req.params.applicationId as string;
    const userId = req.user!.userId;
    const role = req.user!.role as 'organizer' | 'exhibitor' | 'superadmin';
    const { content, attachmentUrl } = req.body;

    if ((!content || typeof content !== 'string' || !content.trim()) && !attachmentUrl) {
      return res.status(400).json({
        success: false,
        message: 'Message content or attachment is required',
      });
    }

    if (content && content.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Message content cannot exceed 1000 characters',
      });
    }

    await verifyApplicationAccess(applicationId, userId, role);

    const sender = await UserModel.findById(userId);
    const senderName = sender?.fullName || (role === 'organizer' ? 'Event Organizer' : 'Exhibitor');

    const message = await MessageModel.create({
      applicationId: new ObjectId(applicationId),
      senderId: new ObjectId(userId),
      senderName,
      senderRole: role,
      content: content ? content.trim() : '',
      attachmentUrl: attachmentUrl || undefined,
    });

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message },
    });
  })
);

// ── DIRECT MESSAGES (Attendee ↔ Exhibitor / Exhibitor ↔ Exhibitor / User ↔ User) ──

/**
 * GET /api/messages/direct/threads
 * Returns list of 1-on-1 direct message conversations for the current user.
 */
router.get(
  '/direct/threads',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const userObjId = new ObjectId(userId);

    const messages = await DirectMessageModel.getCollection()
      .find({
        $or: [{ senderId: userObjId }, { recipientId: userObjId }],
      })
      .sort({ createdAt: -1 })
      .toArray();

    const threadMap = new Map<string, any>();

    for (const msg of messages) {
      const isSender = msg.senderId.toString() === userId;
      const otherUserId = isSender ? msg.recipientId.toString() : msg.senderId.toString();
      const otherUserName = isSender ? msg.recipientName : msg.senderName;
      const otherUserRole = isSender ? msg.recipientRole : msg.senderRole;
      const isIncomingUnread = !isSender && !msg.isRead;

      if (!threadMap.has(otherUserId)) {
        threadMap.set(otherUserId, {
          userId: otherUserId,
          name: otherUserName || 'User',
          role: otherUserRole || 'attendee',
          unreadCount: isIncomingUnread ? 1 : 0,
          lastMessage: {
            _id: msg._id.toString(),
            senderId: msg.senderId.toString(),
            senderName: msg.senderName,
            content: msg.content,
            attachmentUrl: msg.attachmentUrl,
            isRead: msg.isRead,
            createdAt: msg.createdAt,
          },
          totalMessages: 1,
        });
      } else {
        const thread = threadMap.get(otherUserId);
        thread.totalMessages += 1;
        if (isIncomingUnread) {
          thread.unreadCount = (thread.unreadCount || 0) + 1;
        }
      }
    }

    const threads = Array.from(threadMap.values()).sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return res.status(200).json({
      success: true,
      data: { threads },
    });
  })
);

/**
 * GET /api/messages/direct/:targetUserId
 * Returns chat history between current user and target user, and marks incoming messages as read.
 */
router.get(
  '/direct/:targetUserId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.userId;
    const targetUserId = req.params.targetUserId as string;

    if (!ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid target user ID' });
    }

    const messages = await DirectMessageModel.getConversation(currentUserId, targetUserId);

    // Mark messages from targetUser to currentUser as read
    await DirectMessageModel.markAsRead(currentUserId, targetUserId);

    return res.status(200).json({
      success: true,
      data: { messages },
    });
  })
);

/**
 * POST /api/messages/direct/:targetUserId
 * Send a 1-on-1 direct message (supports optional attachmentUrl).
 */
router.post(
  '/direct/:targetUserId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUserId = req.user!.userId;
    const targetUserId = req.params.targetUserId as string;
    const { content, attachmentUrl } = req.body;

    if (!ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid target user ID' });
    }

    if (currentUserId === targetUserId) {
      return res.status(400).json({ success: false, message: 'Cannot message yourself' });
    }

    if ((!content || typeof content !== 'string' || !content.trim()) && !attachmentUrl) {
      return res.status(400).json({
        success: false,
        message: 'Message content or attachment is required',
      });
    }

    if (content && content.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Message content cannot exceed 1000 characters',
      });
    }

    const [sender, recipient] = await Promise.all([
      UserModel.findById(currentUserId),
      UserModel.findById(targetUserId),
    ]);

    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    const message = await DirectMessageModel.create({
      senderId: new ObjectId(currentUserId),
      senderName: sender?.fullName || 'User',
      senderRole: (sender?.role as any) || 'attendee',
      recipientId: new ObjectId(targetUserId),
      recipientName: recipient.fullName || 'User',
      recipientRole: recipient.role,
      content: content ? content.trim() : '',
      attachmentUrl: attachmentUrl || undefined,
    });

    return res.status(201).json({
      success: true,
      message: 'Direct message sent successfully',
      data: { message },
    });
  })
);

export default router;

