import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import asyncHandler from '../utils/asyncHandler';
import ApplicationService from '../services/application.service';
import ApplicationModel from '../models/Application.model';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { applicationSubmissionLimiter } from '../middleware/rateLimit.middleware';
import type { IApplicationCreate } from '../models/Application.model';

const router = Router();

// ── Route ordering: more-specific paths before wildcard params ─────────────────

/**
 * GET /:expoId/applications/mine
 *
 * Returns the authenticated exhibitor's own application for the given expo,
 * or null if they have not applied yet.
 *
 * Access: Exhibitor only
 *
 * Requirements: REQ-3.6, REQ-3.8
 */
router.get(
  '/:expoId/applications/mine',
  authenticate,
  authorize('exhibitor'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const application = await ApplicationService.getByExhibitorAndExpo(
      req.user!.userId,
      req.params.expoId as string
    );

    return res.status(200).json({
      success: true,
      message: 'Application retrieved successfully',
      data: { application },
    });
  })
);

/**
 * GET /:expoId/applications
 *
 * Returns all applications for the given expo grouped by status, plus
 * booth fill-rate metadata.
 *
 * Access: Organizer only (must own the expo)
 *
 * Requirements: REQ-4, REQ-4.1
 */
router.get(
  '/:expoId/applications',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await ApplicationService.listForExpo(
      req.params.expoId as string,
      req.user!.userId
    );

    return res.status(200).json({
      success: true,
      message: 'Applications retrieved successfully',
      data: { ...result },
    });
  })
);

/**
 * POST /:expoId/applications
 *
 * Submit a new exhibitor application for the given expo.
 *
 * Access: Exhibitor only
 *
 * Requirements: REQ-3, REQ-3.1, REQ-3.6, REQ-3.7, REQ-3.11
 */
router.post(
  '/:expoId/applications',
  applicationSubmissionLimiter,
  authenticate,
  authorize('exhibitor'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const data: IApplicationCreate = {
      expoId: new ObjectId(req.params.expoId as string),
      exhibitorId: new ObjectId(req.user!.userId),
      companyName: req.body.companyName,
      companyDescription: req.body.companyDescription,
      category: req.body.category,
      phoneNumber: req.body.phoneNumber,
      websiteUrl: req.body.websiteUrl,
      logoUrl: req.body.logoUrl,
      organizerNote: req.body.organizerNote,
      preferredBooth: req.body.preferredBooth,
    };

    const application = await ApplicationService.submit(data);

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: { application },
    });
  })
);

/**
 * PATCH /:expoId/applications/:id/review
 *
 * Organizer review endpoint — handles approve, reject, and revokeApproval
 * based on `req.body.action`.
 *
 * Body: { action: 'approve' | 'reject' | 'revoke', boothLabel?: string, reason?: string }
 *
 * Access: Organizer only (must own the expo)
 *
 * Requirements: REQ-4.2, REQ-4.3, REQ-4.4, REQ-4.5, REQ-12.6
 */
router.patch(
  '/:expoId/applications/:id/review',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { action, boothLabel, reason } = req.body;

    if (action === 'approve') {
      const result = await ApplicationService.approve(
        req.params.id as string,
        req.user!.userId,
        boothLabel
      );

      return res.status(200).json({
        success: true,
        message: 'Application approved successfully',
        data: {
          application: result,
          overfillWarning: result.overfillWarning ?? false,
        },
      });
    }

    if (action === 'reject') {
      const application = await ApplicationService.reject(
        req.params.id as string,
        req.user!.userId,
        reason
      );

      return res.status(200).json({
        success: true,
        message: 'Application rejected successfully',
        data: { application },
      });
    }

    if (action === 'revoke') {
      const application = await ApplicationService.revokeApproval(
        req.params.id as string,
        req.user!.userId
      );

      return res.status(200).json({
        success: true,
        message: 'Application approval revoked successfully',
        data: { application },
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid review action. Use: approve, reject, revoke',
    });
  })
);

/**
 * PATCH /:expoId/applications/:id
 *
 * Edit the details of a pending application.
 *
 * Access: Exhibitor only (must own the application)
 *
 * Requirements: REQ-3.9
 */
router.patch(
  '/:expoId/applications/:id',
  authenticate,
  authorize('exhibitor'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const application = await ApplicationService.edit(
      req.params.id as string,
      req.user!.userId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: 'Application updated successfully',
      data: { application },
    });
  })
);

/**
 * DELETE /:expoId/applications/:id
 *
 * Withdraw (hard-delete) a pending application.
 *
 * Access: Exhibitor only (must own the application)
 *
 * Requirements: REQ-3.10
 */
router.delete(
  '/:expoId/applications/:id',
  authenticate,
  authorize('exhibitor'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    await ApplicationService.withdraw(req.params.id as string, req.user!.userId);

    return res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully',
    });
  })
);

/**
 * GET /applications
 *
 * Returns all applications submitted by the authenticated exhibitor,
 * sorted by submission date descending.
 *
 * NOTE: This route is only meaningful when the router is mounted at
 * /api/exhibitor — the path resolves to GET /api/exhibitor/applications.
 *
 * Access: Exhibitor only
 *
 * Requirements: REQ-3.8
 */
router.get(
  '/applications',
  authenticate,
  authorize('exhibitor'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const applications = await ApplicationModel.findByExhibitor(req.user!.userId);

    return res.status(200).json({
      success: true,
      message: 'Applications retrieved successfully',
      data: { applications },
    });
  })
);

export default router;
