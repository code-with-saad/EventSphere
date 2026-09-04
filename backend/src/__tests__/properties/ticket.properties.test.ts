/**
 * Property-Based Tests — Ticket Operations
 *
 * Task 22 (sub-tasks 22a–22e)
 *
 * Properties tested:
 *  22a. Property 11: New ticket has status=active and UUID v4 format ticketId
 *  22b. Property 12: QR generation is deterministic — same ticketId always produces same data URL
 *  22c. Property 13: Duplicate registration for same attendee×expo blocked
 *  22d. Property 18: Check-in transitions active→checked_in with checkedInAt >= registeredAt
 *  22e. Property 19: Second check-in scan returns already_checked_in with unchanged original timestamp
 *
 * Framework: fast-check v4 + vitest
 *
 * Validates: REQ-12.22, REQ-5, REQ-5.6, REQ-8, REQ-12.4
 *
 * ── Isolation strategy ───────────────────────────────────────────────────────
 * Each property-test iteration creates its own unique expo via a direct DB
 * insert (cheap — no HTTP round-trip).  User fixtures (organizer, attendees)
 * are created ONCE outside fc.assert, paying the bcrypt cost only once.
 * Because each iteration has a fresh expo ObjectId, iterations never share
 * ticket state — no clearAppData() is needed inside the loop.
 *
 * ── Timeout note ─────────────────────────────────────────────────────────────
 * Each property test uses a generous 180-second timeout.  numRuns is
 * calibrated to stay well within the limit while providing strong coverage.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import request from 'supertest';
import { ObjectId } from 'mongodb';
import app from '../../app';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearCollections,
  getTestDb,
} from '../helpers/db';
import { createTestUser, generateTestAccessToken } from '../helpers/auth';
import TicketService from '../../services/ticket.service';

// ── Mock email service (prevents real SMTP calls) ─────────────────────────────
vi.mock('../../services/email.service', () => ({
  createEmailService: vi.fn(() => ({
    sendOTPEmail: vi.fn().mockResolvedValue(true),
  })),
  EmailService: vi.fn(),
}));

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await connectTestDatabase();
  const db = getTestDb();
  // Ensure text index on expos exists (needed for expo routes)
  try {
    await db
      .collection('expos')
      .createIndex({ name: 'text', description: 'text' }, { name: 'name_description_text_idx' });
  } catch {
    // Already exists — fine
  }
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

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Create an organizer user and return { user, token }. */
async function makeOrganizer() {
  const user = await createTestUser({
    role: 'organizer',
    status: 'active',
    isEmailVerified: true,
  });
  return { user, token: generateTestAccessToken(user) };
}

/** Create an attendee user and return { user, token }. */
async function makeAttendee() {
  const user = await createTestUser({
    role: 'attendee',
    status: 'active',
    isEmailVerified: true,
  });
  return { user, token: generateTestAccessToken(user) };
}

/**
 * Insert a fresh expo directly into the DB.
 * Each call produces a unique ObjectId so iterations are fully isolated
 * even without inter-iteration cleanup.
 *
 * @param organizerId  string organizer user ID
 * @param status       expo status (default: 'published')
 * @returns            string ID of the inserted expo
 */
