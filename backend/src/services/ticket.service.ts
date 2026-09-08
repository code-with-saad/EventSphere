import { ObjectId } from 'mongodb';
import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import TicketModel from '../models/Ticket.model';
import ExpoModel from '../models/Expo.model';
import UserModel from '../models/User.model';
import type { ITicket } from '../models/Ticket.model';
import EmailService from './email.service';

/**
 * TicketService
 *
 * Handles all ticket business logic: registration, QR generation, PDF generation,
 * cancellation, and QR check-in processing.
 *
 * Requirements: REQ-5, REQ-5.6, REQ-5.7, REQ-8, REQ-12.3, REQ-12.4, REQ-12.22
 */

// ---------------------------------------------------------------------------
// Types / DTOs
// ---------------------------------------------------------------------------

export interface TicketRegistrationResponse {
  ticket: ITicket;
  qrCodeDataUrl: string;
  expoName: string;
  expoStartDate: Date;
  expoEndDate: Date;
  venueName: string;
  attendeeName: string;
}

export type CheckInResult =
  | 'checked_in'
  | 'already_checked_in'
  | 'invalid_ticket'
  | 'cancelled_ticket'
  | 'wrong_event'
  | 'event_ended';

export interface CheckInResponse {
  result: CheckInResult;
  attendeeName?: string;
  expoName?: string;
  checkedInAt?: Date;
  canCheckInAt?: Date;
  checkInCount?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a plain Error with statusCode and code fields matching Phase 1 pattern.
 */
function createError(message: string, code: string, statusCode: number): Error {
  const err: any = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

// ---------------------------------------------------------------------------
// TicketService class
// ---------------------------------------------------------------------------

class TicketService {
  // -------------------------------------------------------------------------
  // 19a — register()
  // -------------------------------------------------------------------------

  /**
   * Register an attendee for an expo and generate a QR-coded ticket.
   *
   * Validates:
   * 1. Expo exists (EXPO_NOT_FOUND 404)
   * 2. Expo is accepting registrations — status must be 'published' or 'ongoing'
   *    (EXPO_NOT_ACCEPTING_REGISTRATIONS 400)
   * 3. Attendee exists (USER_NOT_FOUND 404)
   * 4. No existing active/checked_in ticket for (attendeeId, expoId)
   *    (DUPLICATE_REGISTRATION 409)
   *
   * On success:
   *  - Generates a UUID v4 ticketId
   *  - Generates a QR PNG data URL
   *  - Creates the ticket with status 'active'
   *  - Returns full registration response with expo + attendee metadata
   *
   * @param expoId     — string expo ID
   * @param attendeeId — string attendee user ID
   * @returns TicketRegistrationResponse
   */
  async register(expoId: string, attendeeId: string): Promise<TicketRegistrationResponse> {
    // 1. Look up expo
    const expo = await ExpoModel.findById(expoId);
    if (!expo) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }

    // 2. Validate expo status — only published or ongoing accept registrations (REQ-5.1)
    if (expo.status !== 'published' && expo.status !== 'ongoing') {
      throw createError(
        'This expo is not currently accepting registrations',
        'EXPO_NOT_ACCEPTING_REGISTRATIONS',
        400
      );
    }

    // 3. Look up attendee
    const attendee = await UserModel.findById(attendeeId);
    if (!attendee) {
      throw createError('User not found', 'USER_NOT_FOUND', 404);
    }

    // 4. Check for existing active or checked_in ticket (REQ-5.6, Property 13)
    const existingActiveTicket = await TicketModel.findByExpoAndAttendee(expoId, attendeeId, [
      'active',
      'checked_in',
    ]);
    if (existingActiveTicket) {
      throw createError(
        'You are already registered for this expo',
        'DUPLICATE_REGISTRATION',
        409
      );
    }

    // 4b. Registration Cooldown: If the attendee cancelled a ticket within the last 2 hours, block re-registration
    const latestTicket = await TicketModel.findLatestByExpoAndAttendee(expoId, attendeeId);
    if (latestTicket && latestTicket.status === 'cancelled') {
      const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
      const cancelTime = new Date(latestTicket.updatedAt).getTime();
      const nowTime = Date.now();
      const diffMs = nowTime - cancelTime;

      if (diffMs < COOLDOWN_MS) {
        const remainingMinutes = Math.ceil((COOLDOWN_MS - diffMs) / (60 * 1000));
        throw createError(
          `You recently cancelled a ticket for this expo. Please wait ${remainingMinutes} minute(s) before registering again.`,
          'REGISTRATION_COOLDOWN',
          429
        );
      }
    }

    // 5. Generate UUID v4 ticketId (REQ-12.22)
    const ticketId = uuidv4();

    // 6. Generate QR PNG data URL (REQ-12.3)
    const qrCodeDataUrl = await this.generateQRPNG(ticketId);

    // 7. Create ticket record — model auto-sets status: 'active', registeredAt, updatedAt
    const ticket = await TicketModel.create({
      ticketId,
      expoId: new ObjectId(expoId),
      attendeeId: new ObjectId(attendeeId),
    });

    // 8. Fire-and-forget: send registration confirmation email to attendee
    const startDateStr = expo.startDate
      ? new Date(expo.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'TBD';
    EmailService.sendTicketRegistrationEmail(
      attendee.email,
      attendee.fullName || 'Attendee',
      expo.name,
      startDateStr,
      expo.venueName,
      ticketId
    ).catch((err) => console.error('[TicketService] Failed to send registration email:', err));

    // 9. Return full registration response
    return {
      ticket,
      qrCodeDataUrl,
      expoName: expo.name,
      expoStartDate: expo.startDate,
      expoEndDate: expo.endDate,
      venueName: expo.venueName,
      attendeeName: attendee.fullName,
    };
  }

  // -------------------------------------------------------------------------
  // 19b — private generateQRPNG()
  // -------------------------------------------------------------------------

  /**
   * Generate a QR code PNG as a base64 data URL for a given ticketId.
   *
   * Deterministic: the same ticketId always produces the same QR image
   * because the QR data, size, margin, and color are all fixed.
   *
   * @param ticketId — UUID v4 string to encode in the QR
   * @returns data URL string (`data:image/png;base64,...`)
   */
  private async generateQRPNG(ticketId: string): Promise<string> {
    return QRCode.toDataURL(ticketId, {
      width: 300,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    });
  }

  // -------------------------------------------------------------------------
  // 19c — getQRCode()
  // -------------------------------------------------------------------------

  /**
   * Return the QR code data URL for an existing ticket.
   *
   * Deterministic re-render — re-calls generateQRPNG() with the stored ticketId
   * so the output is always identical for the same ticket.
   *
   * Validates:
   * 1. Ticket exists by ticketId UUID string (TICKET_NOT_FOUND 404)
   *
   * @param ticketId — UUID v4 string of the ticket
   * @returns QR PNG data URL
   */
  async getQRCode(ticketId: string): Promise<string> {
    // 1. Look up ticket by UUID string field
    const ticket = await TicketModel.findByTicketId(ticketId);
    if (!ticket) {
      throw createError('Ticket not found', 'TICKET_NOT_FOUND', 404);
    }

    // 2. Deterministic re-render
    return this.generateQRPNG(ticket.ticketId);
  }

  // -------------------------------------------------------------------------
  // 19d — generatePDF()
  // -------------------------------------------------------------------------

  /**
   * Generate a PDF ticket document for download.
   *
   * Validates:
   * 1. Ticket exists by ticketId UUID string (TICKET_NOT_FOUND 404)
   * 2. Caller owns the ticket — attendeeId must match (TICKET_FORBIDDEN 403)
   * 3. Expo exists (EXPO_NOT_FOUND 404)
   * 4. Attendee user exists (USER_NOT_FOUND 404)
   *
   * Composes a 400×550 pt PDF with:
   *  - Expo name as heading
   *  - Attendee name
   *  - Date range (formatted)
   *  - Venue name
   *  - Embedded QR code PNG (~270×270)
   *  - Ticket ID in oblique font
   *  - Divider line
   *
   * @param ticketId   — UUID v4 string of the ticket
   * @param attendeeId — string attendee user ID (ownership check)
   * @returns PDF as a Node.js Buffer
   */
  async generatePDF(ticketId: string, attendeeId: string): Promise<Buffer> {
    // 1. Look up ticket
    const ticket = await TicketModel.findByTicketId(ticketId);
    if (!ticket) {
      throw createError('Ticket not found', 'TICKET_NOT_FOUND', 404);
    }

    // 2. Validate ownership
    if (ticket.attendeeId.toString() !== attendeeId) {
      throw createError(
        'You do not have permission to download this ticket',
        'TICKET_FORBIDDEN',
        403
      );
    }

    // 2b. Validate ticket is not cancelled
    if (ticket.status === 'cancelled') {
      throw createError(
        'This ticket has been cancelled. PDF download is not available.',
        'TICKET_CANCELLED',
        400
      );
    }

    // 3. Look up expo
    const expo = await ExpoModel.findById(ticket.expoId);
    if (!expo) {
      throw createError('Expo not found', 'EXPO_NOT_FOUND', 404);
    }

    // 3b. Validate expo has not ended (expired)
    if (expo.status === 'completed' || expo.status === 'archived') {
      throw createError(
        'This expo has ended. PDF ticket download is no longer available.',
        'EXPO_ENDED',
        400
      );
    }

    // 4. Look up attendee
    const attendee = await UserModel.findById(ticket.attendeeId);
    if (!attendee) {
      throw createError('User not found', 'USER_NOT_FOUND', 404);
    }

    // 5. Generate QR PNG data URL
    const qrDataUrl = await this.generateQRPNG(ticket.ticketId);

    // 6. Convert data URL to PNG bytes
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const pngBytes = Buffer.from(base64Data, 'base64');

    // 7. Compose PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 550]);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Embed QR PNG
    const qrImage = await pdfDoc.embedPng(pngBytes);
    const qrDims = qrImage.scale(0.9); // ~270×270

    // Title: expo name
    page.drawText(expo.name, {
      x: 40,
      y: 490,
      size: 18,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
      maxWidth: 320,
    });

    // Attendee name
    page.drawText(`Attendee: ${attendee.fullName}`, {
      x: 40,
      y: 460,
      size: 12,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Dates
    const formatDate = (d: Date) =>
      d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    page.drawText(
      `Date: ${formatDate(expo.startDate)} \u2013 ${formatDate(expo.endDate)}`,
      {
        x: 40,
        y: 440,
        size: 11,
        font: helvetica,
        color: rgb(0.2, 0.2, 0.2),
      }
    );

    // Venue
    page.drawText(`Venue: ${expo.venueName}`, {
      x: 40,
      y: 422,
      size: 11,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });

    // QR code image (centered horizontally on 400-wide page)
    const qrX = (400 - qrDims.width) / 2;
    page.drawImage(qrImage, {
      x: qrX,
      y: 130,
      width: qrDims.width,
      height: qrDims.height,
    });

    // Divider line
    page.drawLine({
      start: { x: 40, y: 115 },
      end: { x: 360, y: 115 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Ticket ID label
    page.drawText(`Ticket ID: ${ticket.ticketId}`, {
      x: 40,
      y: 100,
      size: 9,
      font: helveticaOblique,
      color: rgb(0.4, 0.4, 0.4),
      maxWidth: 320,
    });

    // 8. Serialize and return as Buffer
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  // -------------------------------------------------------------------------
  // 19e — cancel()
  // -------------------------------------------------------------------------

  /**
   * Cancel an active ticket.
   *
   * Validates:
   * 1. Ticket exists by ticketId UUID string (TICKET_NOT_FOUND 404)
   * 2. Caller owns the ticket — attendeeId must match (TICKET_FORBIDDEN 403)
   * 3. Ticket is currently active (TICKET_NOT_CANCELLABLE 400)
   *
   * @param ticketId   — UUID v4 string of the ticket
   * @param attendeeId — string attendee user ID (ownership check)
   * @returns The updated ITicket with status 'cancelled'
   */
  async cancel(ticketId: string, attendeeId: string): Promise<ITicket> {
    // 1. Look up ticket
    const ticket = await TicketModel.findByTicketId(ticketId);
    if (!ticket) {
      throw createError('Ticket not found', 'TICKET_NOT_FOUND', 404);
    }

    // 2. Validate ownership
    if (ticket.attendeeId.toString() !== attendeeId) {
      throw createError(
        'You do not have permission to cancel this ticket',
        'TICKET_FORBIDDEN',
        403
      );
    }

    // 3. Only active tickets can be cancelled
    if (ticket.status !== 'active') {
      throw createError(
        'Only active tickets can be cancelled',
        'TICKET_NOT_CANCELLABLE',
        400
      );
    }

    // 3b. Look up expo and verify event has not ended
    const expo = await ExpoModel.findById(ticket.expoId);
    if (expo && (expo.status === 'completed' || expo.status === 'archived')) {
      throw createError(
        'Cannot cancel ticket for an expo that has already ended',
        'EXPO_ENDED',
        400
      );
    }

    // 4. Persist cancellation
    const updated = await TicketModel.updateById(ticket._id, { status: 'cancelled' });
    if (!updated) {
      throw createError('Ticket not found', 'TICKET_NOT_FOUND', 404);
    }

    return updated;
  }

  // -------------------------------------------------------------------------
  // 19f — processCheckIn()
  // -------------------------------------------------------------------------

  /**
   * Process a QR scan check-in.
   *
   * Never throws — always returns a CheckInResponse with a discriminated result.
   * The route layer always returns HTTP 200; the result discriminator drives
   * the UI state on the scanner page.
   *
   * Result values:
   *  - 'checked_in'        — ticket was active and is now checked in
   *  - 'already_checked_in'— ticket was already checked in (includes original timestamp)
   *  - 'invalid_ticket'    — no ticket found for this ticketId
   *  - 'cancelled_ticket'  — ticket exists but is cancelled
   *  - 'wrong_event'       — ticket is for an expo not owned by this organizer (or mismatch)
   *
   * @param ticketId    — UUID v4 string scanned from QR
   * @param organizerId — string ID of the organizer performing the scan (optional for backwards-compat)
   * @param expoId      — optional string ID of the expo (if provided, must match ticket's expo)
   * @returns CheckInResponse (never throws)
   */
  async processCheckIn(
    ticketId: string,
    organizerId?: string,
    expoId?: string
  ): Promise<CheckInResponse> {
    // 1. Look up ticket
    const ticket = await TicketModel.findByTicketId(ticketId);
    if (!ticket) {
      return { result: 'invalid_ticket' };
    }

    // 2. Cancelled ticket
    if (ticket.status === 'cancelled') {
      return { result: 'cancelled_ticket' };
    }

    // 3. Look up expo to verify existence & organizer ownership
    const expo = await ExpoModel.findById(ticket.expoId);
    if (!expo) {
      return { result: 'invalid_ticket' };
    }

    // If organizerId is provided, check if it's the organizer ID or direct expoId matching
    if (organizerId) {
      const isOrganizerOwner = expo.organizerId.toString() === organizerId;
      const isMatchingExpoId = ticket.expoId.toString() === organizerId;
      if (!isOrganizerOwner && !isMatchingExpoId) {
        return { result: 'wrong_event' };
      }
    }

    // If explicit expoId was passed, verify it matches
    if (expoId && ticket.expoId.toString() !== expoId) {
      return { result: 'wrong_event' };
    }

    // 3b. Check if the expo has already concluded
    if (expo.status === 'completed' || expo.status === 'archived') {
      return {
        result: 'event_ended',
        expoName: expo.name,
      };
    }

    // 4. Ticket is in checked_in status — check for 24-hour multi-day cooldown
    if (ticket.status === 'checked_in') {
      const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
      const lastCheckIn = ticket.checkedInAt ? new Date(ticket.checkedInAt) : new Date(ticket.updatedAt);
      const now = new Date();
      const elapsedMs = now.getTime() - lastCheckIn.getTime();

      const attendee = await UserModel.findById(ticket.attendeeId);

      if (elapsedMs < COOLDOWN_MS) {
        const canCheckInAt = new Date(lastCheckIn.getTime() + COOLDOWN_MS);
        return {
          result: 'already_checked_in',
          checkedInAt: lastCheckIn,
          canCheckInAt,
          checkInCount: (ticket.checkIns?.length || 1),
          attendeeName: attendee?.fullName,
          expoName: expo.name,
        };
      }

      // Elapsed >= 24h: Record new check-in event
      const currentHistory = ticket.checkIns || [{ checkedInAt: lastCheckIn }];
      const newHistory = [...currentHistory, { checkedInAt: now }];

      await TicketModel.updateById(ticket._id, {
        checkedInAt: now,
        checkIns: newHistory,
      });

      return {
        result: 'checked_in',
        checkedInAt: now,
        checkInCount: newHistory.length,
        attendeeName: attendee?.fullName,
        expoName: expo.name,
      };
    }

    // 5. Active ticket — perform first check-in (REQ-8, REQ-12.4)
    if (ticket.status === 'active') {
      const now = new Date();
      const firstCheckIn = { checkedInAt: now };

      const updated = await TicketModel.updateById(ticket._id, {
        status: 'checked_in',
        checkedInAt: now,
        checkIns: [firstCheckIn],
      });

      const attendee = await UserModel.findById(ticket.attendeeId);

      return {
        result: 'checked_in',
        checkedInAt: updated?.checkedInAt || now,
        checkInCount: 1,
        attendeeName: attendee?.fullName,
        expoName: expo.name,
      };
    }

    // Fallback
    return { result: 'invalid_ticket' };
  }

  // -------------------------------------------------------------------------
  // 19g — getOrganizerAttendees()
  // -------------------------------------------------------------------------

  /**
   * Return attendees and check-in records for all expos owned by an organizer.
   */
  async getOrganizerAttendees(
    organizerId: string,
    filters?: { expoId?: string; status?: string; search?: string }
  ): Promise<{
    attendees: Array<{
      _id: string;
      ticketId: string;
      expoId: string;
      expoName: string;
      attendeeId: string;
      fullName: string;
      email: string;
      status: string;
      registeredAt: Date;
      checkedInAt?: Date;
      checkIns?: Array<{ checkedInAt: Date }>;
      checkInCount: number;
    }>;
    expos: Array<{ _id: string; name: string; status: string }>;
  }> {
    // 1. Fetch expos belonging to organizer
    const expos = await ExpoModel.findByOrganizer(organizerId);
    if (!expos || expos.length === 0) {
      return { attendees: [], expos: [] };
    }

    const expoMap = new Map(expos.map((e) => [e._id.toString(), e]));
    let targetExpoIds = expos.map((e) => e._id);

    if (filters?.expoId && filters.expoId !== 'all') {
      targetExpoIds = targetExpoIds.filter((id) => id.toString() === filters.expoId);
    }

    if (targetExpoIds.length === 0) {
      return {
        attendees: [],
        expos: expos.map((e) => ({ _id: e._id.toString(), name: e.name, status: e.status })),
      };
    }

    // 2. Query tickets
    const query: Record<string, unknown> = {
      expoId: { $in: targetExpoIds },
    };

    if (filters?.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    const tickets = await TicketModel.getCollection()
      .find(query)
      .sort({ registeredAt: -1 })
      .toArray();

    // 3. Populate attendee users
    const attendeeIds = tickets.map((t) => t.attendeeId);
    const users = await UserModel.getCollection()
      .find({ _id: { $in: attendeeIds } })
      .toArray();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    // 4. Assemble attendee list
    let attendeesList = tickets.map((t) => {
      const user = userMap.get(t.attendeeId.toString());
      const expo = expoMap.get(t.expoId.toString());
      const checkInList = t.checkIns || (t.checkedInAt ? [{ checkedInAt: t.checkedInAt }] : []);

      return {
        _id: t._id.toString(),
        ticketId: t.ticketId,
        expoId: t.expoId.toString(),
        expoName: expo?.name || 'Unknown Expo',
        attendeeId: t.attendeeId.toString(),
        fullName: user?.fullName || 'Unknown Attendee',
        email: user?.email || '',
        status: t.status,
        registeredAt: t.registeredAt,
        checkedInAt: t.checkedInAt,
        checkIns: checkInList,
        checkInCount: checkInList.length,
      };
    });

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      attendeesList = attendeesList.filter(
        (a) =>
          a.fullName.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.ticketId.toLowerCase().includes(q) ||
          a.expoName.toLowerCase().includes(q)
      );
    }

    return {
      attendees: attendeesList,
      expos: expos.map((e) => ({ _id: e._id.toString(), name: e.name, status: e.status })),
    };
  }
}

export default new TicketService();
