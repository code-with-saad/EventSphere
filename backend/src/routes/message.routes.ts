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
