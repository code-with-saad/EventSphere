import { Router, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import SessionService from '../services/session.service';
import { authenticate, authenticateOptional, AuthRequest } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';

const router = Router();

// ── Route ordering: literal paths before wildcard params ──────────────────────

/**
 * GET /:expoId/sessions/registered/mine
 *
 * Returns all sessions the logged-in attendee is registered for in this expo.
 *
 * Access: Authenticated attendee
 */
router.get(
  '/:expoId/sessions/registered/mine',
  authenticate,
  authorize('attendee'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const sessions = await SessionService.getMyRegisteredSessions(
      req.params.expoId as string,
      req.user!.userId
    );

    return res.status(200).json({
      success: true,
      message: 'Registered sessions retrieved successfully',
      data: { sessions },
    });
  })
);

/**
 * GET /:expoId/sessions
 *
 * Returns all sessions for the given expo (enriched with registration count/status if authed).
 *
 * Access: Public / Optionally Authenticated
 */
router.get(
  '/:expoId/sessions',
  authenticateOptional,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const sessions = await SessionService.listByExpo(
      req.params.expoId as string,
      req.user?.userId
    );

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
        speakerId: req.body.speakerId,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        room: req.body.room,
        capacity: req.body.capacity !== undefined && req.body.capacity !== '' ? Number(req.body.capacity) : undefined,
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
 * POST /:expoId/sessions/:id/register
 *
 * Register logged-in attendee for a session.
 *
 * Access: Authenticated attendee
 */
router.post(
  '/:expoId/sessions/:id/register',
  authenticate,
  authorize('attendee'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const registration = await SessionService.registerSession(
      req.params.id as string,
      req.user!.userId
    );

    return res.status(201).json({
      success: true,
      message: 'Successfully registered for session',
      data: { registration },
    });
  })
);

/**
 * DELETE /:expoId/sessions/:id/register
 *
 * Cancel registration for a session.
 *
 * Access: Authenticated attendee
 */
router.delete(
  '/:expoId/sessions/:id/register',
  authenticate,
  authorize('attendee'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await SessionService.unregisterSession(
      req.params.id as string,
      req.user!.userId
    );

    return res.status(200).json({
      success: true,
      message: 'Session registration cancelled successfully',
    });
  })
);

/**
 * GET /:expoId/sessions/:id/registrations
 *
 * List registered attendees for a session.
 *
 * Access: Organizer only
 */
router.get(
  '/:expoId/sessions/:id/registrations',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const registrations = await SessionService.listSessionRegistrations(
      req.params.id as string,
      req.user!.userId
    );

    return res.status(200).json({
      success: true,
      message: 'Session registrations retrieved successfully',
      data: { registrations },
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
    if (updateData.capacity !== undefined) {
      updateData.capacity = updateData.capacity !== '' && updateData.capacity !== null ? Number(updateData.capacity) : undefined;
    }

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

