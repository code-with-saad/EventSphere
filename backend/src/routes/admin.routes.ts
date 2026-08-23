import { Router, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import UserModel from '../models/User.model';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { ObjectId } from 'mongodb';

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

    const validStatuses = ['pending', 'active', 'rejected'];

    // Validate status filter if provided
    if (status !== undefined && !validStatuses.includes(status as string)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status filter. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    let organizers;
    if (status) {
      // Use existing findByRoleAndStatus for filtered queries
      organizers = await UserModel.findByRoleAndStatus('organizer', status as any);
    } else {
      // Use new findByRole for unfiltered queries
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
 * Rejects a pending Organizer by setting their status to 'rejected' (soft delete).
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

    // Soft-delete: set status to 'rejected' (preserve the record)
    await UserModel.updateById(id, { status: 'rejected' });

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

export default router;
