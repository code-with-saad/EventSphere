import { Router, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import ExpoService from '../services/expo.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import type { ExpoListStatusFilter } from '../services/expo.service';

const router = Router();

/**
 * GET /api/expos
 *
 * Paginated public listing of published/ongoing/completed expos.
 * Supports query params: page, limit, status ('upcoming'|'ongoing'|'completed'), search.
 *
 * Access: Public (no auth)
 *
 * Requirements: REQ-1.2, REQ-1.5, REQ-1.6, REQ-1.8
 */
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit, status, search } = req.query;

    const query = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as ExpoListStatusFilter | undefined,
      search: search as string | undefined,
    };

    const result = await ExpoService.listPublic(query);

    return res.status(200).json({
      success: true,
      message: 'Expos retrieved successfully',
      data: result,
    });
  })
);

/**
 * GET /api/organizer/expos
 *
 * Returns all expos belonging to the authenticated organizer.
 * Route path is '/expos' because this router is also mounted at /api/organizer.
 *
 * IMPORTANT: This route MUST be defined before GET /:id to prevent the
 * wildcard from swallowing the literal "/expos" segment.
 *
 * Access: Organizer only
 *
 * Requirements: REQ-2.7
 */
router.get(
  '/expos',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const expos = await ExpoService.listByOrganizer(req.user!.userId);

    return res.status(200).json({
      success: true,
      message: 'Organizer expos retrieved successfully',
      data: { expos },
    });
  })
);

/**
 * GET /api/organizer/expos/:id
 *
 * Returns full expo detail for the owning organizer regardless of status.
 * Used by EditExpoPage to fetch draft expos (getPublicDetail rejects drafts).
 *
 * Access: Organizer only (must own the expo)
 */
router.get(
  '/expos/:id',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const expo = await ExpoService.getById(
      req.params.id as string,
      req.user!.userId
    );

    return res.status(200).json({
      success: true,
      message: 'Expo retrieved successfully',
      data: { expo },
    });
  })
);

/**
 * GET /api/expos/:id
 *
 * Full expo detail including approved exhibitor list.
 *
 * Access: Public (no auth)
 *
 * Requirements: REQ-1.4
 */
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const expo = await ExpoService.getPublicDetail(req.params.id as string);

    return res.status(200).json({
      success: true,
      message: 'Expo retrieved successfully',
      data: { expo },
    });
  })
);

/**
 * POST /api/expos
 *
 * Create a new expo in draft status.
 * Associates the expo with the authenticated organizer's userId.
 *
 * Access: Organizer only
 *
 * Requirements: REQ-2.1, REQ-2.2, REQ-2.3
 */
router.post(
  '/',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const expo = await ExpoService.create(req.user!.userId, req.body);

    return res.status(201).json({
      success: true,
      message: 'Expo created successfully',
      data: { expo },
    });
  })
);

/**
 * PATCH /api/expos/:id
 *
 * Partially update an expo's fields. Ownership validated inside the service.
 *
 * Access: Organizer only (must own the expo)
 *
 * Requirements: REQ-2.8
 */
router.patch(
  '/:id',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const expo = await ExpoService.update(
      req.params.id as string,
      req.user!.userId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: 'Expo updated successfully',
      data: { expo },
    });
  })
);

/**
 * PATCH /api/expos/:id/status
 *
 * Transition an expo to a new status. Ownership validated inside the service.
 * Body: { status: ExpoStatus, confirmed?: boolean }
 *
 * Access: Organizer only (must own the expo)
 *
 * Requirements: REQ-2.9, REQ-2.10, REQ-2.16
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, confirmed } = req.body;

    const expo = await ExpoService.transition(
      req.params.id as string,
      req.user!.userId,
      status,
      confirmed === true || confirmed === 'true'
    );

    return res.status(200).json({
      success: true,
      message: `Status updated to ${expo.status}`,
      data: { expo },
    });
  })
);

/**
 * GET /api/expos/:id/cascade-preview
 *
 * Returns pre-flight counts for the cascade confirmation gate:
 * active tickets, pending applications, approved applications.
 *
 * Access: Organizer only
 *
 * Requirements: REQ-2.16
 */
router.get(
  '/:id/cascade-preview',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const preview = await ExpoService.getCascadePreview(req.params.id as string);

    return res.status(200).json({
      success: true,
      message: 'Cascade preview retrieved successfully',
      data: preview,
    });
  })
);

/**
 * DELETE /api/expos/:id
 *
 * Permanently delete an expo. Cascade gate applies.
 * Query param: confirmed=true required when cascade preview has non-zero counts.
 *
 * Access: Organizer only (must own the expo)
 *
 * Requirements: REQ-2.11, REQ-2.12, REQ-2.16
 */
router.delete(
  '/:id',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const confirmed =
      req.query.confirmed === 'true' || req.body?.confirmed === true;

    await ExpoService.delete(req.params.id as string, req.user!.userId, confirmed);

    return res.status(200).json({
      success: true,
      message: 'Expo deleted successfully',
    });
  })
);

/**
 * GET /api/expos/:id/stats
 *
 * Per-expo statistics for the organizer dashboard:
 * applications by status, registrations, check-ins, booth fill rate.
 *
 * Access: Organizer only (must own the expo)
 *
 * Requirements: REQ-10.2
 */
router.get(
  '/:id/stats',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await ExpoService.getExpoStats(
      req.params.id as string,
      req.user!.userId
    );

    return res.status(200).json({
      success: true,
      message: 'Expo stats retrieved successfully',
      data: stats,
    });
  })
);

export default router;

