import { Router, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import BookmarkService from '../services/bookmark.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';

const router = Router();

// ── Route ordering: literal paths before wildcard params ──────────────────────

/**
 * GET /:expoId/bookmarks/mine
 *
 * Returns all bookmarked sessions for the authenticated attendee within
 * a specific expo.
 *
 * Access: Attendee only
 */
router.get(
  '/:expoId/bookmarks/mine',
  authenticate,
  authorize('attendee'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const sessions = await BookmarkService.listForAttendeeAndExpo(
      req.user!.userId,
      req.params.expoId as string
    );

    return res.status(200).json({
      success: true,
      message: 'Bookmarked sessions retrieved successfully',
      data: { sessions },
    });
  })
);

/**
 * POST /:expoId/sessions/:sessionId/bookmarks
 *
 * Bookmark a session for the authenticated attendee.
 *
 * Access: Attendee only
 */
router.post(
  '/:expoId/sessions/:sessionId/bookmarks',
  authenticate,
  authorize('attendee'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const bookmark = await BookmarkService.add(
      req.params.sessionId as string,
      req.user!.userId
    );

    return res.status(201).json({
      success: true,
      message: 'Session bookmarked successfully',
      data: { bookmark },
    });
  })
);

/**
 * DELETE /:expoId/sessions/:sessionId/bookmarks
 *
 * Remove a bookmark for the authenticated attendee.
 *
 * Access: Attendee only
 */
router.delete(
  '/:expoId/sessions/:sessionId/bookmarks',
  authenticate,
  authorize('attendee'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await BookmarkService.remove(req.params.sessionId as string, req.user!.userId);

    return res.status(200).json({
      success: true,
      message: 'Bookmark removed successfully',
    });
  })
);

export default router;
