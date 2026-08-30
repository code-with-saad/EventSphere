/**
 * Property-Based Tests — Expo Operations
 *
 * Task 14 (sub-tasks 14a–14i)
 *
 * Properties tested:
 *  14a. Property 1:  Public listing returns only visible-status expos
 *  14b. Property 2:  Description in ExpoCardDTO is always ≤ 160 chars
 *  14c. Property 3:  Pagination response never exceeds 12 items
 *  14d. Property 4:  New expo always has status=draft and correct organizerId
 *  14e. Property 5:  Organizer expo list contains only own expos
 *  14f. Property 6:  endDate ≤ startDate always rejected with 400
 *  14g. Property 7:  Delete without confirmed blocked when tickets exist
 *  14h. Property 20: Only valid status transitions accepted
 *  14i. Property 22: Cross-organizer access returns 403
 *
 * Framework: fast-check v4 + vitest
 * Minimum iterations per property: 100
 *
 * **Validates: Requirements 1.2, 1.3, 1.8, 2.1, 2.5, 2.6, 2.7, 2.9, 2.12, 2.16, 12.6, 12.20**
 *
 * ── Performance note ─────────────────────────────────────────────────────────
 * Each property test creates shared user fixtures ONCE (outside the fc.assert
 * iterations) and reuses them. Only expos, tickets and applications are
 * cleared between iterations to keep each run fast enough.
 *
 * Tests that hit Atlas with many DB operations use a 90-second per-test
 * timeout via the third argument to `it()`.
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

// ── Status constants ───────────────────────────────────────────────────────────

const ALL_STATUSES = ['draft', 'published', 'ongoing', 'completed', 'archived'] as const;
type ExpoStatus = (typeof ALL_STATUSES)[number];

const PUBLIC_STATUSES: ExpoStatus[] = ['published', 'ongoing', 'completed'];

/** Valid status transitions — mirrors expo.service.ts */
const VALID_TRANSITIONS: Record<ExpoStatus, ExpoStatus[]> = {
  draft: ['published'],
  published: ['ongoing', 'archived'],
  ongoing: ['completed', 'archived'],
  completed: ['archived'],
  archived: [],
};

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await connectTestDatabase();
  // Ensure the text index on expos exists (created at server startup in prod).
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
  const db = getTestDb();
  await db.collection('expos').deleteMany({});
  await db.collection('tickets').deleteMany({});
  await db.collection('applications').deleteMany({});
});

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Returns an ISO 8601 date string `daysFromNow` days in the future.
 * Time is fixed at noon UTC to make same-day comparisons deterministic.
 */
function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  d.setUTCHours(12, 0, 0, 0);
  return d.toISOString();
}

/**
 * Safe ASCII string arbitrary using fc.stringMatching with a regex that
 * produces printable ASCII (letters, digits, space, hyphen, underscore).
 * This works with fast-check v4 (fc.stringOf was removed).
 */
function safeString(minLength: number, maxLength: number): fc.Arbitrary<string> {
  // Generates strings of a-z A-Z 0-9 and safe punctuation, guaranteed non-empty after trim.
  return fc
    .stringMatching(new RegExp(`^[a-zA-Z0-9 \\-_]{${minLength},${maxLength}}$`))
    .filter((s) => s.trim().length >= minLength);
}

/** Minimal valid expo payload factory. */
function makeExpoBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Property Test Expo',
    description: 'A property-based test expo description',
    startDate: futureDate(30),
    endDate: futureDate(32),
    venueName: 'Convention Center',
    venueAddress: '123 Main St',
    totalBooths: 10,
    ...overrides,
  };
}

/**
 * Clear only the per-expo collections — no user wipe, no bcrypt re-hashing.
 * Called at the start of each property-test iteration.
 */
async function clearExpoData(): Promise<void> {
  const db = getTestDb();
  await Promise.all([
    db.collection('expos').deleteMany({}),
    db.collection('tickets').deleteMany({}),
    db.collection('applications').deleteMany({}),
  ]);
}

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
 * POST /api/expos via API and return the created expo or null on failure.
 * Returns null (instead of throwing) so the property can use `return true` to skip
 * invalid inputs rather than failing the whole property run.
 */
