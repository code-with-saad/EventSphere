/**
 * Integration Tests — Expo CRUD, Status Transitions, Cascade Gate, Public Listing
 *
 * Task 13 (sub-tasks 13a–13e)
 *
 * 13a. Create expo: valid payload → draft + correct organizerId; validation errors
 * 13b. Update expo: owner can update; non-owner gets 403
 * 13c. Status transitions: valid; invalid (completed→published) → 400; publish with missing fields → 400
 * 13d. Cascade gate: archive/delete blocked without confirmed; confirmed → cascade applied
 * 13e. Public listing: visible statuses only; pagination ≤ 12; text search
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

// ── Mock email service (not needed here but prevents real SMTP calls) ─────────
vi.mock('../services/email.service', () => ({
  createEmailService: vi.fn(() => ({
    sendOTPEmail: vi.fn().mockResolvedValue(true),
  })),
  EmailService: vi.fn(),
}));

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await connectTestDatabase();
  // Ensure the text index on expos exists for search tests (normally created at server startup).
  const db = getTestDb();
  try {
    await db.collection('expos').createIndex(
      { name: 'text', description: 'text' },
      { name: 'name_description_text_idx' }
    );
  } catch {
    // Index may already exist — that's fine
  }
});

afterAll(async () => {
  await disconnectTestDatabase();
});

beforeEach(async () => {
  await clearCollections();
  // Clear Phase 2 collections not included in the Phase 1 helper
  const db = getTestDb();
  await db.collection('expos').deleteMany({});
  await db.collection('tickets').deleteMany({});
  await db.collection('applications').deleteMany({});
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns an ISO 8601 date string `daysFromNow` days in the future.
 */
function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

/** Minimal valid expo body that satisfies all required fields. */
const validExpoBody = {
  name: 'Tech Expo 2026',
  description: 'A major technology exhibition',
  startDate: futureDate(30),
  endDate: futureDate(32),
  venueName: 'Convention Center',
  venueAddress: '123 Main St',
  totalBooths: 50,
};

/**
 * Create a valid organizer, post a new expo, and return the expo ID plus the
 * organizer's access token.
 */
async function createOrganizerAndExpo(overrides: Record<string, unknown> = {}): Promise<{
  expoId: string;
  token: string;
  organizerId: string;
}> {
  const organizer = await createTestUser({
    role: 'organizer',
    status: 'active',
    isEmailVerified: true,
  });
  const token = generateTestAccessToken(organizer);

  const res = await request(app)
    .post('/api/expos')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...validExpoBody, ...overrides });

  if (res.status !== 201) {
    throw new Error(
      `createOrganizerAndExpo: expected 201, got ${res.status}. Body: ${JSON.stringify(res.body)}`
    );
  }

  return {
    expoId: res.body.data.expo._id,
    token,
    organizerId: organizer._id.toString(),
  };
}

// ── 13a — Create expo ─────────────────────────────────────────────────────────

describe('POST /api/expos — create expo (13a)', () => {
  it('13a-1: valid payload → 201, status=draft, correct organizerId', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const token = generateTestAccessToken(organizer);

    const res = await request(app)
      .post('/api/expos')
      .set('Authorization', `Bearer ${token}`)
      .send(validExpoBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.expo.status).toBe('draft');
    expect(res.body.data.expo.organizerId).toBe(organizer._id.toString());
    expect(res.body.data.expo.name).toBe(validExpoBody.name);
    expect(res.body.data.expo.totalBooths).toBe(validExpoBody.totalBooths);
  });

  it('13a-2: missing required field (name) → 400 MISSING_REQUIRED_FIELDS', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const token = generateTestAccessToken(organizer);

    const { name: _omitted, ...bodyWithoutName } = validExpoBody;

    const res = await request(app)
      .post('/api/expos')
      .set('Authorization', `Bearer ${token}`)
      .send(bodyWithoutName);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('MISSING_REQUIRED_FIELDS');
  });

  it('13a-3: past startDate → 400 INVALID_DATE_RANGE', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const token = generateTestAccessToken(organizer);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const res = await request(app)
      .post('/api/expos')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validExpoBody, startDate: yesterday.toISOString() });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_DATE_RANGE');
  });

  it('13a-4: endDate before startDate → 400 INVALID_DATE_RANGE', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const token = generateTestAccessToken(organizer);

    const res = await request(app)
      .post('/api/expos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validExpoBody,
        startDate: futureDate(30),
        endDate: futureDate(28), // before startDate
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_DATE_RANGE');
  });

  it('13a-5: unauthenticated request → 401', async () => {
    const res = await request(app)
      .post('/api/expos')
      .send(validExpoBody);

    expect(res.status).toBe(401);
  });

  it('13a-6: attendee role → 403', async () => {
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const token = generateTestAccessToken(attendee);

    const res = await request(app)
      .post('/api/expos')
      .set('Authorization', `Bearer ${token}`)
      .send(validExpoBody);

    expect(res.status).toBe(403);
  });
});

// ── 13b — Update expo ─────────────────────────────────────────────────────────

