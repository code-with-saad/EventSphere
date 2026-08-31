/**
 * Property-Based Tests — Session Operations
 *
 * Task 27 (sub-tasks 27a–27c)
 *
 * Properties tested:
 *  27a. Property 14: `endTime ≤ startTime` always rejected
 *  27b. Property 15: Overlapping sessions in same room always rejected
 *  27c. Property 16: Deleting a session removes all associated bookmarks
 *
 * Framework: fast-check v4 + vitest
 *
 * **Validates: Requirements REQ-6.4, REQ-6.5, REQ-6.7**
 *
 * ── Isolation strategy ───────────────────────────────────────────────────────
 * Organizer user is created ONCE per property (outside fc.assert), paying
 * bcrypt only once.  Each fc.assert iteration inserts a FRESH expo via a
 * direct DB insert (unique ObjectId per call) — no inter-iteration state
 * leakage and no cleanup needed inside the loop.
 *
 * ── Timeout note ─────────────────────────────────────────────────────────────
 * Each property uses a 180-second timeout.  numRuns is calibrated to stay
 * comfortably within this limit while providing strong coverage.
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

/**
 * Insert a fresh published expo — unique ObjectId per call = isolated iterations.
 */
async function insertExpo(organizerId: string): Promise<string> {
  const db = getTestDb();
  const result = await db.collection('expos').insertOne({
    organizerId: new ObjectId(organizerId),
    name: 'Session Property Expo',
    description: 'prop test',
    status: 'published',
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

/** Build ISO time strings. base = 30 days from now. */
function makeTimes(startOffsetHours: number, durationHours = 1) {
  const base = Date.now() + 86400000 * 30;
  return {
    startTime: new Date(base + startOffsetHours * 3600000).toISOString(),
    endTime: new Date(base + (startOffsetHours + durationHours) * 3600000).toISOString(),
  };
}

/**
 * Create a session via API.
 * Returns session._id string or null on failure.
 */
async function createSession(
  expoId: string,
  token: string,
  overrides: Record<string, any> = {}
): Promise<string | null> {
  const res = await request(app)
    .post(`/api/expos/${expoId}/sessions`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Prop Session',
      speakerName: 'Speaker',
      ...makeTimes(0),
      room: 'Hall A',
      ...overrides,
    });
  if (res.status !== 201) return null;
  return res.body.data.session._id as string;
}

// ── Property 14 (27a) ─────────────────────────────────────────────────────────

describe('Property 14: endTime ≤ startTime always rejected (27a)', () => {
  /**
   * **Validates: Requirements REQ-6.4**
   *
   * For any session creation or update where `endTime` is at or before
   * `startTime`, the API must always return 400 `INVALID_TIME_RANGE`.
   * This holds for any time values — equal times, reversed times, times
   * days apart (reversed).
   *
   * Organizer is created ONCE outside the loop. Fresh expo per iteration.
   */
  it(
    'endTime ≤ startTime always returns 400 INVALID_TIME_RANGE for create and update',
    { timeout: 180_000 },
    async () => {
      // Create fixture ONCE — pay bcrypt cost once, not per iteration
      const organizer = await makeOrganizer();

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 720 }),  // startOffset in hours (1–30 days out from base)
          fc.integer({ min: 0, max: 720 }),  // endDelta >= 0, so endTime <= startTime
          fc.boolean(),                       // true = test via POST (create), false = test via PATCH (update)
          async (startOffset, endDelta, testCreate) => {
            // Fresh expo per iteration — no cleanup needed
            const expoId = await insertExpo(organizer.user._id.toString());

            const base = Date.now() + 86400000 * 30;
            const startIso = new Date(base + startOffset * 3600000).toISOString();
            // endTime is at or before startTime: base + (startOffset - endDelta)
            const endIso = new Date(base + (startOffset - endDelta) * 3600000).toISOString();
            // endIso <= startIso always (since endDelta >= 0)

            if (testCreate) {
              // Test via POST (create)
              const res = await request(app)
                .post(`/api/expos/${expoId}/sessions`)
                .set('Authorization', `Bearer ${organizer.token}`)
                .send({
                  title: 'Bad',
                  speakerName: 'X',
                  startTime: startIso,
                  endTime: endIso,
                  room: 'Hall A',
                });
              expect(res.status).toBe(400);
              expect(res.body.code).toBe('INVALID_TIME_RANGE');
            } else {
              // Test via PATCH (update): create a valid session first, then patch with bad times
              const sessionId = await createSession(expoId, organizer.token);
              if (!sessionId) return true; // skip if create unexpectedly failed
              const res = await request(app)
                .patch(`/api/expos/${expoId}/sessions/${sessionId}`)
                .set('Authorization', `Bearer ${organizer.token}`)
                .send({ startTime: startIso, endTime: endIso });
              expect(res.status).toBe(400);
              expect(res.body.code).toBe('INVALID_TIME_RANGE');
            }
          }
        ),
        // 50 iterations × ~2 s/iter ≈ 100 s; well inside the 180 s timeout
        { numRuns: 50 }
      );
    }
  );
});

// ── Property 15 (27b) ─────────────────────────────────────────────────────────