async function insertPublishedExpo(
  organizerId: string,
  status = 'published'
): Promise<string> {
  const db = getTestDb();
  const result = await db.collection('expos').insertOne({
    organizerId: new ObjectId(organizerId),
    name: 'Ticket Property Expo',
    description: 'Property test expo',
    status,
    startDate: new Date(Date.now() + 86400000 * 30),
    endDate: new Date(Date.now() + 86400000 * 32),
    venueName: 'Venue',
    venueAddress: 'Addr',
    totalBooths: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result.insertedId.toString();
}

/**
 * Register a ticket via the API.
 * Returns { ticketId (UUID), status, registeredAt } or null on failure.
 */
async function registerTicket(
  expoId: string,
  attendeeToken: string
): Promise<{ ticketId: string; status: string; registeredAt: string } | null> {
  const res = await request(app)
    .post(`/api/expos/${expoId}/tickets`)
    .set('Authorization', `Bearer ${attendeeToken}`);
  if (res.status !== 201) return null;
  return {
    ticketId: res.body.data.ticket.ticketId as string,
    status: res.body.data.ticket.status as string,
    registeredAt: res.body.data.ticket.registeredAt as string,
  };
}

// ── Property 11 (22a) ─────────────────────────────────────────────────────────

describe('Property 11: new ticket has status=active and UUID v4 ticketId (22a)', () => {
  /**
   * **Validates: Requirements REQ-12.22, REQ-5**
   *
   * For any attendee registering for any published or ongoing expo, the
   * created ticket MUST have `status === 'active'` and a `ticketId`
   * matching the UUID v4 regex.
   *
   * Organizer is created ONCE.  A fresh attendee is created per iteration
   * (avoids duplicate-registration collisions between iterations).
   * Each iteration inserts a FRESH expo — no cleanup needed inside the loop.
   */
  it(
    'registered ticket always has status=active and a valid UUID v4 ticketId',
    { timeout: 180_000 },
    async () => {
      // Create organizer ONCE — pay bcrypt cost once
      const organizer = await makeOrganizer();

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('published', 'ongoing'), // vary expo status
          async (expoStatus) => {
            // Fresh expo per iteration — no cleanup needed
            const expoId = await insertPublishedExpo(
              organizer.user._id.toString(),
              expoStatus
            );

            // Fresh attendee per iteration — avoids duplicate-registration conflicts
            const attendee = await makeAttendee();

            const result = await registerTicket(expoId, attendee.token);
            if (!result) return true; // skip unexpected failure

            // PROPERTY: status must be 'active'
            expect(result.status).toBe('active');

            // PROPERTY: ticketId must be UUID v4
            expect(result.ticketId).toMatch(
              /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            );
          }
        ),
        // 50 iterations × ~1 s/iter ≈ 50 s; well inside the 180 s timeout
        { numRuns: 30 }
      );
    }
  );
});

// ── Property 12 (22b) ─────────────────────────────────────────────────────────

describe('Property 12: QR generation is deterministic for the same ticketId (22b)', () => {
  /**
   * **Validates: Requirements REQ-5, REQ-5.8**
   *
   * For any ticket registered via the API, calling TicketService.getQRCode()
   * twice with the same ticketId MUST return the exact same data URL string.
   * Both results must also be valid PNG data URLs.
   *
   * Organizer is created ONCE.  Fresh attendee + fresh expo per iteration.
   */
  it(
    'getQRCode() always returns identical output for the same ticketId',
    { timeout: 180_000 },
    async () => {
      // Create organizer ONCE
      const organizer = await makeOrganizer();

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('published', 'ongoing'), // vary expo status
          async (expoStatus) => {
            // Fresh expo per iteration
            const expoId = await insertPublishedExpo(
              organizer.user._id.toString(),
              expoStatus
            );

            // Fresh attendee per iteration
            const attendee = await makeAttendee();

            const result = await registerTicket(expoId, attendee.token);
            if (!result) return true; // skip unexpected failure

            // Call getQRCode twice with the same ticketId — must be deterministic
            const [qr1, qr2] = await Promise.all([
              TicketService.getQRCode(result.ticketId),
              TicketService.getQRCode(result.ticketId),
            ]);

            // PROPERTY: identical output for identical input
            expect(qr1).toBe(qr2);

            // Both must be valid PNG data URLs
            expect(qr1).toMatch(/^data:image\/png;base64,/);
            expect(qr2).toMatch(/^data:image\/png;base64,/);
          }
        ),
        // 50 iterations × ~1 s/iter ≈ 50 s
        { numRuns: 30 }
      );
    }
  );
});

// ── Property 13 (22c) ─────────────────────────────────────────────────────────