describe('PATCH /api/expos/:id — update expo (13b)', () => {
  it('13b-1: owner can update a field → 200, field reflected', async () => {
    const { expoId, token } = await createOrganizerAndExpo();

    const res = await request(app)
      .patch(`/api/expos/${expoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Expo Name' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.expo.name).toBe('Updated Expo Name');
  });

  it('13b-2: non-owner gets 403 EXPO_FORBIDDEN', async () => {
    const { expoId } = await createOrganizerAndExpo();

    // A different organizer
    const otherOrganizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const otherToken = generateTestAccessToken(otherOrganizer);

    const res = await request(app)
      .patch(`/api/expos/${expoId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'Hijacked Name' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('EXPO_FORBIDDEN');
  });

  it('13b-3: non-existent expo ID → 404', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const token = generateTestAccessToken(organizer);
    const fakeId = new ObjectId().toString();

    const res = await request(app)
      .patch(`/api/expos/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Anything' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ── 13c — Status transitions ──────────────────────────────────────────────────

describe('PATCH /api/expos/:id/status — transitions (13c)', () => {
  it('13c-1: draft → published succeeds when all required fields are present', async () => {
    const { expoId, token } = await createOrganizerAndExpo();

    const res = await request(app)
      .patch(`/api/expos/${expoId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'published' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.expo.status).toBe('published');
  });

  it('13c-2: publish with missing required fields → 400 MISSING_REQUIRED_FIELDS', async () => {
    // Create expo with valid fields via API, then force name to empty directly in DB
    const { expoId, token } = await createOrganizerAndExpo();

    // Strip the name field directly in the DB to simulate an incomplete draft
    const db = getTestDb();
    await db.collection('expos').updateOne(
      { _id: new ObjectId(expoId) },
      { $unset: { name: '' } }
    );

    const res = await request(app)
      .patch(`/api/expos/${expoId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'published' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('MISSING_REQUIRED_FIELDS');
  });

  it('13c-3: completed → published → 400 INVALID_STATUS_TRANSITION', async () => {
    const { expoId, token } = await createOrganizerAndExpo();

    // Force expo to completed status directly in the DB
    const db = getTestDb();
    await db.collection('expos').updateOne(
      { _id: new ObjectId(expoId) },
      { $set: { status: 'completed' } }
    );

    const res = await request(app)
      .patch(`/api/expos/${expoId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'published' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('13c-4: published → ongoing → 200', async () => {
    const { expoId, token } = await createOrganizerAndExpo();

    // Publish first
    const db = getTestDb();
    await db.collection('expos').updateOne(
      { _id: new ObjectId(expoId) },
      { $set: { status: 'published' } }
    );

    const res = await request(app)
      .patch(`/api/expos/${expoId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'ongoing' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.expo.status).toBe('ongoing');
  });
});

// ── 13d — Cascade gate ────────────────────────────────────────────────────────

describe('Cascade gate — archive and delete (13d)', () => {
  // Helper: insert an active ticket linked to an expo
  async function insertActiveTicket(expoId: string, attendeeId: string): Promise<void> {
    const db = getTestDb();
    await db.collection('tickets').insertOne({
      ticketId: `test-ticket-${new ObjectId().toString()}`,
      expoId: new ObjectId(expoId),
      attendeeId: new ObjectId(attendeeId),
      status: 'active',
      registeredAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Helper: insert a pending application linked to an expo
  async function insertPendingApplication(expoId: string, exhibitorId: string): Promise<void> {
    const db = getTestDb();
    await db.collection('applications').insertOne({
      expoId: new ObjectId(expoId),
      exhibitorId: new ObjectId(exhibitorId),
      status: 'pending',
      companyName: 'Test Co',
      companyDescription: 'Test description',
      category: 'Technology',
      phoneNumber: '+1234567890',
      submittedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  it('13d-1: archive with active ticket and no confirmed → 409 CASCADE_CONFIRMATION_REQUIRED', async () => {
    const { expoId, token } = await createOrganizerAndExpo();

    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    await insertActiveTicket(expoId, attendee._id.toString());

    // Force expo to published so archive transition is valid
    const db = getTestDb();
    await db.collection('expos').updateOne(
      { _id: new ObjectId(expoId) },
      { $set: { status: 'published' } }
    );

    const res = await request(app)
      .patch(`/api/expos/${expoId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'archived' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CASCADE_CONFIRMATION_REQUIRED');
  });

  it('13d-2: archive with confirmed=true → 200 and ticket becomes cancelled', async () => {
    const { expoId, token } = await createOrganizerAndExpo();

    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    await insertActiveTicket(expoId, attendee._id.toString());

    // Force to published
    const db = getTestDb();
    await db.collection('expos').updateOne(
      { _id: new ObjectId(expoId) },
      { $set: { status: 'published' } }
    );

    const res = await request(app)
      .patch(`/api/expos/${expoId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'archived', confirmed: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.expo.status).toBe('archived');

    // The ticket must now be cancelled
    const ticket = await db.collection('tickets').findOne({
      expoId: new ObjectId(expoId),
      attendeeId: new ObjectId(attendee._id.toString()),
    });
    expect(ticket?.status).toBe('cancelled');
  });

  it('13d-3: delete with active ticket + pending application and no confirmed → 409', async () => {
    const { expoId, token } = await createOrganizerAndExpo();

    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const exhibitor = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });

    await insertActiveTicket(expoId, attendee._id.toString());
    await insertPendingApplication(expoId, exhibitor._id.toString());

    const res = await request(app)
      .delete(`/api/expos/${expoId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('CASCADE_CONFIRMATION_REQUIRED');
  });

  it('13d-4: delete with confirmed=true → 200; expo deleted; ticket cancelled; application rejected', async () => {
    const { expoId, token } = await createOrganizerAndExpo();

    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    const exhibitor = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });

    await insertActiveTicket(expoId, attendee._id.toString());
    await insertPendingApplication(expoId, exhibitor._id.toString());

    const res = await request(app)
      .delete(`/api/expos/${expoId}?confirmed=true`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const db = getTestDb();

    // Expo must be gone
    const expo = await db.collection('expos').findOne({ _id: new ObjectId(expoId) });
    expect(expo).toBeNull();

    // Ticket must be cancelled
    const ticket = await db.collection('tickets').findOne({
      expoId: new ObjectId(expoId),
      attendeeId: new ObjectId(attendee._id.toString()),
    });
    expect(ticket?.status).toBe('cancelled');

    // Application must be rejected
    const application = await db.collection('applications').findOne({
      expoId: new ObjectId(expoId),
      exhibitorId: new ObjectId(exhibitor._id.toString()),
    });
    expect(application?.status).toBe('rejected');
  });
});

// ── 13e — Public listing ──────────────────────────────────────────────────────

describe('GET /api/expos — public listing (13e)', () => {
  // Helper: insert an expo with given status directly into DB
  async function insertExpoWithStatus(
    organizerId: string,
    status: string,
    name: string,
    overrides: Record<string, unknown> = {}
  ): Promise<string> {
    const db = getTestDb();
    const now = new Date();
    const doc = {
      organizerId: new ObjectId(organizerId),
      name,
      description: `Description for ${name}`,
      status,
      startDate: new Date(futureDate(30)),
      endDate: new Date(futureDate(32)),
      venueName: 'Test Venue',
      venueAddress: '456 Test Ave',
      totalBooths: 10,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
    const result = await db.collection('expos').insertOne(doc);
    return result.insertedId.toString();
  }

  it('13e-1: only published/ongoing/completed expos are returned', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const oid = organizer._id.toString();

    await insertExpoWithStatus(oid, 'draft', 'Draft Expo');
    await insertExpoWithStatus(oid, 'published', 'Published Expo');
    await insertExpoWithStatus(oid, 'ongoing', 'Ongoing Expo');
    await insertExpoWithStatus(oid, 'completed', 'Completed Expo');
    await insertExpoWithStatus(oid, 'archived', 'Archived Expo');

    const res = await request(app).get('/api/expos');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const statuses: string[] = res.body.data.expos.map((e: { status: string }) => e.status);
    expect(statuses).not.toContain('draft');
    expect(statuses).not.toContain('archived');
    expect(statuses).toContain('published');
    expect(statuses).toContain('ongoing');
    expect(statuses).toContain('completed');
  });

  it('13e-2: draft and archived expos never appear in public list', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const oid = organizer._id.toString();

    await insertExpoWithStatus(oid, 'draft', 'Hidden Draft');
    await insertExpoWithStatus(oid, 'archived', 'Hidden Archived');

    const res = await request(app).get('/api/expos');

    expect(res.status).toBe(200);
    const names: string[] = res.body.data.expos.map((e: { name: string }) => e.name);
    expect(names).not.toContain('Hidden Draft');
    expect(names).not.toContain('Hidden Archived');
    expect(res.body.data.pagination.total).toBe(0);
  });

  it('13e-3: pagination limit ≤ 12; total reflects all matching records', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const oid = organizer._id.toString();

    // Insert 15 published expos
    for (let i = 1; i <= 15; i++) {
      await insertExpoWithStatus(oid, 'published', `Expo ${i}`);
    }

    const res = await request(app).get('/api/expos');

    expect(res.status).toBe(200);
    expect(res.body.data.expos.length).toBeLessThanOrEqual(12);
    expect(res.body.data.pagination.total).toBe(15);
    expect(res.body.data.pagination.totalPages).toBe(2);
  });

  it('13e-4: text search returns matching results only', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const oid = organizer._id.toString();

    await insertExpoWithStatus(oid, 'published', 'Robotics World Expo', {
      description: 'All about robotics innovation',
    });
    await insertExpoWithStatus(oid, 'published', 'Fashion Week Show', {
      description: 'Latest trends in fashion',
    });

    const res = await request(app).get('/api/expos?search=robotics');

    expect(res.status).toBe(200);
    // At minimum the robotics expo should be in results
    const names: string[] = res.body.data.expos.map((e: { name: string }) => e.name);
    expect(names).toContain('Robotics World Expo');
    expect(names).not.toContain('Fashion Week Show');
  });
});
