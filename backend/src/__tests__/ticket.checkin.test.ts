/**
 * Integration Tests — Ticket Check-In Flow
 *
 * Task 21 (sub-tasks 21a–21d)
 *
 * 21a. Register: published/ongoing expo + attendee → 201; completed/draft → 400;
 *      duplicate → 409; unauthenticated → 401; wrong role → 403; bad expo → 404
 * 21b. PDF: owner → 200 application/pdf with %PDF magic bytes; non-owner → 403;
 *      unauthenticated → 401; organizer role → 403
 * 21c. Check-in: active → checked_in; already checked-in → already_checked_in
 *      (original timestamp); wrong expo → wrong_event; cancelled → cancelled_ticket;
 *      non-existent → invalid_ticket; unauthenticated → 401; attendee role → 403
 * 21d. Cancel: active → cancelled; already-cancelled → 400; non-owner → 403;
 *      checked-in → 400; unauthenticated → 401; organizer role → 403
 *
 * Additional coverage:
 * - GET /api/tickets/mine — attendee lists own tickets across expos
 * - GET /api/tickets/:ticketId — get ticket by UUID ticketId
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { ObjectId } from 'mongodb';
import app from '../app';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearCollections,
  getTestDb,
} from './helpers/db';
import { createTestUser, generateTestAccessToken } from './helpers/auth';

// ── Suppress SMTP calls ───────────────────────────────────────────────────────
vi.mock('../services/email.service', () => ({
  createEmailService: vi.fn(() => ({
    sendOTPEmail: vi.fn().mockResolvedValue(true),
  })),
  EmailService: vi.fn(),
}));

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await connectTestDatabase();
  const db = getTestDb();
  try {
    await db.collection('expos').createIndex(
      { name: 'text', description: 'text' },
      { name: 'name_description_text_idx' }
    );
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

// ── Shared Helpers ────────────────────────────────────────────────────────────

/**
 * Insert an expo directly into the DB and return its string ID.
 */
async function insertExpo(
  organizerId: string,
  status = 'published',
  totalBooths = 10
): Promise<string> {
  const db = getTestDb();
  const result = await db.collection('expos').insertOne({
    organizerId: new ObjectId(organizerId),
    name: 'Checkin Test Expo',
    description: 'Integration test expo',
    status,
    startDate: new Date(Date.now() + 86400000 * 30),
    endDate: new Date(Date.now() + 86400000 * 32),
    venueName: 'Test Venue',
    venueAddress: '123 Test St',
    totalBooths,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result.insertedId.toString();
}

/**
 * Register an attendee for an expo via the real API.
 * Returns the UUID ticketId string and MongoDB _id.
 */
async function registerTicket(
  expoId: string,
  attendeeToken: string
): Promise<{ ticketId: string; mongoId: string; qrCodeDataUrl: string }> {
  const res = await request(app)
    .post(`/api/expos/${expoId}/tickets`)
    .set('Authorization', `Bearer ${attendeeToken}`);
  if (res.status !== 201) {
    throw new Error(`Register failed: ${JSON.stringify(res.body)}`);
  }
  return {
    ticketId: res.body.data.ticket.ticketId as string, // UUID string
    mongoId: res.body.data.ticket._id as string,
    qrCodeDataUrl: res.body.data.qrCodeDataUrl as string,
  };
}

// ── 21a — Register ────────────────────────────────────────────────────────────

describe('POST /api/expos/:expoId/tickets — register (21a)', () => {
  it('21a-1: published expo + attendee → 201, active ticket, QR data URL, UUID v4 ticketId', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);

    const res = await request(app)
      .post(`/api/expos/${expoId}/tickets`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticket.status).toBe('active');
    expect(res.body.data.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(res.body.data.ticket.ticketId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(res.body.data.expoName).toBe('Checkin Test Expo');
    expect(typeof res.body.data.attendeeName).toBe('string');
    expect(res.body.data.attendeeName.length).toBeGreaterThan(0);
  });

  it('21a-2: ongoing expo → 201', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const expoId = await insertExpo(organizer._id.toString(), 'ongoing');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);

    const res = await request(app)
      .post(`/api/expos/${expoId}/tickets`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticket.status).toBe('active');
  });

  it('21a-3: completed expo → 400 EXPO_NOT_ACCEPTING_REGISTRATIONS', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const expoId = await insertExpo(organizer._id.toString(), 'completed');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);

    const res = await request(app)
      .post(`/api/expos/${expoId}/tickets`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('EXPO_NOT_ACCEPTING_REGISTRATIONS');
  });

  it('21a-4: draft expo → 400 EXPO_NOT_ACCEPTING_REGISTRATIONS', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const expoId = await insertExpo(organizer._id.toString(), 'draft');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);

    const res = await request(app)
      .post(`/api/expos/${expoId}/tickets`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('EXPO_NOT_ACCEPTING_REGISTRATIONS');
  });

  it('21a-5: duplicate registration → 409 DUPLICATE_REGISTRATION', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);

    // First registration
    await request(app)
      .post(`/api/expos/${expoId}/tickets`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    // Second registration by same attendee
    const res = await request(app)
      .post(`/api/expos/${expoId}/tickets`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('DUPLICATE_REGISTRATION');
  });

  it('21a-6: unauthenticated → 401', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const res = await request(app).post(`/api/expos/${expoId}/tickets`);

    expect(res.status).toBe(401);
  });

  it('21a-7: organizer role cannot register → 403', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const organizerToken = generateTestAccessToken(organizer);
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const res = await request(app)
      .post(`/api/expos/${expoId}/tickets`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(403);
  });

  it('21a-8: non-existent expo → 404 EXPO_NOT_FOUND', async () => {
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);
    const fakeExpoId = new ObjectId().toString();

    const res = await request(app)
      .post(`/api/expos/${fakeExpoId}/tickets`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('EXPO_NOT_FOUND');
  });
});