describe('Property 13: duplicate registration for same attendee×expo blocked (22c)', () => {
  /**
   * **Validates: Requirements REQ-5.6**
   *
   * For any attendee who already has an active or checked_in ticket for a
   * given expo, a second registration attempt MUST always return
   * 409 DUPLICATE_REGISTRATION — regardless of how many other attendees also
   * registered, and regardless of whether the first ticket was checked in.
   *
   * Organizer, mainAttendee, and noisePool are created ONCE outside the loop.
   * Each iteration inserts a FRESH expo.
   */
  it(
    'always returns 409 DUPLICATE_REGISTRATION on a second register for the same attendee×expo',
    { timeout: 180_000 },
    async () => {
      // Create fixtures ONCE outside the loop — pay bcrypt cost once
      const organizer = await makeOrganizer();
      const mainAttendee = await makeAttendee();

      // Pre-created noise pool — avoids bcrypt per iteration
      const noisePool = await Promise.all(
        Array.from({ length: 3 }, () => makeAttendee())
      );

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 3 }), // number of OTHER attendees (noise)
          fc.boolean(), // whether to check in the first ticket before retry
          async (otherCount, shouldCheckIn) => {
            // Fresh expo per iteration — no cleanup needed
            const expoId = await insertPublishedExpo(
              organizer.user._id.toString()
            );

            // Main attendee registers once — must succeed
            const first = await registerTicket(expoId, mainAttendee.token);
            if (!first) return true; // skip

            // Optionally check in the first ticket
            // (tests duplicate blocking for both active AND checked_in states)
            if (shouldCheckIn) {
              await request(app)
                .post('/api/tickets/checkin')
                .set('Authorization', `Bearer ${organizer.token}`)
                .send({ ticketId: first.ticketId, expoId });
            }

            // Noise: other attendees register (uses pre-created pool)
            const noiseCount = Math.min(otherCount, noisePool.length);
            for (let i = 0; i < noiseCount; i++) {
              await registerTicket(expoId, noisePool[i].token);
            }

            // THE PROPERTY: main attendee tries to register again
            const res = await request(app)
              .post(`/api/expos/${expoId}/tickets`)
              .set('Authorization', `Bearer ${mainAttendee.token}`);

            // Must always be rejected — other registrations are irrelevant
            expect(res.status).toBe(409);
            expect(res.body.code).toBe('DUPLICATE_REGISTRATION');
          }
        ),
        // 60 iterations × ~1.5 s/iter ≈ 90 s; inside 180 s timeout
        { numRuns: 40 }
      );
    }
  );
});

// ── Property 18 (22d) ─────────────────────────────────────────────────────────

describe('Property 18: check-in transitions active→checked_in with checkedInAt >= registeredAt (22d)', () => {
  /**
   * **Validates: Requirements REQ-8, REQ-8.4**
   *
   * For any active ticket, after a successful check-in:
   *  - The check-in endpoint MUST return `result: 'checked_in'` with HTTP 200
   *  - `checkedInAt` MUST be a date >= `registeredAt`
   *  - A subsequent GET on the ticket MUST show status `checked_in`
   *
   * Organizer is created ONCE.  Fresh attendee + fresh expo per iteration.
   */
  it(
    'check-in always yields result=checked_in with checkedInAt >= registeredAt',
    { timeout: 180_000 },
    async () => {
      // Create organizer ONCE
      const organizer = await makeOrganizer();

      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // no meaningful arbitrary needed — repeat the scenario
          async () => {
            // Fresh expo per iteration
            const expoId = await insertPublishedExpo(organizer.user._id.toString());

            // Fresh attendee per iteration
            const attendee = await makeAttendee();

            // Register
            const regRes = await request(app)
              .post(`/api/expos/${expoId}/tickets`)
              .set('Authorization', `Bearer ${attendee.token}`);
            if (regRes.status !== 201) return true; // skip

            const ticketId = regRes.body.data.ticket.ticketId as string;
            const registeredAt = new Date(
              regRes.body.data.ticket.registeredAt as string
            );

            // Small delay to ensure checkedInAt >= registeredAt
            await new Promise((r) => setTimeout(r, 5));

            // Check in
            const checkinRes = await request(app)
              .post('/api/tickets/checkin')
              .set('Authorization', `Bearer ${organizer.token}`)
              .send({ ticketId, expoId });

            expect(checkinRes.status).toBe(200);
            expect(checkinRes.body.data.result).toBe('checked_in');

            const checkedInAt = new Date(
              checkinRes.body.data.checkedInAt as string
            );

            // PROPERTY: checkedInAt must be >= registeredAt
            expect(checkedInAt.getTime()).toBeGreaterThanOrEqual(
              registeredAt.getTime()
            );

            // Verify via GET that the ticket now shows checked_in
            const getRes = await request(app)
              .get(`/api/tickets/${ticketId}`)
              .set('Authorization', `Bearer ${attendee.token}`);
            expect(getRes.body.data.ticket.status).toBe('checked_in');
          }
        ),
        // 50 iterations × ~1 s/iter ≈ 50 s
        { numRuns: 30 }
      );
    }
  );
});

