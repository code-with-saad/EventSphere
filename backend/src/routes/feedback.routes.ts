import { Router, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import FeedbackModel, { FeedbackCategory, FeedbackStatus } from '../models/Feedback.model';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { ObjectId } from 'mongodb';

const router = Router();

// ── Validation helpers ────────────────────────────────────────────────────────

const VALID_CATEGORIES: FeedbackCategory[] = [
  'bug', 'feature_request', 'general', 'billing', 'other',
];
const VALID_STATUSES: FeedbackStatus[] = ['open', 'in_review', 'resolved', 'closed'];

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/feedback
 *
 * Submit feedback or an issue report. Any authenticated user may submit.
 *
 * Body: { category, subject, message }
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { category, subject, message } = req.body ?? {};

    // ── Validation ────────────────────────────────────────────────────────────
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

    const u = req.user!;
    const feedback = await FeedbackModel.create({
      userId: new ObjectId(u.userId),
      userEmail: u.email,
      userName: (u as any).fullName || (u as any).name || u.email,
      userRole: u.role,
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
 * GET /api/admin/feedback
 *
 * List all feedback with optional ?status= and ?category= filters.
 * Supports ?page= and ?limit= pagination.
 *
 * Access: SuperAdmin only
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

    const filters: Parameters<typeof FeedbackModel.findAll>[0] = { skip, limit: limitNum };
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
 * Update a feedback item's status (and optionally add an admin note).
 *
 * Body: { status, adminNote? }
 *
 * Access: SuperAdmin only
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

    const updated = await FeedbackModel.updateStatus(id, status as FeedbackStatus, adminNote);
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

export default router;
