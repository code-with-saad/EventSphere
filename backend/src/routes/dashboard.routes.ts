import { Router, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import StatsService from '../services/stats.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';

const router = Router();

/**
 * GET /api/dashboard/organizer/:expoId/engagement
 *
 * Returns session bookmark popularity and exhibitor category distribution
 * for a specific expo owned by the authenticated organizer.
 *
 * Access: Organizer only (must own the expo)
 */
router.get(
  '/organizer/:expoId/engagement',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await StatsService.getEngagementDepth(
      req.params.expoId as string,
      req.user!.userId
    );
    return res.status(200).json({
      success: true,
      message: 'Engagement depth retrieved successfully',
      data,
    });
  })
);

/**
 * GET /api/dashboard/organizer
 *
 * Returns aggregated dashboard stats for the authenticated organizer:
 * active expo count, total attendees, total check-ins, aggregate booth fill
 * rate, and the 5 most recently updated expos.
 *
 * Access: Organizer only
 */
router.get(
  '/organizer',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await StatsService.getOrganizerDashboard(req.user!.userId);
    return res.status(200).json({
      success: true,
      message: 'Organizer dashboard retrieved successfully',
      data,
    });
  })
);

/**
 * GET /api/dashboard/organizer/analytics
 *
 * Returns cross-expo aggregated analytics for the authenticated organizer.
 *
 * Access: Organizer only
 */
router.get(
  '/organizer/analytics',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await StatsService.getOrganizerAnalytics(req.user!.userId);
    return res.status(200).json({
      success: true,
      message: 'Organizer analytics retrieved successfully',
      data,
    });
  })
);

/**
 * GET /api/dashboard/organizer/:expoId
 *
 * Returns per-expo statistics for the given expo owned by the authenticated
 * organizer: application counts by status, attendee/check-in counts, and
 * booth fill rate.
 *
 * Access: Organizer only (must own the expo)
 */
router.get(
  '/organizer/:expoId',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await StatsService.getExpoStats(
      req.params.expoId as string,
      req.user!.userId
    );
    return res.status(200).json({
      success: true,
      message: 'Expo stats retrieved successfully',
      data,
    });
  })
);

/**
 * GET /api/dashboard/superadmin
 *
 * Returns platform-wide statistics for the super admin dashboard:
 * total expos, total attendees, total applications, total check-ins, and
 * the 5 most recently created expos with organizer names.
 *
 * Access: Super admin only
 */
router.get(
  '/superadmin',
  authenticate,
  authorize('superadmin'),
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const data = await StatsService.getSuperAdminDashboard();
    return res.status(200).json({
      success: true,
      message: 'Super admin dashboard retrieved successfully',
      data,
    });
  })
);

export default router;