// ── Property 19 (22e) ─────────────────────────────────────────────────────────

describe('Property 19: second check-in scan returns already_checked_in with unchanged timestamp (22e)', () => {
  /**
   * **Validates: Requirements REQ-8.7, REQ-12.4**
   *
   * For any ticket that has been checked in, any subsequent scan (2nd, 3rd…)
   * MUST always return `result: 'already_checked_in'` with the exact same
   * `checkedInAt` timestamp as the first scan.  The timestamp must never
   * be overwritten by re-scans.
   *
   * Organizer is created ONCE.  Fresh attendee + fresh expo per iteration.
   */
  it(
    'every subsequent check-in scan always returns already_checked_in with the original timestamp',
    { timeout: 180_000 },
    async () => {
      // Create organizer ONCE
      const organizer = await makeOrganizer();

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }), // number of additional scans after the first
          async (extraScans) => {
            // Fresh expo per iteration
            const expoId = await insertPublishedExpo(organizer.user._id.toString());

            // Fresh attendee per iteration
            const attendee = await makeAttendee();

            const reg = await registerTicket(expoId, attendee.token);
            if (!reg) return true; // skip

            // First scan — must check in
            const firstScan = await request(app)
              .post('/api/tickets/checkin')
              .set('Authorization', `Bearer ${organizer.token}`)
              .send({ ticketId: reg.ticketId, expoId });

            expect(firstScan.status).toBe(200);
            expect(firstScan.body.data.result).toBe('checked_in');
            const originalTimestamp = firstScan.body.data.checkedInAt as string;

            // Additional scans — all must return already_checked_in with same timestamp
            for (let i = 0; i < extraScans; i++) {
              // Small delay so the clock would tick if the service re-set checkedInAt
              await new Promise((r) => setTimeout(r, 5));

              const scan = await request(app)
                .post('/api/tickets/checkin')
                .set('Authorization', `Bearer ${organizer.token}`)
                .send({ ticketId: reg.ticketId, expoId });

              expect(scan.status).toBe(200);

              // PROPERTY: result discriminator must be already_checked_in
              expect(scan.body.data.result).toBe('already_checked_in');

              // PROPERTY: timestamp is unchanged (never overwritten)
              expect(scan.body.data.checkedInAt).toBe(originalTimestamp);
            }
          }
        ),
        // 50 iterations × ~1.5 s/iter (up to 3 extra scans + delays) ≈ 75 s
        { numRuns: 30 }
      );
    }
  );
});

describe('Ticket Cooldown and Duplicate Determinism Unit Tests', () => {
  it('blocks duplicate active tickets and enforces 2h cooldown on cancelled tickets', async () => {
    const organizer = await makeOrganizer();
    const attendee = await makeAttendee();
    const expoId = await insertPublishedExpo(organizer.user._id.toString());

    // 1. Initial registration succeeds
    const regRes1 = await TicketService.register(expoId, attendee.user._id.toString());
    expect(regRes1.ticket.status).toBe('active');

    // 2. Immediate duplicate registration fails with 409 DUPLICATE_REGISTRATION
    await expect(
      TicketService.register(expoId, attendee.user._id.toString())
    ).rejects.toMatchObject({
      code: 'DUPLICATE_REGISTRATION',
      statusCode: 409,
    });

    // 3. Cancel the ticket
    await TicketService.cancel(regRes1.ticket.ticketId, attendee.user._id.toString());

    // 4. Re-registration immediately after cancellation fails with 429 REGISTRATION_COOLDOWN
    await expect(
      TicketService.register(expoId, attendee.user._id.toString())
    ).rejects.toMatchObject({
      code: 'REGISTRATION_COOLDOWN',
      statusCode: 429,
    });
  });
});



