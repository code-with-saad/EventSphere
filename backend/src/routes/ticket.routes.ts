import { Router, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import TicketService from '../services/ticket.service';
import TicketModel from '../models/Ticket.model';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';

const router = Router();

// ── Route ordering: specific literal paths first, then wildcard params ─────────

/**
 * POST /:expoId/tickets
 *
 * Register an attendee for an expo and return the ticket with QR code.
 *
 * Mounted at /api/expos → resolves to POST /api/expos/:expoId/tickets
 *
 * Access: Attendee only
 *
 * Requirements: REQ-5, REQ-5.1, REQ-5.6, REQ-12.3, REQ-12.22
 */
router.post(
  '/:expoId/tickets',
  authenticate,
  authorize('attendee'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const registrationResponse = await TicketService.register(
      req.params.expoId as string,
      req.user!.userId
    );

    return res.status(201).json({
      success: true,
      message: 'Ticket registered successfully',
      data: { ...registrationResponse },
    });
  })
);

/**
 * GET /mine
 *
 * Return all tickets for the authenticated attendee, sorted by registration
 * date descending.
 *
 * Mounted at /api/tickets → resolves to GET /api/tickets/mine
 *
 * NOTE: Must be defined BEFORE /:ticketId to prevent "mine" matching as a param.
 *
 * Access: Attendee only
 *
 * Requirements: REQ-5.7
 */
router.get(
  '/mine',
  authenticate,
  authorize('attendee'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const tickets = await TicketModel.findByAttendee(req.user!.userId);

    return res.status(200).json({
      success: true,
      message: 'Tickets retrieved successfully',
      data: { tickets },
    });
  })
);

/**
 * POST /checkin
 *
 * Process a QR scan check-in. Always returns HTTP 200 — the `result`
 * discriminator in the response body drives the scanner UI state.
 *
 * Body: { ticketId: string, expoId: string }
 *
 * Mounted at /api/tickets → resolves to POST /api/tickets/checkin
 *
 * NOTE: Must be defined BEFORE /:ticketId routes.
 *
 * Access: Organizer only
 *
 * Requirements: REQ-8, REQ-12.4
 */
router.post(
  '/checkin',
  authenticate,
  authorize('organizer'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { ticketId, expoId } = req.body as { ticketId: string; expoId: string };
    const checkInResponse = await TicketService.processCheckIn(ticketId, expoId);

    // Always HTTP 200 — result discriminator handles UI state (never throws)
    return res.status(200).json({
      success: true,
      data: { ...checkInResponse },
    });
  })
);

/**
 * GET /:ticketId/pdf
 *
 * Generate and stream a PDF ticket to the client for download.
 *
 * Mounted at /api/tickets → resolves to GET /api/tickets/:ticketId/pdf
 *
 * NOTE: Must be defined BEFORE /:ticketId to avoid pdf being consumed as a param.
 *
 * Access: Attendee only (must own the ticket)
 *
 * Requirements: REQ-5.7
 */
router.get(
  '/:ticketId/pdf',
  authenticate,
  authorize('attendee'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const pdfBuffer = await TicketService.generatePDF(
      req.params.ticketId as string,
      req.user!.userId
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ticket-${req.params.ticketId}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
    return;
  })
);

/**
 * PATCH /:ticketId/cancel
 *
 * Cancel an active ticket.
 *
 * Mounted at /api/tickets → resolves to PATCH /api/tickets/:ticketId/cancel
 *
 * Access: Attendee only (must own the ticket)
 *
 * Requirements: REQ-5, REQ-5.7
 */
router.patch(
  '/:ticketId/cancel',
  authenticate,
  authorize('attendee'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ticket = await TicketService.cancel(
      req.params.ticketId as string,
      req.user!.userId
    );

    return res.status(200).json({
      success: true,
      message: 'Ticket cancelled successfully',
      data: { ticket },
    });
  })
);

/**
 * GET /:ticketId
 *
 * Return a single ticket by its UUID ticketId.
 *
 * Mounted at /api/tickets → resolves to GET /api/tickets/:ticketId
 *
 * NOTE: Must be defined AFTER /mine and /:ticketId/pdf to avoid shadowing them.
 *
 * Access: Attendee only
 *
 * Requirements: REQ-5.7
 */
router.get(
  '/:ticketId',
  authenticate,
  authorize('attendee'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const ticket = await TicketModel.findByTicketId(req.params.ticketId as string);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
        code: 'TICKET_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Ticket retrieved successfully',
      data: { ticket },
    });
  })
);

export default router;
