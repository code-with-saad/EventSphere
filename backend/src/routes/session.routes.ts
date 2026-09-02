import { Router, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import SessionService from '../services/session.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';

const router = Router();

// ── Route ordering: literal paths before wildcard params ──────────────────────

/**
 * GET /:expoId/sessions
 *
 * Returns all sessions for the given expo.
 *
 * Access: Public — no auth required (REQ-6.1, public schedule browse)
 */
router.get(
  '/:expoId/sessions',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const sessions = await SessionService.listByExpo(req.params.expoId as string);

    return res.status(200).json({
      success: true,
      message: 'Sessions retrieved successfully',
      data: { sessions },
    });
  })
);

/**
 * POST /:expoId/sessions
 *
 * Create a new session for the given expo.
 *
 * Access: Organizer only
 */
router.post(
  '/:expoId/sessions',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const session = await SessionService.create(
      req.params.expoId as string,
      req.user!.userId,
      {
        title: req.body.title,
        speakerName: req.body.speakerName,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        room: req.body.room,
        description: req.body.description,
        track: req.body.track,
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: { session },
    });
  })
);

/**
 * PATCH /:expoId/sessions/:id
 *
 * Update an existing session.
 *
 * Access: Organizer only
 */
router.patch(
  '/:expoId/sessions/:id',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Convert date strings to Date objects if present
    const updateData: any = { ...req.body };
    if (updateData.startTime) updateData.startTime = new Date(updateData.startTime);
    if (updateData.endTime) updateData.endTime = new Date(updateData.endTime);

    const session = await SessionService.update(
      req.params.id as string,
      req.user!.userId,
      updateData
    );

    return res.status(200).json({
      success: true,
      message: 'Session updated successfully',
      data: { session },
    });
  })
);

/**
 * DELETE /:expoId/sessions/:id
 *
 * Delete a session.
 *
 * Access: Organizer only
 */
router.delete(
  '/:expoId/sessions/:id',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await SessionService.delete(req.params.id as string, req.user!.userId);

    return res.status(200).json({
      success: true,
      message: 'Session deleted successfully',
    });
  })
);

export default router;