// ── 21b — PDF Download ────────────────────────────────────────────────────────

describe('GET /api/tickets/:ticketId/pdf — PDF download (21b)', () => {
  it('21b-1: owner → 200, Content-Type: application/pdf, %PDF magic bytes, attachment disposition', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);
    const { ticketId } = await registerTicket(expoId, attendeeToken);

    const pdfRes = await request(app)
      .get(`/api/tickets/${ticketId}/pdf`)
      .set('Authorization', `Bearer ${attendeeToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');
    expect(pdfRes.headers['content-disposition']).toContain('attachment');
    expect((pdfRes.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');
  });

  it('21b-2: non-owner → 403 TICKET_FORBIDDEN', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    // Attendee A registers
    const attendeeA = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const tokenA = generateTestAccessToken(attendeeA);
    const { ticketId } = await registerTicket(expoId, tokenA);

    // Attendee B tries to download A's PDF
    const attendeeB = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const tokenB = generateTestAccessToken(attendeeB);

    const res = await request(app)
      .get(`/api/tickets/${ticketId}/pdf`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('TICKET_FORBIDDEN');
  });

  it('21b-3: unauthenticated → 401', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);
    const { ticketId } = await registerTicket(expoId, attendeeToken);

    const res = await request(app).get(`/api/tickets/${ticketId}/pdf`);

    expect(res.status).toBe(401);
  });

  it('21b-4: organizer role cannot download PDF → 403', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const organizerToken = generateTestAccessToken(organizer);
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);
    const { ticketId } = await registerTicket(expoId, attendeeToken);

    const res = await request(app)
      .get(`/api/tickets/${ticketId}/pdf`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(403);
  });
});

// ── 21c — Check-In ────────────────────────────────────────────────────────────

describe('POST /api/tickets/checkin — check-in (21c)', () => {
  it('21c-1: active ticket → result: checked_in, checkedInAt truthy, attendeeName non-empty', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const organizerToken = generateTestAccessToken(organizer);
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);
    const { ticketId } = await registerTicket(expoId, attendeeToken);

    const res = await request(app)
      .post('/api/tickets/checkin')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ ticketId, expoId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.result).toBe('checked_in');
    expect(res.body.data.checkedInAt).toBeTruthy();
    expect(typeof res.body.data.attendeeName).toBe('string');
    expect(res.body.data.attendeeName.length).toBeGreaterThan(0);
  });

  it('21c-2: already checked-in → result: already_checked_in, original checkedInAt preserved', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const organizerToken = generateTestAccessToken(organizer);
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);
    const { ticketId } = await registerTicket(expoId, attendeeToken);

    // First check-in
    const first = await request(app)
      .post('/api/tickets/checkin')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ ticketId, expoId });

    expect(first.body.data.result).toBe('checked_in');
    const originalCheckedInAt = first.body.data.checkedInAt as string;

    // Small delay
    await new Promise(r => setTimeout(r, 10));

    // Second check-in
    const second = await request(app)
      .post('/api/tickets/checkin')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ ticketId, expoId });

    expect(second.status).toBe(200);
    expect(second.body.success).toBe(true);
    expect(second.body.data.result).toBe('already_checked_in');
    // Original timestamp must be preserved (not overwritten)
    expect(second.body.data.checkedInAt).toBe(originalCheckedInAt);
  });

  it('21c-3: wrong expo → result: wrong_event, HTTP 200', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const organizerToken = generateTestAccessToken(organizer);
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);
    const { ticketId } = await registerTicket(expoId, attendeeToken);

    // Different expoId
    const wrongExpoId = new ObjectId().toString();

    const res = await request(app)
      .post('/api/tickets/checkin')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ ticketId, expoId: wrongExpoId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.result).toBe('wrong_event');
  });

  it('21c-4: cancelled ticket → result: cancelled_ticket, HTTP 200', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const organizerToken = generateTestAccessToken(organizer);
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);
    const { ticketId } = await registerTicket(expoId, attendeeToken);

    // Cancel the ticket
    await request(app)
      .patch(`/api/tickets/${ticketId}/cancel`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    // Attempt check-in on cancelled ticket
    const res = await request(app)
      .post('/api/tickets/checkin')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ ticketId, expoId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.result).toBe('cancelled_ticket');
  });

  it('21c-5: non-existent ticketId → result: invalid_ticket, HTTP 200', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const organizerToken = generateTestAccessToken(organizer);

    const res = await request(app)
      .post('/api/tickets/checkin')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        ticketId: '00000000-0000-0000-0000-000000000000',
        expoId: new ObjectId().toString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.result).toBe('invalid_ticket');
  });

  it('21c-6: unauthenticated → 401', async () => {
    const res = await request(app)
      .post('/api/tickets/checkin')
      .send({
        ticketId: '00000000-0000-0000-0000-000000000000',
        expoId: new ObjectId().toString(),
      });

    expect(res.status).toBe(401);
  });

  it('21c-7: attendee role cannot use checkin endpoint → 403', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);
    const { ticketId } = await registerTicket(expoId, attendeeToken);

    const res = await request(app)
      .post('/api/tickets/checkin')
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send({ ticketId, expoId });

    expect(res.status).toBe(403);
  });
});

// ── 21d — Cancel ──────────────────────────────────────────────────────────────

describe('PATCH /api/tickets/:ticketId/cancel — cancel (21d)', () => {
  it('21d-1: active ticket + owner → 200, status=cancelled', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);
    const { ticketId } = await registerTicket(expoId, attendeeToken);

    const res = await request(app)
      .patch(`/api/tickets/${ticketId}/cancel`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticket.status).toBe('cancelled');
  });

  it('21d-2: already-cancelled → 400 TICKET_NOT_CANCELLABLE', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);
    const { ticketId } = await registerTicket(expoId, attendeeToken);

    // First cancel
    await request(app)
      .patch(`/api/tickets/${ticketId}/cancel`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    // Second cancel
    const res = await request(app)
      .patch(`/api/tickets/${ticketId}/cancel`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('TICKET_NOT_CANCELLABLE');
  });

  it('21d-3: non-owner → 403 TICKET_FORBIDDEN', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const attendeeA = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const tokenA = generateTestAccessToken(attendeeA);
    const { ticketId } = await registerTicket(expoId, tokenA);

    // Attendee B tries to cancel A's ticket
    const attendeeB = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const tokenB = generateTestAccessToken(attendeeB);

    const res = await request(app)
      .patch(`/api/tickets/${ticketId}/cancel`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('TICKET_FORBIDDEN');
  });

  it('21d-4: checked-in ticket → 400 TICKET_NOT_CANCELLABLE', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const organizerToken = generateTestAccessToken(organizer);
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);
    const { ticketId } = await registerTicket(expoId, attendeeToken);

    // Check in the ticket first
    await request(app)
      .post('/api/tickets/checkin')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ ticketId, expoId });

    // Attempt to cancel a checked-in ticket
    const res = await request(app)
      .patch(`/api/tickets/${ticketId}/cancel`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('TICKET_NOT_CANCELLABLE');
  });

  it('21d-5: unauthenticated → 401', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);
    const { ticketId } = await registerTicket(expoId, attendeeToken);

    const res = await request(app).patch(`/api/tickets/${ticketId}/cancel`);

    expect(res.status).toBe(401);
  });

  it('21d-6: organizer role cannot cancel → 403', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const organizerToken = generateTestAccessToken(organizer);
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);
    const { ticketId } = await registerTicket(expoId, attendeeToken);

    const res = await request(app)
      .patch(`/api/tickets/${ticketId}/cancel`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(403);
  });
});

// ── GET /api/tickets/mine and GET /api/tickets/:ticketId ──────────────────────

describe('GET /api/tickets/mine and GET /api/tickets/:ticketId', () => {
  it('mine-1: returns all tickets for attendee across expos', async () => {
    // Two separate organizers each with their own expo
    const org1 = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const org2 = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId1 = await insertExpo(org1._id.toString(), 'published');
    const expoId2 = await insertExpo(org2._id.toString(), 'published');

    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);

    // Register for both expos
    await registerTicket(expoId1, attendeeToken);
    await registerTicket(expoId2, attendeeToken);

    const res = await request(app)
      .get('/api/tickets/mine')
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tickets.length).toBe(2);
  });

  it('mine-2: empty array when no tickets', async () => {
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);

    const res = await request(app)
      .get('/api/tickets/mine')
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tickets).toEqual([]);
  });

  it('mine-3: organizer cannot access /mine → 403', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const organizerToken = generateTestAccessToken(organizer);

    const res = await request(app)
      .get('/api/tickets/mine')
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(403);
  });

  it('getById-1: valid UUID ticketId → 200, ticket returned with matching ticketId', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);
    const { ticketId } = await registerTicket(expoId, attendeeToken);

    const res = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticket.ticketId).toBe(ticketId);
  });

  it('getById-2: non-existent UUID → 404 TICKET_NOT_FOUND', async () => {
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const attendeeToken = generateTestAccessToken(attendee);

    const res = await request(app)
      .get('/api/tickets/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('TICKET_NOT_FOUND');
  });
});
