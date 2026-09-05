import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import MessageModel from '../models/Message.model';
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

    // Group messages by applicationId
    const threadMap = new Map<string, any>();
    for (const msg of messages) {
      const appIdStr = msg.applicationId.toString();
      if (!threadMap.has(appIdStr)) {
        const app = appMap.get(appIdStr);
        const expo = app ? expoMap.get(app.expoId.toString()) : null;
        threadMap.set(appIdStr, {
          applicationId: appIdStr,
          companyName: app?.companyName || 'Applicant',
          category: app?.category || '',
          status: app?.status || 'pending',
          expoId: app?.expoId?.toString() || '',
          expoName: expo?.name || 'Expo',
          lastMessage: {
            _id: msg._id.toString(),
            senderId: msg.senderId.toString(),
            senderName: msg.senderName,
            senderRole: msg.senderRole,
            content: msg.content,
            createdAt: msg.createdAt,
          },
          totalMessages: 1,
        });
      } else {
        const thread = threadMap.get(appIdStr);
        thread.totalMessages += 1;
      }
    }

    // Include applications that don't have messages yet so user can start conversations
    for (const app of applications) {
      const appIdStr = app._id.toString();
      if (!threadMap.has(appIdStr)) {
        const expo = expoMap.get(app.expoId.toString());
        threadMap.set(appIdStr, {
          applicationId: appIdStr,
          companyName: app.companyName || 'Applicant',
          category: app.category || '',
          status: app.status || 'pending',
          expoId: app.expoId?.toString() || '',
          expoName: expo?.name || 'Expo',
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
 * Returns list of messages for the specified application.
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

    return res.status(200).json({
      success: true,
      data: { messages },
    });
  })
);

/**
 * POST /api/messages/application/:applicationId
 * Post a new message to the application thread.
 */
router.post(
  '/application/:applicationId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const applicationId = req.params.applicationId as string;
    const userId = req.user!.userId;
    const role = req.user!.role as 'organizer' | 'exhibitor' | 'superadmin';
    const { content } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message content cannot be empty',
      });
    }

    if (content.trim().length > 1000) {
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
      content: content.trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message },
    });
  })
);

export default router;