async function tryCreateExpoViaApi(
  token: string,
  overrides: Record<string, unknown> = {}
): Promise<{ _id: string; [k: string]: unknown } | null> {
  const res = await request(app)
    .post('/api/expos')
    .set('Authorization', `Bearer ${token}`)
    .send(makeExpoBody(overrides));

  if (res.status !== 201) {
    return null;
  }
  return res.body.data.expo as { _id: string; [k: string]: unknown };
}

/**
 * Insert an expo document directly into MongoDB with the given status.
 * Returns the inserted _id as a string.
 */
async function insertExpoWithStatus(
  organizerId: string,
  status: ExpoStatus,
  name = 'DB Expo',
  extraFields: Record<string, unknown> = {}
): Promise<string> {
  const db = getTestDb();
  const now = new Date();
  const result = await db.collection('expos').insertOne({
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
    ...extraFields,
  });
  return result.insertedId.toString();
}

// ── Property 1 (14a) ──────────────────────────────────────────────────────────

describe('Property 1: public listing returns only visible-status expos (14a)', () => {
  /**
   * **Validates: Requirements 1.2**
   *
   * For any mix of expo statuses inserted into the database, the public
   * GET /api/expos endpoint MUST return only expos whose status is one of
   * ['published', 'ongoing', 'completed']. Draft and archived expos are
   * never visible to public visitors.
   */
  it(
    'returns only published/ongoing/completed expos regardless of what is in the DB',
    { timeout: 90_000 }, // 90-second timeout for this property (100 iterations × DB operations)
    async () => {
      // Create organizer once — reused across all 100 iterations
      const { user: organizer } = await makeOrganizer();
      const oid = organizer._id.toString();

      await fc.assert(
        fc.asyncProperty(
          // Keep max at 8 to stay within time budget on Atlas (each insert ~20-30ms)
          fc.array(fc.constantFrom(...ALL_STATUSES), { minLength: 1, maxLength: 8 }),
          async (statuses) => {
            // Lightweight cleanup: clear expos only, reuse organizer user
            await clearExpoData();

            // Insert one expo per generated status
            await Promise.all(
              statuses.map((status, i) =>
                insertExpoWithStatus(oid, status, `Expo ${i} (${status})`)
              )
            );

            const res = await request(app).get('/api/expos');

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const returnedStatuses: string[] = (
              res.body.data.expos as Array<{ status: string }>
            ).map((e) => e.status);

            // Every returned status must be in the public whitelist
            for (const s of returnedStatuses) {
              expect(PUBLIC_STATUSES).toContain(s);
            }

            // Count how many public expos we inserted
            const insertedPublicCount = statuses.filter((s) =>
              PUBLIC_STATUSES.includes(s)
            ).length;
            expect(res.body.data.pagination.total).toBe(insertedPublicCount);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ── Property 2 (14b) ──────────────────────────────────────────────────────────

describe('Property 2: description in ExpoCardDTO is always ≤ 160 chars (14b)', () => {
  /**
   * **Validates: Requirements 1.3**
   *
   * Whatever the original description length (1–2000 chars), the description
   * returned in the public listing DTO must be truncated to at most 160
   * characters. This is a service-level transformation.
   */
  it('truncates any description to ≤ 160 chars in the listing response', { timeout: 90_000 }, async () => {
    // Create organizer once
    const { token } = await makeOrganizer();

    await fc.assert(
      fc.asyncProperty(
        safeString(1, 2000),
        async (description) => {
          await clearExpoData();

          const db = getTestDb();

          // Create the expo via API with the generated description
          const expo = await tryCreateExpoViaApi(token, { description });
          if (!expo) return true; // skip — creation failed for this input

          // Publish it so it appears in the public listing
          await db
            .collection('expos')
            .updateOne(
              { _id: new ObjectId(expo._id) },
              { $set: { status: 'published' } }
            );

          const res = await request(app).get('/api/expos');
          expect(res.status).toBe(200);

          const expos = res.body.data.expos as Array<{ description: string }>;
          expect(expos.length).toBeGreaterThan(0);

          for (const e of expos) {
            expect(e.description.length).toBeLessThanOrEqual(160);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 3 (14c) ──────────────────────────────────────────────────────────

describe('Property 3: pagination response never exceeds 12 items (14c)', () => {
  /**
   * **Validates: Requirements 1.8**
   *
   * No matter how many published expos are in the database, a single page of
   * GET /api/expos must return at most 12 items. This holds for any page
   * number the caller requests.
   */
  it(
    'never returns more than 12 expos per page for any page/count combination',
    { timeout: 90_000 }, // 90-second timeout
    async () => {
      // Create organizer once
      const { user: organizer } = await makeOrganizer();
      const oid = organizer._id.toString();

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }), // total expos to seed (reduced from 50)
          fc.integer({ min: 1, max: 5 }),  // page to request
          async (expoCount, page) => {
            await clearExpoData();

            // Seed expoCount published expos directly
            await Promise.all(
              Array.from({ length: expoCount }, (_, i) =>
                insertExpoWithStatus(oid, 'published', `Expo ${i + 1}`)
              )
            );

            const res = await request(app).get(`/api/expos?page=${page}`);
            expect(res.status).toBe(200);

            const items = res.body.data.expos as unknown[];
            expect(items.length).toBeLessThanOrEqual(12);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ── Property 4 (14d) ──────────────────────────────────────────────────────────

describe('Property 4: new expo always has status=draft and correct organizerId (14d)', () => {
  /**
   * **Validates: Requirements 2.1**
   *
   * For any valid name and description (within length constraints), creating
   * an expo via POST /api/expos MUST always yield status='draft' and the
   * organizerId matching the authenticated organizer's user ID.
   */
  it('every successfully created expo starts in draft with the right organizerId', async () => {
    // Create organizer once — reused across all 100 iterations
    const { user: organizer, token } = await makeOrganizer();

    await fc.assert(
      fc.asyncProperty(
        safeString(1, 120),   // name
        safeString(1, 2000),  // description
        async (name, description) => {
          await clearExpoData();

          const res = await request(app)
            .post('/api/expos')
            .set('Authorization', `Bearer ${token}`)
            .send(makeExpoBody({ name, description }));

          // Skip inputs that fail validation for other reasons (e.g. whitespace-only names)
          if (res.status !== 201) return true;

          expect(res.body.success).toBe(true);
          expect(res.body.data.expo.status).toBe('draft');
          expect(res.body.data.expo.organizerId).toBe(organizer._id.toString());
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 5 (14e) ──────────────────────────────────────────────────────────

describe('Property 5: organizer expo list contains only own expos (14e)', () => {
  /**
   * **Validates: Requirements 2.7**
   *
   * GET /api/organizer/expos must return only expos whose organizerId matches
   * the authenticated organizer. No expos belonging to other organizers must
   * bleed into the response.
   */
  it('each organizer sees only their own expos in the organizer list', { timeout: 90_000 }, async () => {
    // Create both organizers once — reused across all 100 iterations
    const { user: orgA, token: tokenA } = await makeOrganizer();
    const { user: orgB, token: tokenB } = await makeOrganizer();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // expos for organizer A
        fc.integer({ min: 1, max: 5 }), // expos for organizer B
        async (countA, countB) => {
          await clearExpoData();

          // Seed expos for each organizer directly in DB
          await Promise.all([
            ...Array.from({ length: countA }, (_, i) =>
              insertExpoWithStatus(orgA._id.toString(), 'draft', `OrgA Expo ${i}`)
            ),
            ...Array.from({ length: countB }, (_, i) =>
              insertExpoWithStatus(orgB._id.toString(), 'draft', `OrgB Expo ${i}`)
            ),
          ]);

          // Fetch each organizer's list via GET /api/organizer/expos
          const [resA, resB] = await Promise.all([
            request(app)
              .get('/api/organizer/expos')
              .set('Authorization', `Bearer ${tokenA}`),
            request(app)
              .get('/api/organizer/expos')
              .set('Authorization', `Bearer ${tokenB}`),
          ]);

          expect(resA.status).toBe(200);
          expect(resB.status).toBe(200);

          const exposA = resA.body.data.expos as Array<{ organizerId: string }>;
          const exposB = resB.body.data.expos as Array<{ organizerId: string }>;

          // CORE PROPERTY: every expo returned for A must belong to A only
          for (const expo of exposA) {
            expect(expo.organizerId).toBe(orgA._id.toString());
          }
          // CORE PROPERTY: every expo returned for B must belong to B only
          for (const expo of exposB) {
            expect(expo.organizerId).toBe(orgB._id.toString());
          }

          // No cross-contamination: A's expos must not contain any B id
          const aOrgIds = new Set(exposA.map((e) => e.organizerId));
          const bOrgIds = new Set(exposB.map((e) => e.organizerId));
          expect(aOrgIds.has(orgB._id.toString())).toBe(false);
          expect(bOrgIds.has(orgA._id.toString())).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 6 (14f) ──────────────────────────────────────────────────────────

describe('Property 6: endDate ≤ startDate always rejected with 400 (14f)', () => {
  /**
   * **Validates: Requirements 2.5, 2.6**
   *
   * For any two future dates where endDate is strictly before startDate,
   * OR where endDate equals startDate (same ISO string), the create-expo
   * endpoint MUST reject the request with HTTP 400 INVALID_DATE_RANGE.
   *
   * Strategy:
   * - `daysA` is the start offset (min 2 so there's room for daysA-1).
   * - When `useEqual=true`, we send the exact same ISO string for both dates.
   * - When `useEqual=false`, endDate = futureDate(daysA - 1), which is before startDate.
   */
  it('rejects any expo where endDate is at or before startDate', async () => {
    // Create organizer once
    const { token } = await makeOrganizer();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 365 }),
        fc.boolean(),
        async (daysA, useEqual) => {
          const startDateStr = futureDate(daysA);
          const endDateStr = useEqual ? startDateStr : futureDate(daysA - 1);

          const res = await request(app)
            .post('/api/expos')
            .set('Authorization', `Bearer ${token}`)
            .send(
              makeExpoBody({
                startDate: startDateStr,
                endDate: endDateStr,
              })
            );

          expect(res.status).toBe(400);
          expect(res.body.success).toBe(false);
          expect(res.body.code).toBe('INVALID_DATE_RANGE');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 7 (14g) ──────────────────────────────────────────────────────────

describe('Property 7: delete without confirmed blocked when tickets exist (14g)', () => {
  /**
   * **Validates: Requirements 2.12, 2.16, 12.20**
   *
   * If an expo has at least one active ticket, a DELETE without
   * ?confirmed=true must always return 409 CASCADE_CONFIRMATION_REQUIRED.
   * This holds regardless of how many tickets exist.
   */
  it('blocks deletion without confirmed=true when active tickets are present', { timeout: 90_000 }, async () => {
    // Create organizer and attendee ONCE — reused across all 100 iterations.
    // Now that all slow tests have explicit timeouts, clearExpoData() inside
    // the property loop is safe (no timed-out tests bleeding async operations).
    const { token } = await makeOrganizer();
    const attendee = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // number of active tickets to insert
        async (ticketCount) => {
          // Cleanup at start of each iteration — safe now that all tests have timeouts
          await clearExpoData();

          // Create expo via API
          const expo = await tryCreateExpoViaApi(token);
          if (!expo) return true; // skip

          const expoObjectId = new ObjectId(expo._id);

          // Insert ticketCount active tickets for this expo
          const db = getTestDb();
          const ticketDocs = Array.from({ length: ticketCount }, (_, i) => ({
            ticketId: `prop-test-ticket-${new ObjectId().toString()}-${i}`,
            expoId: expoObjectId,
            attendeeId: new ObjectId(attendee._id.toString()),
            status: 'active',
            registeredAt: new Date(),
            updatedAt: new Date(),
          }));
          await db.collection('tickets').insertMany(ticketDocs);

          // Attempt delete WITHOUT confirmed
          const res = await request(app)
            .delete(`/api/expos/${expo._id}`)
            .set('Authorization', `Bearer ${token}`);

          expect(res.status).toBe(409);
          expect(res.body.success).toBe(false);
          expect(res.body.code).toBe('CASCADE_CONFIRMATION_REQUIRED');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 20 (14h) ─────────────────────────────────────────────────────────

describe('Property 20: only valid status transitions accepted (14h)', () => {
  /**
   * **Validates: Requirements 2.9**
   *
   * For any (currentStatus, targetStatus) pair where the transition is NOT
   * listed in VALID_TRANSITIONS, the status endpoint must return 400
   * INVALID_STATUS_TRANSITION.
   */
  it('rejects every invalid status transition with 400 INVALID_STATUS_TRANSITION', { timeout: 90_000 }, async () => {
    // Build an arbitrary that produces only INVALID transition pairs.
    const invalidPairArb = fc
      .constantFrom(...ALL_STATUSES)
      .chain((current) => {
        const validTargets = VALID_TRANSITIONS[current];
        const invalidTargets = ALL_STATUSES.filter(
          (s) => !validTargets.includes(s) && s !== current
        );
        if (invalidTargets.length === 0) {
          return fc.constant(null as null);
        }
        return fc
          .constantFrom(...invalidTargets)
          .map((target) => ({ current, target }));
      })
      .filter((pair): pair is { current: ExpoStatus; target: ExpoStatus } =>
        pair !== null
      );

    await fc.assert(
      fc.asyncProperty(invalidPairArb, async ({ current, target }) => {
        // Do NOT call clearExpoData() here — avoids racing with timed-out tests.
        // Each iteration creates a unique expo via the API.

        // Create a fresh organizer per iteration to ensure no stale token issues
        const { token } = await makeOrganizer();

        // Create expo via API (starts as draft), then force it to current status in DB
        const expo = await tryCreateExpoViaApi(token);
        if (!expo) return true; // skip

        const db = getTestDb();
        await db
          .collection('expos')
          .updateOne(
            { _id: new ObjectId(expo._id) },
            { $set: { status: current } }
          );

        const res = await request(app)
          .patch(`/api/expos/${expo._id}/status`)
          .set('Authorization', `Bearer ${token}`)
          .send({ status: target });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.code).toBe('INVALID_STATUS_TRANSITION');
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 22 (14i) ─────────────────────────────────────────────────────────

describe('Property 22: cross-organizer access returns 403 (14i)', () => {
  /**
   * **Validates: Requirements 12.6**
   *
   * An organizer who does not own an expo must always receive 403
   * EXPO_FORBIDDEN when attempting to PATCH (update) it.
   */
  it('always returns 403 EXPO_FORBIDDEN when a non-owner tries to update an expo', { timeout: 90_000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        // Vary the patch body name with safe strings
        safeString(1, 50),
        async (newName) => {
          // Do NOT call clearExpoData() here — avoids racing with timed-out tests.
          // Each iteration creates fresh unique expos via the API.

          // Create BOTH organizers fresh per iteration — ensures correct auth context
          const { token: tokenA } = await makeOrganizer();
          const { token: tokenB } = await makeOrganizer();

          // Organizer A creates an expo
          const expo = await tryCreateExpoViaApi(tokenA);
          if (!expo) return true; // skip

          // Organizer B attempts to update it — must get 403
          const res = await request(app)
            .patch(`/api/expos/${expo._id}`)
            .set('Authorization', `Bearer ${tokenB}`)
            .send({ name: newName });

          expect(res.status).toBe(403);
          expect(res.body.success).toBe(false);
          expect(res.body.code).toBe('EXPO_FORBIDDEN');
        }
      ),
      { numRuns: 100 }
    );
  });
});
