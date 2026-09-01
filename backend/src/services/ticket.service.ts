import { ObjectId } from 'mongodb';
import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import TicketModel from '../models/Ticket.model';
import ExpoModel from '../models/Expo.model';
import UserModel from '../models/User.model';
import type { ITicket } from '../models/Ticket.model';

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
  | 'wrong_event';

export interface CheckInResponse {
  result: CheckInResult;
  attendeeName?: string;
  expoName?: string;
  checkedInAt?: Date;
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
    const existingTicket = await TicketModel.findByExpoAndAttendee(expoId, attendeeId);
    if (
      existingTicket &&
      (existingTicket.status === 'active' || existingTicket.status === 'checked_in')
    ) {
      throw createError(
        'You are already registered for this expo',
        'DUPLICATE_REGISTRATION',
        409
      );
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

    // 8. Return full registration response
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
   *  - 'wrong_event'       — ticket is for a different expo
   *
   * @param ticketId — UUID v4 string scanned from QR
   * @param expoId   — string ID of the expo where the scanner is operating
   * @returns CheckInResponse (never throws)
   */
  async processCheckIn(ticketId: string, expoId: string): Promise<CheckInResponse> {
    // 1. Look up ticket
    const ticket = await TicketModel.findByTicketId(ticketId);
    if (!ticket) {
      return { result: 'invalid_ticket' };
    }

    // 2. Cancelled ticket
    if (ticket.status === 'cancelled') {
      return { result: 'cancelled_ticket' };
    }

    // 3. Wrong expo
    if (ticket.expoId.toString() !== expoId) {
      return { result: 'wrong_event' };
    }

    // 4. Already checked in — return original checkedInAt timestamp
    if (ticket.status === 'checked_in') {
      const [attendee, expo] = await Promise.all([
        UserModel.findById(ticket.attendeeId),
        ExpoModel.findById(ticket.expoId),
      ]);
      return {
        result: 'already_checked_in',
        checkedInAt: ticket.checkedInAt,
        attendeeName: attendee?.fullName,
        expoName: expo?.name,
      };
    }

    // 5. Active ticket — perform check-in (REQ-8, REQ-12.4)
    if (ticket.status === 'active') {
      const updated = await TicketModel.updateById(ticket._id, {
        status: 'checked_in',
        checkedInAt: new Date(),
      });

      const [attendee, expo] = await Promise.all([
        UserModel.findById(ticket.attendeeId),
        ExpoModel.findById(ticket.expoId),
      ]);

      return {
        result: 'checked_in',
        checkedInAt: updated?.checkedInAt,
        attendeeName: attendee?.fullName,
        expoName: expo?.name,
      };
    }

    // Fallback — should not be reached given current TicketStatus values
    return { result: 'invalid_ticket' };
  }
}

export default new TicketService();
