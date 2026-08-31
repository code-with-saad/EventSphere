/**
 * Integration Tests — Session Schedule & Bookmarks
 *
 * Task 26 (sub-tasks 26a–26c)
 *
 * 26a. Create: valid → 201; endTime ≤ startTime → 400 INVALID_TIME_RANGE;
 *             room conflict → 409 ROOM_CONFLICT; back-to-back ok → 201;
 *             auth / role / ownership guards
 * 26b. Update: owner updates; room conflict on update → 409;
 *              self-exclusion (title-only) → 200; time guard on update;
 *              non-owner / unauthenticated guards
 * 26c. Delete: owner deletes, session gone from DB; cascade removes bookmarks (REQ-6.7);
 *              non-owner / unauthenticated / non-existent guards
 *
 * Additional coverage:
 * - GET /api/expos/:expoId/sessions — sorted by startTime ascending
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
    await db
      .collection('expos')
      .createIndex(
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
  await db.collection('sessions').deleteMany({});
  await db.collection('bookmarks').deleteMany({});
});

// ── Shared Helpers ────────────────────────────────────────────────────────────

/**
 * Insert an expo directly into the DB and return its string ID.
 */
async function insertExpo(
  organizerId: string,
  status = 'published'
): Promise<string> {
  const db = getTestDb();
  const result = await db.collection('expos').insertOne({
    organizerId: new ObjectId(organizerId),
    name: 'Schedule Test Expo',
    description: 'test',
    status,
    startDate: new Date(Date.now() + 86400000 * 30),
    endDate: new Date(Date.now() + 86400000 * 32),
    venueName: 'Venue',
    venueAddress: 'Addr',
    totalBooths: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result.insertedId.toString();
}

/**
 * Produce ISO start/end strings at a given offset from a base time
 * 30 days in the future.
 */
function makeTimes(startOffsetHours: number, durationHours = 1) {
  const base = new Date(Date.now() + 86400000 * 30);
  return {
    startTime: new Date(
      base.getTime() + startOffsetHours * 3600000
    ).toISOString(),
    endTime: new Date(
      base.getTime() + (startOffsetHours + durationHours) * 3600000
    ).toISOString(),
  };
}

/**
 * POST /api/expos/:expoId/sessions via the API.
 * Throws if the response is not 201.
 */
async function createSession(
  expoId: string,
  organizerToken: string,
  overrides: Record<string, any> = {}
) {
  const res = await request(app)
    .post(`/api/expos/${expoId}/sessions`)
    .set('Authorization', `Bearer ${organizerToken}`)
    .send({
      title: 'Test Session',
      speakerName: 'Speaker',
      ...makeTimes(0),
      room: 'Hall A',
      ...overrides,
    });
  if (res.status !== 201) {
    throw new Error(`Create failed: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.session as { _id: string; [k: string]: any };
}

// ═════════════════════════════════════════════════════════════════════════════
// 26a — POST /api/expos/:expoId/sessions — create
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/expos/:expoId/sessions — create (26a)', () => {
  // Create shared users once per describe block (bcrypt once, not per test)
  let organizer: Awaited<ReturnType<typeof createTestUser>>;
  let organizerToken: string;
  let attendee: Awaited<ReturnType<typeof createTestUser>>;
  let attendeeToken: string;
  let otherOrganizer: Awaited<ReturnType<typeof createTestUser>>;
  let otherOrganizerToken: string;

  beforeAll(async () => {
    organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    organizerToken = generateTestAccessToken(organizer);

    attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    attendeeToken = generateTestAccessToken(attendee);

    otherOrganizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    otherOrganizerToken = generateTestAccessToken(otherOrganizer);
  });

  it('26a-1: valid payload → 201, correct fields', async () => {
    const expoId = await insertExpo(organizer._id.toString());
    const res = await request(app)
      .post(`/api/expos/${expoId}/sessions`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: 'Opening Keynote',
        speakerName: 'Jane Doe',
        ...makeTimes(0),
        room: 'Hall A',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session.title).toBe('Opening Keynote');
    expect(res.body.data.session.room).toBe('Hall A');
    expect(res.body.data.session._id).toBeTruthy();
  });

  it('26a-2: endTime === startTime → 400 INVALID_TIME_RANGE', async () => {
    const expoId = await insertExpo(organizer._id.toString());
    const iso = new Date(Date.now() + 86400000 * 30).toISOString();

    const res = await request(app)
      .post(`/api/expos/${expoId}/sessions`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: 'Bad Session',
        speakerName: 'Speaker',
        startTime: iso,
        endTime: iso,
        room: 'Hall A',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_TIME_RANGE');
  });

  it('26a-3: endTime before startTime → 400 INVALID_TIME_RANGE', async () => {
    const expoId = await insertExpo(organizer._id.toString());
    const { startTime, endTime } = makeTimes(2, 1);

    const res = await request(app)
      .post(`/api/expos/${expoId}/sessions`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: 'Bad Session',
        speakerName: 'Speaker',
        startTime: endTime,   // reversed
        endTime: startTime,
        room: 'Hall A',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_TIME_RANGE');
  });

  it('26a-4: room conflict → 409 ROOM_CONFLICT', async () => {
    const expoId = await insertExpo(organizer._id.toString());

    // Session A: Hall A 0h → 1h
    await createSession(expoId, organizerToken, {
      title: 'Session A',
      ...makeTimes(0, 1),
      room: 'Hall A',
    });

    // Session B: Hall A 0h30 → 1h30 — overlaps with A
    const { startTime, endTime } = makeTimes(0.5, 1);
    const res = await request(app)
      .post(`/api/expos/${expoId}/sessions`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: 'Session B',
        speakerName: 'Speaker',
        startTime,
        endTime,
        room: 'Hall A',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ROOM_CONFLICT');
  });

  it('26a-5: back-to-back same room (no gap) → both 201', async () => {
    const expoId = await insertExpo(organizer._id.toString());

    // Session A: Hall A 0h → 1h
    const resA = await request(app)
      .post(`/api/expos/${expoId}/sessions`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: 'Session A',
        speakerName: 'Speaker',
        ...makeTimes(0, 1),
        room: 'Hall A',
      });
    expect(resA.status).toBe(201);

    // Session B: Hall A 1h → 2h — immediately follows A, no overlap
    const resB = await request(app)
      .post(`/api/expos/${expoId}/sessions`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: 'Session B',
        speakerName: 'Speaker',
        ...makeTimes(1, 1),
        room: 'Hall A',
      });
    expect(resB.status).toBe(201);
  });

  it('26a-6: unauthenticated → 401', async () => {
    const expoId = await insertExpo(organizer._id.toString());
    const res = await request(app)
      .post(`/api/expos/${expoId}/sessions`)
      .send({ title: 'X', speakerName: 'Y', ...makeTimes(0), room: 'Hall A' });

    expect(res.status).toBe(401);
  });

  it('26a-7: attendee role → 403', async () => {
    const expoId = await insertExpo(organizer._id.toString());
    const res = await request(app)
      .post(`/api/expos/${expoId}/sessions`)
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send({ title: 'X', speakerName: 'Y', ...makeTimes(0), room: 'Hall A' });

    expect(res.status).toBe(403);
  });

  it('26a-8: wrong organizer → 403 SESSION_FORBIDDEN', async () => {
    const expoId = await insertExpo(organizer._id.toString()); // owned by organizer, not otherOrganizer
    const res = await request(app)
      .post(`/api/expos/${expoId}/sessions`)
      .set('Authorization', `Bearer ${otherOrganizerToken}`)
      .send({ title: 'X', speakerName: 'Y', ...makeTimes(0), room: 'Hall A' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('SESSION_FORBIDDEN');
  });

  it('26a-9: non-existent expo → 404 EXPO_NOT_FOUND', async () => {
    const fakeExpoId = new ObjectId().toString();
    const res = await request(app)
      .post(`/api/expos/${fakeExpoId}/sessions`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ title: 'X', speakerName: 'Y', ...makeTimes(0), room: 'Hall A' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('EXPO_NOT_FOUND');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 26b — PATCH /api/expos/:expoId/sessions/:id — update
// ═════════════════════════════════════════════════════════════════════════════

describe('PATCH /api/expos/:expoId/sessions/:id — update (26b)', () => {
  let organizer: Awaited<ReturnType<typeof createTestUser>>;
  let organizerToken: string;
  let otherOrganizer: Awaited<ReturnType<typeof createTestUser>>;
  let otherOrganizerToken: string;

  beforeAll(async () => {
    organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    organizerToken = generateTestAccessToken(organizer);

    otherOrganizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    otherOrganizerToken = generateTestAccessToken(otherOrganizer);
  });

  it('26b-1: owner updates title → 200, updated title returned', async () => {
    const expoId = await insertExpo(organizer._id.toString());
    const session = await createSession(expoId, organizerToken, { title: 'Original' });

    const res = await request(app)
      .patch(`/api/expos/${expoId}/sessions/${session._id}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session.title).toBe('Updated Title');
  });

  it('26b-2: room conflict on update → 409 ROOM_CONFLICT', async () => {
    const expoId = await insertExpo(organizer._id.toString());

    // Session A: Hall A 0h→1h
    await createSession(expoId, organizerToken, {
      title: 'Session A',
      ...makeTimes(0, 1),
      room: 'Hall A',
    });

    // Session B: Hall B 0h→1h (different room — no conflict)
    const sessionB = await createSession(expoId, organizerToken, {
      title: 'Session B',
      ...makeTimes(0, 1),
      room: 'Hall B',
    });

    // Now try to move Session B into Hall A — should conflict with Session A
    const res = await request(app)
      .patch(`/api/expos/${expoId}/sessions/${sessionB._id}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ room: 'Hall A' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ROOM_CONFLICT');
  });

  it('26b-3: self-exclusion — title-only update on session in Hall A → 200 (no false conflict)', async () => {
    const expoId = await insertExpo(organizer._id.toString());
    const sessionA = await createSession(expoId, organizerToken, {
      title: 'Original',
      ...makeTimes(0, 1),
      room: 'Hall A',
    });

    // Patching only the title — should NOT conflict with itself
    const res = await request(app)
      .patch(`/api/expos/${expoId}/sessions/${sessionA._id}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ title: 'Renamed Session' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.session.title).toBe('Renamed Session');
  });

  it('26b-4: endTime ≤ startTime on update → 400 INVALID_TIME_RANGE', async () => {
    const expoId = await insertExpo(organizer._id.toString());
    const session = await createSession(expoId, organizerToken);
    const { startTime, endTime } = makeTimes(2, 1);

    const res = await request(app)
      .patch(`/api/expos/${expoId}/sessions/${session._id}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        startTime: endTime,   // reversed
        endTime: startTime,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_TIME_RANGE');
  });

  it('26b-5: non-owner → 403 SESSION_FORBIDDEN', async () => {
    const expoId = await insertExpo(organizer._id.toString());
    const session = await createSession(expoId, organizerToken);

    const res = await request(app)
      .patch(`/api/expos/${expoId}/sessions/${session._id}`)
      .set('Authorization', `Bearer ${otherOrganizerToken}`)
      .send({ title: 'Hijacked' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('SESSION_FORBIDDEN');
  });

  it('26b-6: unauthenticated → 401', async () => {
    const expoId = await insertExpo(organizer._id.toString());
    const session = await createSession(expoId, organizerToken);

    const res = await request(app)
      .patch(`/api/expos/${expoId}/sessions/${session._id}`)
      .send({ title: 'No Auth' });

    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 26c — DELETE /api/expos/:expoId/sessions/:id — delete
// ═════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/expos/:expoId/sessions/:id — delete (26c)', () => {
  let organizer: Awaited<ReturnType<typeof createTestUser>>;
  let organizerToken: string;
  let otherOrganizer: Awaited<ReturnType<typeof createTestUser>>;
  let otherOrganizerToken: string;

  beforeAll(async () => {
    organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    organizerToken = generateTestAccessToken(organizer);

    otherOrganizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    otherOrganizerToken = generateTestAccessToken(otherOrganizer);
  });

  it('26c-1: owner deletes → 200, session gone from DB', async () => {
    const expoId = await insertExpo(organizer._id.toString());
    const session = await createSession(expoId, organizerToken);

    const res = await request(app)
      .delete(`/api/expos/${expoId}/sessions/${session._id}`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirm the record no longer exists in the DB
    const db = getTestDb();
    const record = await db
      .collection('sessions')
      .findOne({ _id: new ObjectId(session._id) });
    expect(record).toBeNull();
  });

  it('26c-2: delete cascades bookmarks (REQ-6.7)', async () => {
    const expoId = await insertExpo(organizer._id.toString());
    const session = await createSession(expoId, organizerToken);
    const db = getTestDb();

    // Insert 2 bookmarks directly (simulate two attendees bookmarking the session)
    await db.collection('bookmarks').insertMany([
      {
        sessionId: new ObjectId(session._id),
        attendeeId: new ObjectId(),
        createdAt: new Date(),
      },
      {
        sessionId: new ObjectId(session._id),
        attendeeId: new ObjectId(),
        createdAt: new Date(),
      },
    ]);

    // Verify bookmarks exist before delete
    const beforeCount = await db
      .collection('bookmarks')
      .countDocuments({ sessionId: new ObjectId(session._id) });
    expect(beforeCount).toBe(2);

    // Delete the session
    const res = await request(app)
      .delete(`/api/expos/${expoId}/sessions/${session._id}`)
      .set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(200);

    // All bookmarks for this session must be gone
    const afterCount = await db
      .collection('bookmarks')
      .countDocuments({ sessionId: new ObjectId(session._id) });
    expect(afterCount).toBe(0);
  });

  it('26c-3: non-owner → 403 SESSION_FORBIDDEN', async () => {
    const expoId = await insertExpo(organizer._id.toString());
    const session = await createSession(expoId, organizerToken);

    const res = await request(app)
      .delete(`/api/expos/${expoId}/sessions/${session._id}`)
      .set('Authorization', `Bearer ${otherOrganizerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('SESSION_FORBIDDEN');
  });

  it('26c-4: unauthenticated → 401', async () => {
    const expoId = await insertExpo(organizer._id.toString());
    const session = await createSession(expoId, organizerToken);

    const res = await request(app)
      .delete(`/api/expos/${expoId}/sessions/${session._id}`);

    expect(res.status).toBe(401);
  });

  it('26c-5: non-existent session id → 404 SESSION_NOT_FOUND', async () => {
    const expoId = await insertExpo(organizer._id.toString());
    const fakeSessionId = new ObjectId().toString();

    const res = await request(app)
      .delete(`/api/expos/${expoId}/sessions/${fakeSessionId}`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('SESSION_NOT_FOUND');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /api/expos/:expoId/sessions — list
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/expos/:expoId/sessions — list', () => {
  let organizer: Awaited<ReturnType<typeof createTestUser>>;
  let organizerToken: string;
  let attendee: Awaited<ReturnType<typeof createTestUser>>;
  let attendeeToken: string;

  beforeAll(async () => {
    organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    organizerToken = generateTestAccessToken(organizer);

    attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });
    attendeeToken = generateTestAccessToken(attendee);
  });

  it('list-1: returns sessions sorted by startTime ascending', async () => {
    const expoId = await insertExpo(organizer._id.toString());

    // Insert out-of-order: offset 2h, 0h, 1h
    await createSession(expoId, organizerToken, {
      title: 'Third',
      ...makeTimes(2, 1),
      room: 'Hall A',
    });
    await createSession(expoId, organizerToken, {
      title: 'First',
      ...makeTimes(0, 1),
      room: 'Hall B',
    });
    await createSession(expoId, organizerToken, {
      title: 'Second',
      ...makeTimes(1, 1),
      room: 'Hall C',
    });

    const res = await request(app)
      .get(`/api/expos/${expoId}/sessions`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const sessions = res.body.data.sessions;
    expect(sessions.length).toBe(3);
    expect(sessions[0].title).toBe('First');
    expect(sessions[1].title).toBe('Second');
    expect(sessions[2].title).toBe('Third');
  });

  it('list-2: empty array when no sessions', async () => {
    const expoId = await insertExpo(organizer._id.toString());

    const res = await request(app)
      .get(`/api/expos/${expoId}/sessions`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessions).toEqual([]);
  });

  it('list-3: organizer can list', async () => {
    const expoId = await insertExpo(organizer._id.toString());
    await createSession(expoId, organizerToken);

    const res = await request(app)
      .get(`/api/expos/${expoId}/sessions`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessions.length).toBe(1);
  });

  it('list-4: attendee can list', async () => {
    const expoId = await insertExpo(organizer._id.toString());
    await createSession(expoId, organizerToken);

    const res = await request(app)
      .get(`/api/expos/${expoId}/sessions`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessions.length).toBe(1);
  });

  it('list-5: unauthenticated → 401', async () => {
    const expoId = await insertExpo(organizer._id.toString());

    const res = await request(app)
      .get(`/api/expos/${expoId}/sessions`);

    expect(res.status).toBe(401);
  });
});
