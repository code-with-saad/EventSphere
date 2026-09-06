import { Router, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import FeedbackModel, {
  FeedbackCategory,
  FeedbackStatus,
  FeedbackType,
  FeedbackRecipientRole,
  IFeedbackRatings,
} from '../models/Feedback.model';
import ApplicationModel from '../models/Application.model';
import ExpoModel from '../models/Expo.model';
import SessionModel from '../models/Session.model';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { ObjectId } from 'mongodb';

const router = Router();

// ── Validation helpers ────────────────────────────────────────────────────────

const VALID_CATEGORIES: FeedbackCategory[] = [
  'bug', 'feature_request', 'general', 'billing', 'other',
];
const VALID_STATUSES: FeedbackStatus[] = ['open', 'in_review', 'resolved', 'closed'];
const ATTENDEE_RATING_TYPES: FeedbackType[] = ['general_exhibitor', 'booth_visit', 'session'];

/**
 * Centralized Recipient Resolution logic (Part B)
 * Resolves recipientRole, recipientId, and snapshots targetName
 */
async function resolveRecipientAndTarget(
  submitterRole: string,
  feedbackType: FeedbackType,
  targetId?: string
): Promise<{
  recipientRole: FeedbackRecipientRole;
  recipientId?: ObjectId;
  targetObjectId?: ObjectId;
  targetName?: string;
}> {
  if (submitterRole === 'attendee' && ATTENDEE_RATING_TYPES.includes(feedbackType)) {
    if (!targetId || !ObjectId.isValid(targetId)) {
      const err: any = new Error('Valid targetId is required for attendee rating feedback');
      err.statusCode = 400;
      throw err;
    }
    const targetObjId = new ObjectId(targetId);

    if (feedbackType === 'session') {
      const session = await SessionModel.findById(targetObjId);
      if (!session) {
        const err: any = new Error('Session not found');
        err.statusCode = 404;
        throw err;
      }
      const expo = await ExpoModel.findById(session.expoId);
      if (!expo) {
        const err: any = new Error('Expo not found for this session');
        err.statusCode = 404;
        throw err;
      }
      return {
        recipientRole: 'organizer',
        recipientId: expo.organizerId,
        targetObjectId: targetObjId,
        targetName: session.title,
      };
    } else {
      // general_exhibitor or booth_visit (targetId is application._id)
      const application = await ApplicationModel.findById(targetObjId);
      if (!application) {
        const err: any = new Error('Exhibitor application not found');
        err.statusCode = 404;
        throw err;
      }
      const expo = await ExpoModel.findById(application.expoId);
      if (!expo) {
        const err: any = new Error('Expo not found for this application');
        err.statusCode = 404;
        throw err;
      }
      return {
        recipientRole: 'organizer',
        recipientId: expo.organizerId,
        targetObjectId: targetObjId,
        targetName: application.companyName,
      };
    }
  }

  // Exhibitor / Organizer / general platform feedback -> superadmin
  return {
    recipientRole: 'superadmin',
    recipientId: undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/feedback
 *
 * Submit feedback or structured rating survey.
 * - Attendees rating exhibitors/booths/sessions -> routed to that expo's organizer.
 * - Exhibitors/Organizers -> routed to superadmin.
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const u = req.user!;
    const {
      feedbackType = 'general',
      targetId,
      category = 'general',
      ratings,
      comment,
      subject,
      message,
    } = req.body ?? {};

    // ── 1. Attendee Structured Rating Path ───────────────────────────────────
    if (ATTENDEE_RATING_TYPES.includes(feedbackType as FeedbackType)) {
      if (!ratings || typeof ratings !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Ratings object with 5 star ratings (1–5) is required',
        });
      }

      const ratingKeys: Array<keyof IFeedbackRatings> = [
        'overallExperience',
        'staffOrSpeakerQuality',
        'contentRelevance',
        'engagementLevel',
        'likelihoodToRecommend',
      ];

      for (const k of ratingKeys) {
        const val = Number(ratings[k]);
        if (!Number.isInteger(val) || val < 1 || val > 5) {
          return res.status(400).json({
            success: false,
            message: `${k} must be an integer rating between 1 and 5`,
          });
        }
      }

      if (comment && (typeof comment !== 'string' || comment.trim().length > 500)) {
        return res.status(400).json({
          success: false,
          message: 'comment must be at most 500 characters',
        });
      }

      // Application-level uniqueness check (Fix 1 & 2):
      const existing = await FeedbackModel.findExistingRating(
        u.userId,
        targetId,
        feedbackType as FeedbackType
      );
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `You have already submitted ${feedbackType.replace('_', ' ')} feedback for this item`,
        });
      }

      const { recipientRole, recipientId, targetObjectId, targetName } =
        await resolveRecipientAndTarget(u.role, feedbackType as FeedbackType, targetId);

      const feedback = await FeedbackModel.create({
        userId: new ObjectId(u.userId),
        userEmail: u.email,
        userName: (u as any).fullName || (u as any).name || u.email,
        userRole: u.role,
        feedbackType: feedbackType as FeedbackType,
        recipientRole,
        recipientId,
        targetId: targetObjectId,
        targetName,
        ratings: {
          overallExperience: Number(ratings.overallExperience),
          staffOrSpeakerQuality: Number(ratings.staffOrSpeakerQuality),
          contentRelevance: Number(ratings.contentRelevance),
          engagementLevel: Number(ratings.engagementLevel),
          likelihoodToRecommend: Number(ratings.likelihoodToRecommend),
        },
        comment: comment ? comment.trim() : undefined,
      });

      return res.status(201).json({
        success: true,
        message: 'Rating submitted successfully. Thank you!',
        data: { feedbackId: feedback._id.toString() },
      });
    }

    // ── 2. Standard Free-Text / Platform Feedback Path ────────────────────────
    let determinedType: FeedbackType = (feedbackType as FeedbackType) || 'general';
    if (u.role === 'organizer') determinedType = 'organizer_to_superadmin';
    if (u.role === 'exhibitor') determinedType = 'exhibitor_to_superadmin';

    if (!category || !VALID_CATEGORIES.includes(category as FeedbackCategory)) {
      return res.status(400).json({
        success: false,
        message: `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
    }
    if (!subject || typeof subject !== 'string' || subject.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'subject must be at least 5 characters',
      });
    }
    if (subject.trim().length > 120) {
      return res.status(400).json({
        success: false,
        message: 'subject must be at most 120 characters',
      });
    }
    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'message must be at least 10 characters',
      });
    }
    if (message.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'message must be at most 2000 characters',
      });
    }

    const { recipientRole, recipientId } = await resolveRecipientAndTarget(
      u.role,
      determinedType,
      targetId
    );

    const feedback = await FeedbackModel.create({
      userId: new ObjectId(u.userId),
      userEmail: u.email,
      userName: (u as any).fullName || (u as any).name || u.email,
      userRole: u.role,
      feedbackType: determinedType,
      recipientRole,
      recipientId,
      category: category as FeedbackCategory,
      subject: subject.trim(),
      message: message.trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully. Thank you!',
      data: { feedbackId: feedback._id.toString() },
    });
  })
);

/**
 * GET /api/feedback/mine
 *
 * List all feedback and ratings submitted by the authenticated user.
 */
router.get(
  '/mine',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const feedbacks = await FeedbackModel.findByUserId(userId);

    return res.status(200).json({
      success: true,
      data: {
        feedback: feedbacks.map((f) => ({
          _id: f._id.toString(),
          userId: f.userId.toString(),
          userEmail: f.userEmail,
          userName: f.userName,
          userRole: f.userRole,
          feedbackType: f.feedbackType,
          targetId: f.targetId ? f.targetId.toString() : undefined,
          targetName: f.targetName,
          recipientRole: f.recipientRole,
          category: f.category,
          ratings: f.ratings,
          comment: f.comment,
          subject: f.subject,
          message: f.message,
          status: f.status,
          adminNote: f.adminNote,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        })),
      },
    });
  })
);

/**
 * GET /api/feedback/my-ratings
 *
 * Fast lookup list of all items rated by current attendee.
 */
router.get(
  '/my-ratings',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const feedbacks = await FeedbackModel.findByUserId(userId);
    const ratings = feedbacks
      .filter((f) => f.targetId && ATTENDEE_RATING_TYPES.includes(f.feedbackType))
      .map((f) => ({
        targetId: f.targetId!.toString(),
        feedbackType: f.feedbackType,
        ratings: f.ratings,
      }));

    return res.status(200).json({
      success: true,
      data: { ratings },
    });
  })
);

/**
 * GET /api/admin/feedback
 *
 * List feedback routed to SuperAdmin (recipientRole === 'superadmin').
 */
router.get(
  '/admin/feedback',
  authenticate,
  authorize('superadmin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, category, page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filters: Parameters<typeof FeedbackModel.findAll>[0] = {
      recipientRole: 'superadmin',
      skip,
      limit: limitNum,
    };
    if (status && VALID_STATUSES.includes(status as FeedbackStatus))
      filters.status = status as FeedbackStatus;
    if (category && VALID_CATEGORIES.includes(category as FeedbackCategory))
      filters.category = category as FeedbackCategory;

    const { items, total } = await FeedbackModel.findAll(filters);

    return res.status(200).json({
      success: true,
      data: {
        feedback: items.map((f) => ({
          _id: f._id.toString(),
          userId: f.userId.toString(),
          userEmail: f.userEmail,
          userName: f.userName,
          userRole: f.userRole,
          feedbackType: f.feedbackType,
          category: f.category,
          subject: f.subject,
          message: f.message,
          status: f.status,
          adminNote: f.adminNote,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        })),
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

/**
 * PATCH /api/admin/feedback/:id/status
 *
 * Update status of a feedback item in SuperAdmin inbox.
 */
router.patch(
  '/admin/feedback/:id/status',
  authenticate,
  authorize('superadmin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const { status, adminNote } = req.body ?? {};

    if (!ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }
    if (!status || !VALID_STATUSES.includes(status as FeedbackStatus)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const updated = await FeedbackModel.updateStatus(id, status as FeedbackStatus, adminNote, {
      role: 'superadmin',
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Feedback status updated',
      data: { feedbackId: updated._id.toString(), status: updated.status },
    });
  })
);

/**
 * GET /api/organizer/feedback
 *
 * List attendee feedback and ratings routed to the authenticated organizer.
 */
router.get(
  '/organizer/feedback',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const organizerId = req.user!.userId;
    const { status, feedbackType, page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filters: Parameters<typeof FeedbackModel.findAll>[0] = {
      recipientRole: 'organizer',
      recipientId: organizerId,
      skip,
      limit: limitNum,
    };
    if (status && VALID_STATUSES.includes(status as FeedbackStatus)) {
      filters.status = status as FeedbackStatus;
    }
    if (feedbackType && ATTENDEE_RATING_TYPES.includes(feedbackType as FeedbackType)) {
      filters.feedbackType = feedbackType as FeedbackType;
    }

    const { items, total } = await FeedbackModel.findAll(filters);

    return res.status(200).json({
      success: true,
      data: {
        feedback: items.map((f) => ({
          _id: f._id.toString(),
          userId: f.userId.toString(),
          userEmail: f.userEmail,
          userName: f.userName,
          userRole: f.userRole,
          feedbackType: f.feedbackType,
          targetId: f.targetId ? f.targetId.toString() : undefined,
          targetName: f.targetName,
          ratings: f.ratings,
          comment: f.comment,
          status: f.status,
          adminNote: f.adminNote,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        })),
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

/**
 * PATCH /api/organizer/feedback/:id/status
 *
 * Update status of an attendee feedback item in Organizer inbox.
 */
router.patch(
  '/organizer/feedback/:id/status',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const organizerId = req.user!.userId;
    const { id } = req.params as { id: string };
    const { status, adminNote } = req.body ?? {};

    if (!ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }
    if (!status || !VALID_STATUSES.includes(status as FeedbackStatus)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const updated = await FeedbackModel.updateStatus(id, status as FeedbackStatus, adminNote, {
      role: 'organizer',
      id: organizerId,
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Feedback not found or access denied' });
    }

    return res.status(200).json({
      success: true,
      message: 'Feedback status updated',
      data: { feedbackId: updated._id.toString(), status: updated.status },
    });
  })
);

export default router;

