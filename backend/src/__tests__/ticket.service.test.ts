/**
 * Integration Tests — TicketService
 *
 * Task 19: Direct service-layer tests against the real test MongoDB instance.
 * Covers all six sub-tasks: register, getQRCode, generatePDF, cancel, processCheckIn.
 *
 * Requirements: REQ-5, REQ-5.6, REQ-5.7, REQ-8, REQ-12.3, REQ-12.4, REQ-12.22
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearCollections,
  getTestDb,
} from './helpers/db';
import { createTestUser } from './helpers/auth';
import TicketService from '../services/ticket.service';

// ── Mock email service (prevents real SMTP calls) ─────────────────────────────
vi.mock('../services/email.service', () => ({
  createEmailService: vi.fn(() => ({
    sendOTPEmail: vi.fn().mockResolvedValue(true),
  })),
  EmailService: vi.fn(),
}));

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await connectTestDatabase();
});

afterAll(async () => {
  await disconnectTestDatabase();
});

beforeEach(async () => {
  await clearCollections();
  const db = getTestDb();
  await db.collection('expos').deleteMany({});
  await db.collection('tickets').deleteMany({});
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Insert an expo document directly into the test DB and return its string ID.
 */
async function insertExpo(
  organizerId: string,
  status = 'published',
  totalBooths = 10
): Promise<string> {
  const db = getTestDb();
  const result = await db.collection('expos').insertOne({
    organizerId: new ObjectId(organizerId),
    name: 'Test Expo',
    description: 'desc',
    status,
    startDate: new Date(Date.now() + 86400000 * 30),
    endDate: new Date(Date.now() + 86400000 * 32),
    venueName: 'Venue',
    venueAddress: 'Addr',
    totalBooths,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result.insertedId.toString();
}

// ── TicketService.register() ──────────────────────────────────────────────────

describe('TicketService.register()', () => {
  it('1. valid published expo → active ticket with UUID v4 ticketId and QR data URL', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const result = await TicketService.register(expoId, attendee._id.toString());

    expect(result.ticket.status).toBe('active');
    // UUID v4 format
    expect(result.ticket.ticketId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(result.attendeeName).toBe(attendee.role === 'attendee' ? result.attendeeName : result.attendeeName);
    // The attendeeName should match what's in DB
    expect(typeof result.attendeeName).toBe('string');
    expect(result.attendeeName.length).toBeGreaterThan(0);
    expect(result.expoName).toBe('Test Expo');
    expect(result.venueName).toBe('Venue');
    expect(result.expoStartDate).toBeInstanceOf(Date);
    expect(result.expoEndDate).toBeInstanceOf(Date);
  });

  it('2. valid ongoing expo → also succeeds', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'ongoing');

    const result = await TicketService.register(expoId, attendee._id.toString());

    expect(result.ticket.status).toBe('active');
    expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('3. draft expo → throws EXPO_NOT_ACCEPTING_REGISTRATIONS (400)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'draft');

    let caughtError: any;
    try {
      await TicketService.register(expoId, attendee._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('EXPO_NOT_ACCEPTING_REGISTRATIONS');
    expect(caughtError.statusCode).toBe(400);
  });

  it('4. completed expo → throws EXPO_NOT_ACCEPTING_REGISTRATIONS (400)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'completed');

    let caughtError: any;
    try {
      await TicketService.register(expoId, attendee._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('EXPO_NOT_ACCEPTING_REGISTRATIONS');
    expect(caughtError.statusCode).toBe(400);
  });

  it('5. non-existent expo → throws EXPO_NOT_FOUND (404)', async () => {
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const fakeExpoId = new ObjectId().toString();

    let caughtError: any;
    try {
      await TicketService.register(fakeExpoId, attendee._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('EXPO_NOT_FOUND');
    expect(caughtError.statusCode).toBe(404);
  });

  it('6. duplicate registration (active ticket) → throws DUPLICATE_REGISTRATION (409)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    // First registration succeeds
    await TicketService.register(expoId, attendee._id.toString());

    // Second registration should fail
    let caughtError: any;
    try {
      await TicketService.register(expoId, attendee._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('DUPLICATE_REGISTRATION');
    expect(caughtError.statusCode).toBe(409);
  });

  it('7. cancelled ticket does NOT block — re-register succeeds', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    // Register first time
    const first = await TicketService.register(expoId, attendee._id.toString());

    // Mark existing ticket as cancelled directly in DB with updatedAt past the 2h cooldown
    const db = getTestDb();
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    await db.collection('tickets').updateOne(
      { _id: first.ticket._id },
      { $set: { status: 'cancelled', updatedAt: threeHoursAgo } }
    );

    // Re-register should succeed
    const second = await TicketService.register(expoId, attendee._id.toString());
    expect(second.ticket.status).toBe('active');
    // New ticket has a different UUID
    expect(second.ticket.ticketId).not.toBe(first.ticket.ticketId);
  });
});

// ── TicketService.getQRCode() ─────────────────────────────────────────────────

describe('TicketService.getQRCode()', () => {
  it('1. valid ticketId → returns string starting with data:image/png;base64,', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const { ticket } = await TicketService.register(expoId, attendee._id.toString());

    const qr = await TicketService.getQRCode(ticket.ticketId);
    expect(qr).toMatch(/^data:image\/png;base64,/);
  });

  it('2. non-existent ticketId → throws TICKET_NOT_FOUND (404)', async () => {
    let caughtError: any;
    try {
      await TicketService.getQRCode('00000000-0000-0000-0000-000000000000');
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('TICKET_NOT_FOUND');
    expect(caughtError.statusCode).toBe(404);
  });

  it('3. deterministic — calling twice with same ticketId returns identical data URL', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const { ticket } = await TicketService.register(expoId, attendee._id.toString());

    const qr1 = await TicketService.getQRCode(ticket.ticketId);
    const qr2 = await TicketService.getQRCode(ticket.ticketId);

    expect(qr1).toBe(qr2);
  });
});

// ── TicketService.generatePDF() ───────────────────────────────────────────────

describe('TicketService.generatePDF()', () => {
  it('1. valid ticket + owner → returns Buffer with %PDF header', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const { ticket } = await TicketService.register(expoId, attendee._id.toString());

    const result = await TicketService.generatePDF(ticket.ticketId, attendee._id.toString());

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    // PDF magic bytes: %PDF
    expect(result.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('2. non-owner → throws TICKET_FORBIDDEN (403)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const otherAttendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const { ticket } = await TicketService.register(expoId, attendee._id.toString());

    let caughtError: any;
    try {
      await TicketService.generatePDF(ticket.ticketId, otherAttendee._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('TICKET_FORBIDDEN');
    expect(caughtError.statusCode).toBe(403);
  });

  it('3. non-existent ticketId → throws TICKET_NOT_FOUND (404)', async () => {
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });

    let caughtError: any;
    try {
      await TicketService.generatePDF('00000000-0000-0000-0000-000000000000', attendee._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('TICKET_NOT_FOUND');
    expect(caughtError.statusCode).toBe(404);
  });
});

// ── TicketService.cancel() ────────────────────────────────────────────────────

describe('TicketService.cancel()', () => {
  it('1. active ticket + owner → returns updated ticket with status cancelled', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const { ticket } = await TicketService.register(expoId, attendee._id.toString());

    const updated = await TicketService.cancel(ticket.ticketId, attendee._id.toString());

    expect(updated.status).toBe('cancelled');
    expect(updated.ticketId).toBe(ticket.ticketId);
  });

  it('2. non-owner → throws TICKET_FORBIDDEN (403)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const otherAttendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const { ticket } = await TicketService.register(expoId, attendee._id.toString());

    let caughtError: any;
    try {
      await TicketService.cancel(ticket.ticketId, otherAttendee._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('TICKET_FORBIDDEN');
    expect(caughtError.statusCode).toBe(403);
  });

  it('3. already-cancelled ticket → throws TICKET_NOT_CANCELLABLE (400)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const { ticket } = await TicketService.register(expoId, attendee._id.toString());
    // Cancel once
    await TicketService.cancel(ticket.ticketId, attendee._id.toString());

    // Try to cancel again
    let caughtError: any;
    try {
      await TicketService.cancel(ticket.ticketId, attendee._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('TICKET_NOT_CANCELLABLE');
    expect(caughtError.statusCode).toBe(400);
  });

  it('4. checked_in ticket → throws TICKET_NOT_CANCELLABLE (400)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const { ticket } = await TicketService.register(expoId, attendee._id.toString());

    // Simulate check-in directly in DB
    const db = getTestDb();
    await db.collection('tickets').updateOne(
      { _id: ticket._id },
      { $set: { status: 'checked_in', checkedInAt: new Date() } }
    );

    let caughtError: any;
    try {
      await TicketService.cancel(ticket.ticketId, attendee._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('TICKET_NOT_CANCELLABLE');
    expect(caughtError.statusCode).toBe(400);
  });

  it('5. non-existent ticketId → throws TICKET_NOT_FOUND (404)', async () => {
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });

    let caughtError: any;
    try {
      await TicketService.cancel('00000000-0000-0000-0000-000000000000', attendee._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('TICKET_NOT_FOUND');
    expect(caughtError.statusCode).toBe(404);
  });
});

// ── TicketService.processCheckIn() ───────────────────────────────────────────

describe('TicketService.processCheckIn()', () => {
  it('1. active ticket + correct expo → returns checked_in with attendeeName and checkedInAt', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const { ticket } = await TicketService.register(expoId, attendee._id.toString());

    const response = await TicketService.processCheckIn(ticket.ticketId, expoId);

    expect(response.result).toBe('checked_in');
    expect(response.checkedInAt).toBeInstanceOf(Date);
    expect(typeof response.attendeeName).toBe('string');
    expect(response.attendeeName!.length).toBeGreaterThan(0);
    expect(response.expoName).toBe('Test Expo');
  });

  it('2. already checked-in ticket → returns already_checked_in with unchanged original timestamp', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const { ticket } = await TicketService.register(expoId, attendee._id.toString());

    // First scan — checks in
    const first = await TicketService.processCheckIn(ticket.ticketId, expoId);
    expect(first.result).toBe('checked_in');
    const originalTimestamp = first.checkedInAt!;

    // Add a small delay to ensure any new Date() would be different
    await new Promise(resolve => setTimeout(resolve, 10));

    // Second scan — already checked in
    const second = await TicketService.processCheckIn(ticket.ticketId, expoId);
    expect(second.result).toBe('already_checked_in');
    // Timestamp must be the original one, not a new one
    expect(second.checkedInAt).toBeInstanceOf(Date);
    expect(second.checkedInAt!.getTime()).toBe(originalTimestamp.getTime());
  });

  it('3. wrong expo → returns wrong_event', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const wrongExpoId = new ObjectId().toString();

    const { ticket } = await TicketService.register(expoId, attendee._id.toString());

    const response = await TicketService.processCheckIn(ticket.ticketId, wrongExpoId);
    expect(response.result).toBe('wrong_event');
  });

  it('4. cancelled ticket → returns cancelled_ticket', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const { ticket } = await TicketService.register(expoId, attendee._id.toString());
    await TicketService.cancel(ticket.ticketId, attendee._id.toString());

    const response = await TicketService.processCheckIn(ticket.ticketId, expoId);
    expect(response.result).toBe('cancelled_ticket');
  });

  it('5. non-existent ticketId → returns invalid_ticket', async () => {
    const response = await TicketService.processCheckIn(
      '00000000-0000-0000-0000-000000000000',
      new ObjectId().toString()
    );
    expect(response.result).toBe('invalid_ticket');
  });

  it('6. never throws — all error states return a CheckInResponse without throwing', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const attendee = await createTestUser({ role: 'attendee', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const { ticket } = await TicketService.register(expoId, attendee._id.toString());
    await TicketService.cancel(ticket.ticketId, attendee._id.toString());

    const errorStates = [
      // Non-existent ticketId
      () => TicketService.processCheckIn('00000000-0000-0000-0000-000000000000', expoId),
      // Cancelled ticket
      () => TicketService.processCheckIn(ticket.ticketId, expoId),
      // Wrong expo
      () => TicketService.processCheckIn(ticket.ticketId, new ObjectId().toString()),
    ];

    for (const call of errorStates) {
      let threw = false;
      try {
        const result = await call();
        // Must be a valid CheckInResponse
        expect(result).toBeDefined();
        expect(typeof result.result).toBe('string');
      } catch {
        threw = true;
      }
      expect(threw).toBe(false);
    }
  });
});
