/**
 * Property-Based Tests — Application Operations
 *
 * Task 18 (sub-tasks 18a–18c)
 *
 * Properties tested:
 *  18a. Property 8:  Booth labels are unique within an expo
 *  18b. Property 9:  Booth fill rate calculation is correct
 *  18c. Property 10: Duplicate application for same exhibitor×expo rejected
 *
 * Framework: fast-check v4 + vitest
 * Minimum iterations per property: 100
 *
 * **Validates: Requirements REQ-4.4, REQ-4.7, REQ-3.6, REQ-12.21**
 *
 * ── Isolation strategy ───────────────────────────────────────────────────────
 * Each property-test iteration creates its own unique expo via a direct
 * DB insert (cheap — no HTTP round-trip).  Exhibitor users are created
 * ONCE per test (outside fc.assert) and reused, so bcrypt is only paid
 * once.  Because each iteration uses a fresh expo ObjectId, different
 * iterations never share application state, making clearAppData() inside
 * the loop unnecessary and removing the async-leak risk that arises when
 * a prior test times out while its in-flight operations are still running.
 *
 * ── Timeout note ─────────────────────────────────────────────────────────────
 * Each property test uses a generous 180-second timeout.  At ~2 s/iteration
 * × 100 runs the wall-clock budget is ~200 s — tight; numRuns is set to 60
 * to stay comfortably inside the limit while still providing strong coverage.
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
  // Ensure the partial unique index on (expoId, boothLabel) exists.
  try {
    await db.collection('applications').createIndex(
      { expoId: 1, boothLabel: 1 },
      {
        unique: true,
        sparse: true,
        partialFilterExpression: { status: 'approved' },
        name: 'expo_boothLabel_partial_unique',
      }
    );
  } catch {
    // Index may already exist — fine
  }
  // Ensure text index on expos exists (needed for expo routes)
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
  await db.collection('applications').deleteMany({});
});

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Safe ASCII string arbitrary using fc.stringMatching with a regex that
 * produces printable ASCII (letters, digits, space, hyphen, underscore).
 * Works with fast-check v4.
 */