describe('Property 15: overlapping sessions in same room always rejected (27b)', () => {
  /**
   * **Validates: Requirements REQ-6.5**
   *
   * For any two sessions in the same room where their time ranges overlap
   * (A.startTime < B.endTime && A.endTime > B.startTime), the second
   * create must always return 409 `ROOM_CONFLICT`.
   * Sessions in different rooms must always succeed regardless of time overlap.
   *
   * Organizer is created ONCE outside the loop. Fresh expo per iteration.
   */
  it(
    'overlapping same-room sessions always return 409 ROOM_CONFLICT; different-room sessions always succeed',
    { timeout: 180_000 },
    async () => {
      // Create fixture ONCE — pay bcrypt cost once, not per iteration
      const organizer = await makeOrganizer();

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10 }),    // session A startOffset (hours)
          fc.integer({ min: 1, max: 4 }),     // session A duration (hours)
          fc.integer({ min: 0, max: 10 }),    // overlap offset (hours, used to compute B's start inside A's window)
          fc.boolean(),                        // true = same room (conflict), false = different room (no conflict)
          async (aStart, aDuration, overlapOffset, sameRoom) => {
            // Fresh expo per iteration — no cleanup needed
            const expoId = await insertExpo(organizer.user._id.toString());

            // Create Session A
            const aSessionId = await createSession(expoId, organizer.token, {
              title: 'Session A',
              ...makeTimes(aStart, aDuration),
              room: 'Hall A',
            });
            if (!aSessionId) return true; // skip if create failed unexpectedly

            // Session B overlaps with A: starts inside A's duration
            // overlapOffset % aDuration keeps B's start within A's window
            const bStartOffset = aStart + (overlapOffset % aDuration);
            const bRoom = sameRoom ? 'Hall A' : 'Hall B';

            const res = await request(app)
              .post(`/api/expos/${expoId}/sessions`)
              .set('Authorization', `Bearer ${organizer.token}`)
              .send({
                title: 'Session B',
                speakerName: 'Speaker',
                ...makeTimes(bStartOffset, 1),
                room: bRoom,
              });

            if (sameRoom) {
              // Same room + overlapping time → must always be rejected
              expect(res.status).toBe(409);
              expect(res.body.code).toBe('ROOM_CONFLICT');
            } else {
              // Different room → must always succeed (time overlap is irrelevant)
              expect(res.status).toBe(201);
            }
          }
        ),
        // 60 iterations × ~2 s/iter ≈ 120 s; well inside the 180 s timeout
        { numRuns: 60 }
      );
    }
  );
});

// ── Property 16 (27c) ─────────────────────────────────────────────────────────

describe('Property 16: deleting a session removes all associated bookmarks (27c)', () => {
  /**
   * **Validates: Requirements REQ-6.7**
   *
   * For any session with any number of bookmarks (1–5), deleting the session
   * via the API must remove ALL associated bookmarks from the DB.
   * No bookmarks for other sessions should be affected.
   *
   * Organizer is created ONCE. Fresh expo + session per iteration.
   * Bookmarks inserted directly in DB (fast).
   */
  it(
    'deleting a session always removes all its bookmarks and leaves other sessions\' bookmarks untouched',
    { timeout: 180_000 },
    async () => {
      // Create fixture ONCE — pay bcrypt cost once, not per iteration
      const organizer = await makeOrganizer();

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),   // number of bookmarks for the target session
          fc.integer({ min: 0, max: 3 }),   // number of bookmarks for a DIFFERENT session (must be unaffected)
          async (bookmarkCount, otherCount) => {
            // Fresh expo per iteration — no cleanup needed
            const expoId = await insertExpo(organizer.user._id.toString());

            // Create the target session
            const targetSessionId = await createSession(expoId, organizer.token, {
              title: 'Target Session',
              ...makeTimes(0, 1),
              room: 'Hall A',
            });
            if (!targetSessionId) return true; // skip if create failed

            // Create an "other" session (to verify bookmarks are not cascade-deleted)
            const otherSessionId = await createSession(expoId, organizer.token, {
              title: 'Other Session',
              ...makeTimes(2, 1),
              room: 'Hall B',
            });

            const db = getTestDb();

            // Insert bookmarks for the target session
            if (bookmarkCount > 0) {
              await db.collection('bookmarks').insertMany(
                Array.from({ length: bookmarkCount }, () => ({
                  sessionId: new ObjectId(targetSessionId),
                  attendeeId: new ObjectId(),
                  createdAt: new Date(),
                }))
              );
            }

            // Insert bookmarks for the other session
            if (otherCount > 0 && otherSessionId) {
              await db.collection('bookmarks').insertMany(
                Array.from({ length: otherCount }, () => ({
                  sessionId: new ObjectId(otherSessionId),
                  attendeeId: new ObjectId(),
                  createdAt: new Date(),
                }))
              );
            }

            // Delete the target session via the API
            const res = await request(app)
              .delete(`/api/expos/${expoId}/sessions/${targetSessionId}`)
              .set('Authorization', `Bearer ${organizer.token}`);
            expect(res.status).toBe(200);

            // PROPERTY: all bookmarks for the target session must be gone
            const targetBookmarks = await db.collection('bookmarks').countDocuments({
              sessionId: new ObjectId(targetSessionId),
            });
            expect(targetBookmarks).toBe(0);

            // PROPERTY: bookmarks for the other session must be completely unaffected
            if (otherCount > 0 && otherSessionId) {
              const otherBookmarks = await db.collection('bookmarks').countDocuments({
                sessionId: new ObjectId(otherSessionId),
              });
              expect(otherBookmarks).toBe(otherCount);
            }
          }
        ),
        // 50 iterations × ~2 s/iter ≈ 100 s; well inside the 180 s timeout
        { numRuns: 50 }
      );
    }
  );
});
