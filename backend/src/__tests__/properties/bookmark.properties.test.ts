/**
 * Property-Based Tests — Bookmark Operations
 *
 * Task 28 (sub-task 28a)
 *
 * Properties tested:
 *  28a. Property 17: Bookmark then remove returns session to pre-bookmarked state
 *
 * Framework: fast-check v4 + vitest
 *
 * **Validates: Requirements REQ-7.3, REQ-7.4**
 *
 * ── Isolation strategy ───────────────────────────────────────────────────────
 * Attendee user fixture is created ONCE per property (outside fc.assert),
 * paying bcrypt only once. Each fc.assert iteration inserts a FRESH expo +
 * session via direct DB insert (unique ObjectId per call) — no inter-iteration
 * state leakage and no cleanup needed inside the loop.
 *
 * Bookmark operations are tested at the service layer directly (no HTTP) since
 * BookmarkService has no auth requirements in its public interface.
 *
 * ── Timeout note ─────────────────────────────────────────────────────────────
 * The property uses a 120-second timeout. numRuns: 30 keeps us comfortably
 * within this limit.
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
import BookmarkService from '../../services/bookmark.service';

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
 * Insert a fresh expo + session directly in DB.
 * Returns { expoId, sessionId }.
 * Each call produces a unique ObjectId = isolated iterations.
 */
async function insertExpoAndSession(
  organizerId = new ObjectId().toString()
): Promise<{ expoId: string; sessionId: string }> {
  const db = getTestDb();
  const expoResult = await db.collection('expos').insertOne({
    organizerId: new ObjectId(organizerId),
    name: 'Bookmark Prop Expo',
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
  const base = Date.now() + 86400000 * 30;
  const sessionResult = await db.collection('sessions').insertOne({
    expoId: expoResult.insertedId,
    title: 'Prop Session',
    speakerName: 'Speaker',
    startTime: new Date(base),
    endTime: new Date(base + 3600000),
    room: 'Hall A',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return {
    expoId: expoResult.insertedId.toString(),
    sessionId: sessionResult.insertedId.toString(),
  };
}

// ── Property 17 (28a) ─────────────────────────────────────────────────────────

describe('Property 17: bookmark then remove returns session to pre-bookmarked state (28a)', () => {
  /**
   * **Validates: Requirements REQ-7.3, REQ-7.4**
   *
   * For any attendee and session:
   *
   * PROPERTY A (testNoOp = true):
   *   Calling remove() on a session that was never bookmarked is a no-op —
   *   it must not throw and must leave the bookmark count at 0.
   *
   * PROPERTY B (testNoOp = false, addCount = 1):
   *   Standard round-trip — add() then remove() leaves state identical to
   *   pre-add (0 bookmarks).
   *
   * PROPERTY B (testNoOp = false, addCount = 2 or 3):
   *   Idempotent add — calling add() multiple times before remove() still
   *   results in exactly 1 bookmark before the remove (idempotency), and
   *   exactly 0 after (round-trip completeness).
   *
   * Implementation uses BookmarkService directly (pure service-layer property).
   *
   * Attendee user is created ONCE outside the loop. Fresh expo + session per iteration.
   */
  it(
    'add then remove is a complete round trip; remove-without-add is a no-op; add is idempotent',
    { timeout: 120_000 },
    async () => {
      // Create fixture ONCE — pay bcrypt cost once, not per iteration
      const { user: attendee } = await makeAttendee();

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }), // times to call add() before the remove (idempotency axis)
          fc.boolean(),                    // whether to test remove-without-add (no-op axis)
          async (addCount, testNoOp) => {
            // Fresh expo + session per iteration — no cleanup needed
            const { sessionId } = await insertExpoAndSession();
            const attendeeId = new ObjectId().toString();

            if (testNoOp) {
              // PROPERTY A: remove on never-bookmarked session is a no-op — no throw, no DB change
              await expect(
                BookmarkService.remove(sessionId, attendeeId)
              ).resolves.toBeUndefined();

              const db = getTestDb();
              const count = await db.collection('bookmarks').countDocuments({
                sessionId: new ObjectId(sessionId),
                attendeeId: new ObjectId(attendeeId),
              });
              expect(count).toBe(0);
            } else {
              // PROPERTY B: add (1–3 times) then remove → state identical to before add
              for (let i = 0; i < addCount; i++) {
                await BookmarkService.add(sessionId, attendeeId);
              }

              // Verify exactly 1 bookmark exists regardless of addCount (idempotency)
              const db = getTestDb();
              const beforeRemove = await db.collection('bookmarks').countDocuments({
                sessionId: new ObjectId(sessionId),
                attendeeId: new ObjectId(attendeeId),
              });
              expect(beforeRemove).toBe(1); // idempotency: always 1

              // Remove
              await BookmarkService.remove(sessionId, attendeeId);

              // PROPERTY: state is now identical to pre-add (0 bookmarks)
              const afterRemove = await db.collection('bookmarks').countDocuments({
                sessionId: new ObjectId(sessionId),
                attendeeId: new ObjectId(attendeeId),
              });
              expect(afterRemove).toBe(0);
            }
          }
        ),
        { numRuns: 30 }
      );
    }
  );
});