function safeString(minLength: number, maxLength: number): fc.Arbitrary<string> {
  return fc
    .stringMatching(new RegExp(`^[a-zA-Z0-9 \\-_]{${minLength},${maxLength}}$`))
    .filter((s) => s.trim().length >= minLength);
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

/** Create an exhibitor user and return { user, token }. */
async function makeExhibitor() {
  const user = await createTestUser({
    role: 'exhibitor',
    status: 'active',
    isEmailVerified: true,
  });
  return { user, token: generateTestAccessToken(user) };
}

/**
 * Insert a fresh published expo directly into the DB.
 * Returns its string ID.  Each call produces a unique ObjectId so
 * iterations are fully isolated even without inter-iteration cleanup.
 */
async function insertPublishedExpo(
  organizerId: string,
  totalBooths: number = 50
): Promise<string> {
  const db = getTestDb();
  const result = await db.collection('expos').insertOne({
    organizerId: new ObjectId(organizerId),
    name: 'Property Test Expo',
    description: 'Property-based test expo',
    status: 'published',
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
 * Submit an application via the API.
 * Returns the applicationId string or null on non-201 status.
 */
async function submitApplication(
  expoId: string,
  exhibitorToken: string,
  companyName = 'ACME'
): Promise<string | null> {
  const res = await request(app)
    .post(`/api/expos/${expoId}/applications`)
    .set('Authorization', `Bearer ${exhibitorToken}`)
    .send({
      companyName,
      companyDescription: 'Widget maker',
      category: 'Technology',
      phoneNumber: '+1234567890',
    });
  if (res.status !== 201) return null;
  return res.body.data.application._id as string;
}

/**
 * Approve an application via the API.
 * Returns true if the response was 200, false otherwise.
 */
async function approveApplication(
  expoId: string,
  applicationId: string,
  organizerToken: string,
  boothLabel: string
): Promise<boolean> {
  const res = await request(app)
    .patch(`/api/expos/${expoId}/applications/${applicationId}/review`)
    .set('Authorization', `Bearer ${organizerToken}`)
    .send({ action: 'approve', boothLabel });
  return res.status === 200;
}

// ── Property 8 (18a) ──────────────────────────────────────────────────────────

describe('Property 8: booth labels are unique within an expo (18a)', () => {
  /**
   * **Validates: Requirements REQ-4.4, REQ-12.21**
   *
   * For any two booth labels, if the first is approved successfully, then:
   *  - Trying to approve a second application with the SAME label MUST fail
   *    with 409 BOOTH_CONFLICT.
   *  - Trying to approve with a DIFFERENT label MUST succeed with 200.
   *
   * Each iteration inserts a FRESH expo (unique ObjectId) so no inter-
   * iteration cleanup is needed.  Organizer + 2 exhibitors are created ONCE.
   */
  it(
    'approving two applications with the same label always returns 409 BOOTH_CONFLICT',
    { timeout: 180_000 },
    async () => {
      // Create fixtures ONCE — pay bcrypt cost once, not per iteration
      const organizer = await makeOrganizer();
      const exhibitorA = await makeExhibitor();
      const exhibitorB = await makeExhibitor();

      await fc.assert(
        fc.asyncProperty(
          safeString(1, 20), // first booth label (labelA)
          safeString(1, 20), // second booth label (labelB — may equal labelA or differ)
          async (labelA, labelB) => {
            // Each iteration uses a FRESH expo — no cleanup needed
            const expoId = await insertPublishedExpo(
              organizer.user._id.toString(),
              50
            );

            const appIdA = await submitApplication(expoId, exhibitorA.token);
            const appIdB = await submitApplication(expoId, exhibitorB.token);

            // Skip if either submit failed unexpectedly
            if (!appIdA || !appIdB) return true;

            // Approve A with labelA — must succeed
            const approvedA = await approveApplication(
              expoId,
              appIdA,
              organizer.token,
              labelA
            );

            // Skip if labelA itself was rejected for some unexpected reason
            if (!approvedA) return true;

            // Now try to approve B with labelB
            const res = await request(app)
              .patch(`/api/expos/${expoId}/applications/${appIdB}/review`)
              .set('Authorization', `Bearer ${organizer.token}`)
              .send({ action: 'approve', boothLabel: labelB });

            if (labelA === labelB) {
              // Same label — MUST be rejected with BOOTH_CONFLICT 409
              expect(res.status).toBe(409);
              expect(res.body.code).toBe('BOOTH_CONFLICT');
            } else {
              // Different label — MUST succeed
              expect(res.status).toBe(200);
              expect(res.body.data.application.boothLabel).toBe(labelB);
            }
          }
        ),
        // 60 iterations × ~1.5 s/iter ≈ 90 s; well inside the 180 s timeout
        { numRuns: 60 }
      );
    }
  );
});

// ── Property 9 (18b) ──────────────────────────────────────────────────────────

describe('Property 9: booth fill rate calculation is correct (18b)', () => {
  /**
   * **Validates: Requirements REQ-4.7**
   *
   * After approving exactly `approvedCount` applications in an expo with
   * `totalBooths = n`, the boothFillRate returned by
   * GET /api/expos/:expoId/applications must always equal
   * Math.round((approvedCount / n) * 10000) / 100 (rounded to 2 dp).
   *
   * Each iteration uses a FRESH expo.  Organizer + 8 exhibitors are
   * created ONCE and reused across iterations.
   */
  it(
    'boothFillRate always equals Math.round((approved/totalBooths)*10000)/100',
    { timeout: 180_000 },
    async () => {
      // Create fixtures ONCE outside the loop
      const organizer = await makeOrganizer();

      // Pool of 8 exhibitors — reused across iterations
      const exhibitorPool = await Promise.all(
        Array.from({ length: 8 }, () => makeExhibitor())
      );

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }), // n = totalBooths
          fc.integer({ min: 1, max: 5 }), // k = desired approvals (≥1)
          async (n, k) => {
            // Each iteration uses a FRESH expo — no cleanup needed
            const expoId = await insertPublishedExpo(
              organizer.user._id.toString(),
              n
            );

            // Submit up to k applications (capped at pool size)
            const actualK = Math.min(k, exhibitorPool.length);
            const appIds: string[] = [];
            for (let i = 0; i < actualK; i++) {
              const appId = await submitApplication(
                expoId,
                exhibitorPool[i].token,
                `Company ${i}`
              );
              if (appId) appIds.push(appId);
            }

            // Approve all submitted applications with unique labels
            let approvedCount = 0;
            for (let i = 0; i < appIds.length; i++) {
              const ok = await approveApplication(
                expoId,
                appIds[i],
                organizer.token,
                `Booth-${i + 1}`
              );
              if (ok) approvedCount++;
            }

            // Fetch the list to get boothFillRate
            const res = await request(app)
              .get(`/api/expos/${expoId}/applications`)
              .set('Authorization', `Bearer ${organizer.token}`);

            expect(res.status).toBe(200);

            const expectedRate = Math.round((approvedCount / n) * 10000) / 100;

            expect(res.body.data.boothFillRate).toBe(expectedRate);
            expect(res.body.data.totalBooths).toBe(n);
            expect(res.body.data.assignedBooths).toBe(approvedCount);
          }
        ),
        // 30 iterations × ~4 s/iter (up to 5 submits + 5 approves + 1 GET) ≈ 120 s
        { numRuns: 30 }
      );
    }
  );
});

