/**
 * Property-Based Tests — Expo Cascade on Archive
 *
 * Task 32 (sub-task 32a)
 *
 * Properties tested:
 *  32a. Property 21: after archive/delete with confirmed cascade, no `active`
 *       tickets and no `pending` applications remain for that expo.
 *
 * Framework: fast-check v4 + vitest
 *
 * **Validates: Requirements REQ-2.16**
 *
 * ── Isolation strategy ───────────────────────────────────────────────────────
 * Organizer user is created ONCE per property (outside fc.assert), paying
 * bcrypt only once.  Each fc.assert iteration inserts a FRESH expo via a
 * direct DB insert (unique ObjectId per call) — no inter-iteration state
 * leakage and no cleanup needed inside the loop.
 *
 * ── Timeout note ─────────────────────────────────────────────────────────────
 * Each property uses a 120-second timeout. numRuns: 30 keeps it well inside
 * that limit while providing solid coverage across the 4-dimensional input
 * space (activeTickets × pendingApps × cancelledTickets × rejectedApps).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ObjectId } from 'mongodb';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearCollections,
  getTestDb,
} from '../helpers/db';
import { createTestUser } from '../helpers/auth';
import ExpoService from '../../services/expo.service';

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
  // Ensure text index on expos exists
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
  await db.collection('tickets').deleteMany({});
  await db.collection('applications').deleteMany({});
});

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Insert a fresh published expo — unique ObjectId per call = isolated iterations.
 */
async function insertPublishedExpo(organizerId: string): Promise<string> {
  const db = getTestDb();
  const result = await db.collection('expos').insertOne({
    organizerId: new ObjectId(organizerId),
    name: 'Cascade Property Expo',
    description: 'A long enough description for publish validation purposes',
    status: 'published',
    startDate: new Date(Date.now() + 86400000 * 30),
    endDate: new Date(Date.now() + 86400000 * 32),
    venueName: 'Test Venue',
    venueAddress: '123 Test Street',
    totalBooths: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result.insertedId.toString();
}

/**
 * Insert `count` ticket documents with the given status for the given expo.
 */
async function insertTickets(expoId: string, count: number, status: string): Promise<void> {
  if (count === 0) return;
  const db = getTestDb();
  await db.collection('tickets').insertMany(
    Array.from({ length: count }, (_, i) => ({
      ticketId: `ticket-${expoId}-${status}-${i}-${Math.random()}`,
      expoId: new ObjectId(expoId),
      attendeeId: new ObjectId(),
      status,
      registeredAt: new Date(),
      updatedAt: new Date(),
    }))
  );
}

/**
 * Insert `count` application documents with the given status for the given expo.
 */
async function insertApplications(expoId: string, count: number, status: string): Promise<void> {
  if (count === 0) return;
  const db = getTestDb();
  await db.collection('applications').insertMany(
    Array.from({ length: count }, () => ({
      expoId: new ObjectId(expoId),
      exhibitorId: new ObjectId(),
      status,
      companyName: 'Test Co',
      companyDescription: 'desc',
      category: 'Tech',
      phoneNumber: '+1234567890',
      submittedAt: new Date(),
      updatedAt: new Date(),
    }))
  );
}

// ── Property 21 (32a) ─────────────────────────────────────────────────────────

describe('Property 21: confirmed cascade leaves no active tickets or pending applications (32a)', () => {
  /**
   * **Validates: Requirements REQ-2.16**
   *
   * After calling `ExpoService.transition(expoId, organizerId, 'archived', true)`
   * with `confirmed=true`, the database must contain:
   *   - Zero tickets with `status: 'active'` for that expo
   *   - Zero applications with `status: 'pending'` for that expo
   *
   * The property varies:
   *   - Number of active tickets to cascade (0–5)
   *   - Number of pending applications to cascade (0–5)
   *   - Number of already-cancelled tickets (these persist; active ones are added to cancelled count)
   *   - Number of already-rejected applications (these persist; pending ones are added to rejected count)
   *
   * Organizer is created ONCE outside the loop. Fresh expo per iteration.
   */
  it(
    'after archive with confirmed=true, zero active tickets and zero pending applications remain',
    { timeout: 120_000 },
    async () => {
      // Create organizer ONCE outside fc.assert — pay bcrypt cost once
      const organizer = await createTestUser({
        role: 'organizer',
        status: 'active',
        isEmailVerified: true,
      });

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 5 }), // active tickets to insert
          fc.integer({ min: 0, max: 5 }), // pending applications to insert
          fc.integer({ min: 0, max: 3 }), // already-cancelled tickets (noise)
          fc.integer({ min: 0, max: 3 }), // already-rejected applications (noise)
          async (activeTickets, pendingApps, cancelledTickets, rejectedApps) => {
            // Fresh expo per iteration — no cleanup needed
            const expoId = await insertPublishedExpo(organizer._id.toString());

            // Insert records that the cascade should affect
            await insertTickets(expoId, activeTickets, 'active');
            await insertApplications(expoId, pendingApps, 'pending');

            // Insert pre-existing cancelled/rejected records
            // Cascade will add to these counts (active→cancelled, pending→rejected)
            await insertTickets(expoId, cancelledTickets, 'cancelled');
            await insertApplications(expoId, rejectedApps, 'rejected');

            // Execute cascade via ExpoService.transition with confirmed=true
            await ExpoService.transition(
              expoId,
              organizer._id.toString(),
              'archived',
              true // confirmed
            );

            const db = getTestDb();
            const expoObjectId = new ObjectId(expoId);

            // PROPERTY: no active tickets remain after cascade
            const remainingActive = await db.collection('tickets').countDocuments({
              expoId: expoObjectId,
              status: 'active',
            });
            expect(remainingActive).toBe(0);

            // PROPERTY: no pending applications remain after cascade
            const remainingPending = await db.collection('applications').countDocuments({
              expoId: expoObjectId,
              status: 'pending',
            });
            expect(remainingPending).toBe(0);

            // PROPERTY: cancelled tickets count is now noise + cascaded active tickets
            const cancelledCount = await db.collection('tickets').countDocuments({
              expoId: expoObjectId,
              status: 'cancelled',
            });
            // Original noise remains, plus formerly-active tickets are now cancelled
            expect(cancelledCount).toBe(cancelledTickets + activeTickets);

            // PROPERTY: rejected applications count is now noise + cascaded pending apps
            const rejectedCount = await db.collection('applications').countDocuments({
              expoId: expoObjectId,
              status: 'rejected',
            });
            // Original noise remains, plus formerly-pending apps are now rejected
            expect(rejectedCount).toBe(rejectedApps + pendingApps);
          }
        ),
        { numRuns: 30 }
      );
    }
  );
});
