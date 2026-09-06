import { Router, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import UserModel from '../models/User.model';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { ObjectId } from 'mongodb';
import { invalidateAllUserRefreshTokens } from '../models/RefreshToken.model';

const router = Router();

/**
 * GET /api/admin/pending-organizers
 *
 * Returns all Organizers with status 'pending', awaiting SuperAdmin approval.
 *
 * Access: SuperAdmin only
 *
 * Requirements: 11.1, 11.2, 11.3
 */
router.get(
  '/pending-organizers',
  authenticate,
  authorize('superadmin'),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const pendingOrganizers = await UserModel.findByRoleAndStatus('organizer', 'pending');

    const organizers = pendingOrganizers.map((user) => ({
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      createdAt: user.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        organizers,
        count: organizers.length,
      },
    });
  })
);

/**
 * GET /api/admin/organizers
 *
 * Returns all Organizers, optionally filtered by ?status= query param.
 * Supports: pending, active, rejected. Omit for all statuses.
 *
 * Access: SuperAdmin only
 */
router.get(
  '/organizers',
  authenticate,
  authorize('superadmin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status } = req.query;

    const validStatuses = ['pending', 'active', 'suspended', 'rejected'];

    // Validate status filter if provided
    if (status !== undefined && !validStatuses.includes(status as string)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status filter. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    let organizers;
    if (status) {
      organizers = await UserModel.findByRoleAndStatus('organizer', status as any);
    } else {
      organizers = await UserModel.findByRole('organizer');
    }

    const result = organizers.map((user) => ({
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      createdAt: user.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        organizers: result,
        count: result.length,
        filter: (status as string) ?? 'all',
      },
    });
  })
);

/**
 * DELETE /api/admin/organizers/:id/reject
 *
 * Rejects a pending Organizer: sets status to 'rejected' (soft-delete) and
 * invalidates all their refresh tokens so any active session is forced to
 * re-authenticate. The user record is kept so it remains queryable by the
 * SuperAdmin "all organizers" view and the rejected organizer can still log
 * in and land on the RejectedScreen.
 *
 * Access: SuperAdmin only
 *
 * Requirements: 11.5, 11.7, 15.6
 */
router.delete(
  '/organizers/:id/reject',
  authenticate,
  authorize('superadmin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;

    // Validate that the id is a valid ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Pending organizer not found',
      });
    }

    // Find the user and verify they are a pending organizer
    const user = await UserModel.findById(id);

    if (!user || user.role !== 'organizer' || user.status !== 'pending') {
      return res.status(404).json({
        success: false,
        message: 'Pending organizer not found',
      });
    }

    // Soft-reject: update status to 'rejected', preserve the document
    await UserModel.updateById(id, { status: 'rejected' });

    // Invalidate all active refresh tokens so any open session is kicked out
    // and the next /me poll will reflect the new status immediately.
    await invalidateAllUserRefreshTokens(new ObjectId(user._id));

    return res.status(200).json({
      success: true,
      message: 'Organizer application rejected',
    });
  })
);

/**
 * PATCH /api/admin/organizers/:id/approve
 *
 * Approves a pending Organizer by changing their status from 'pending' to 'active'.
 *
 * Access: SuperAdmin only
 *
 * Requirements: 11.4, 11.6, 15.6
 */
router.patch(
  '/organizers/:id/approve',
  authenticate,
  authorize('superadmin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;

    // Validate ObjectId format before querying
    if (!ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Pending organizer not found',
      });
    }

    // Find the user and verify they are a pending organizer
    const user = await UserModel.findById(id);

    // Verify user exists, is an organizer, and is currently pending
    if (!user || user.role !== 'organizer' || user.status !== 'pending') {
      return res.status(404).json({
        success: false,
        message: 'Pending organizer not found',
      });
    }

    // Update status to 'active'
    const updatedUser = await UserModel.updateById(id, { status: 'active' });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Pending organizer not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Organizer approved successfully',
      data: {
        organizer: {
          id: updatedUser._id.toString(),
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          status: updatedUser.status,
        },
      },
    });
  })
);

/**
 * PATCH /api/admin/organizers/:id/suspend
 *
 * Suspends an organizer account by setting status to 'suspended' and revoking all refresh tokens.
 *
 * Access: SuperAdmin only
 */
router.patch(
  '/organizers/:id/suspend',
  authenticate,
  authorize('superadmin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;

    if (!ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found',
      });
    }

    const user = await UserModel.findById(id);

    if (!user || user.role !== 'organizer') {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found',
      });
    }

    const updatedUser = await UserModel.updateById(id, { status: 'suspended' });
    await invalidateAllUserRefreshTokens(new ObjectId(user._id));

    return res.status(200).json({
      success: true,
      message: 'Organizer suspended successfully',
      data: {
        organizer: {
          id: updatedUser?._id.toString() || id,
          email: updatedUser?.email || user.email,
          fullName: updatedUser?.fullName || user.fullName,
          status: 'suspended',
        },
      },
    });
  })
);

/**
 * PATCH /api/admin/organizers/:id/reactivate
 *
 * Reactivates a suspended/rejected organizer by setting status back to 'active'.
 *
 * Access: SuperAdmin only
 */
router.patch(
  '/organizers/:id/reactivate',
  authenticate,
  authorize('superadmin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;

    if (!ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found',
      });
    }

    const user = await UserModel.findById(id);

    if (!user || user.role !== 'organizer') {
      return res.status(404).json({
        success: false,
        message: 'Organizer not found',
      });
    }

    const updatedUser = await UserModel.updateById(id, { status: 'active' });

    return res.status(200).json({
      success: true,
      message: 'Organizer reactivated successfully',
      data: {
        organizer: {
          id: updatedUser?._id.toString() || id,
          email: updatedUser?.email || user.email,
          fullName: updatedUser?.fullName || user.fullName,
          status: 'active',
        },
      },
    });
  })
);

/**
 * GET /api/admin/analytics
 *
 * Returns comprehensive platform-wide analytics for SuperAdmin Reports & Analytics.
 *
 * Access: SuperAdmin only
 */
router.get(
  '/analytics',
  authenticate,
  authorize('superadmin'),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const statsService = (await import('../services/stats.service')).default;
    const analytics = await statsService.getSuperAdminAnalytics();

    return res.status(200).json({
      success: true,
      message: 'SuperAdmin analytics retrieved successfully',
      data: analytics,
    });
  })
);

export default router;