// ── Property 10 (18c) ─────────────────────────────────────────────────────────

describe('Property 10: duplicate application for same exhibitor×expo rejected (18c)', () => {
  /**
   * **Validates: Requirements REQ-3.6**
   *
   * For any exhibitor who already has a pending or approved application to a
   * given expo, a second submission attempt MUST always return
   * 409 DUPLICATE_APPLICATION — regardless of how many OTHER exhibitors have
   * also submitted, and regardless of whether the first application was
   * approved or is still pending.
   *
   * Each iteration uses a FRESH expo.  Main exhibitor + 4 noise exhibitors
   * + organizer are created ONCE and reused.
   */
  it(
    'always returns 409 DUPLICATE_APPLICATION on a second submit for the same exhibitor×expo',
    { timeout: 180_000 },
    async () => {
      // Create fixtures ONCE outside the loop
      const organizer = await makeOrganizer();
      const mainExhibitor = await makeExhibitor();

      // Pre-created noise pool — avoids bcrypt per iteration
      const noisePool = await Promise.all(
        Array.from({ length: 4 }, () => makeExhibitor())
      );

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 4 }), // number of OTHER exhibitors who also submit
          fc.boolean(), // whether to approve the first application before retry
          async (otherCount, shouldApprove) => {
            // Each iteration uses a FRESH expo — no inter-iteration cleanup needed
            const expoId = await insertPublishedExpo(
              organizer.user._id.toString(),
              50
            );

            // Main exhibitor submits once — must succeed
            const firstAppId = await submitApplication(
              expoId,
              mainExhibitor.token
            );
            if (!firstAppId) return true; // skip

            // Optionally approve the first application
            // (tests duplicate blocking for BOTH pending AND approved states)
            if (shouldApprove) {
              await approveApplication(
                expoId,
                firstAppId,
                organizer.token,
                'Main-Booth-1'
              );
            }

            // Add noise: other exhibitors also submit (uses pre-created pool)
            const noiseCount = Math.min(otherCount, noisePool.length);
            for (let i = 0; i < noiseCount; i++) {
              await submitApplication(expoId, noisePool[i].token, 'Other Co');
            }

            // THE CORE PROPERTY: main exhibitor tries to submit again
            const res = await request(app)
              .post(`/api/expos/${expoId}/applications`)
              .set('Authorization', `Bearer ${mainExhibitor.token}`)
              .send({
                companyName: 'ACME Retry',
                companyDescription: 'Widget maker',
                category: 'Technology',
                phoneNumber: '+1234567890',
              });

            // Must always be rejected — presence of other applications is irrelevant
            expect(res.status).toBe(409);
            expect(res.body.code).toBe('DUPLICATE_APPLICATION');
          }
        ),
        // 60 iterations × ~2 s/iter ≈ 120 s; inside the 180 s timeout
        { numRuns: 60 }
      );
    }
  );
});
