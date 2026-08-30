/**
 * Integration Tests — ApplicationService.submit()
 *
 * Task 15a: Direct service-layer tests against the real test MongoDB instance.
 * Application routes are not yet wired into app.ts (task 16 is future),
 * so these tests call the service directly.
 *
 * Test cases:
 *  1. Creates a pending application for a valid published expo
 *  2. Rejects duplicate application (pending) with DUPLICATE_APPLICATION (409)
 *  3. Rejects duplicate application (approved) with DUPLICATE_APPLICATION (409)
 *  4. Rejects application to a draft expo with EXPO_NOT_ACCEPTING_APPLICATIONS (400)
 *  5. Rejects application to a completed expo with EXPO_NOT_ACCEPTING_APPLICATIONS (400)
 *  6. Rejects application when expo does not exist with EXPO_NOT_FOUND (404)
 *  7. Allows reapplication after rejected status (rejected does NOT block)
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
import ApplicationService from '../services/application.service';

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
  await db.collection('applications').deleteMany({});
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Insert an expo document directly into the test DB and return its string ID.
 */
async function insertExpo(organizerId: string, status: string = 'published'): Promise<string> {
  const db = getTestDb();
  const now = new Date();
  const future = (days: number) => new Date(Date.now() + days * 86400000);
  const result = await db.collection('expos').insertOne({
    organizerId: new ObjectId(organizerId),
    name: 'Test Expo',
    description: 'A test expo',
    status,
    startDate: future(30),
    endDate: future(32),
    venueName: 'Test Venue',
    venueAddress: '123 Test St',
    totalBooths: 10,
    createdAt: now,
    updatedAt: now,
  });
  return result.insertedId.toString();
}

/**
 * Build a minimal valid IApplicationCreate payload.
 */
function makePayload(expoId: string, exhibitorId: string) {
  return {
    expoId: new ObjectId(expoId),
    exhibitorId: new ObjectId(exhibitorId),
    companyName: 'ACME',
    companyDescription: 'Widget maker',
    category: 'Technology',
    phoneNumber: '+1234567890',
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ApplicationService.submit()', () => {
  it('1. creates a pending application for a valid published expo', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const exhibitor = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const result = await ApplicationService.submit(makePayload(expoId, exhibitor._id.toString()));

    expect(result.status).toBe('pending');
    expect(result.companyName).toBe('ACME');
    expect(result.expoId.toString()).toBe(expoId);
    expect(result.exhibitorId.toString()).toBe(exhibitor._id.toString());
  });

  it('2. rejects duplicate application (pending) with DUPLICATE_APPLICATION (409)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const exhibitor = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const payload = makePayload(expoId, exhibitor._id.toString());

    // First submission succeeds
    await ApplicationService.submit(payload);

    // Second submission should fail
    let caughtError: any;
    try {
      await ApplicationService.submit(payload);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('DUPLICATE_APPLICATION');
    expect(caughtError.statusCode).toBe(409);
  });

  it('3. rejects duplicate application (approved) with DUPLICATE_APPLICATION (409)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const exhibitor = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const payload = makePayload(expoId, exhibitor._id.toString());

    // Submit once, then mark it approved directly in DB
    const first = await ApplicationService.submit(payload);
    const db = getTestDb();
    await db.collection('applications').updateOne(
      { _id: first._id },
      { $set: { status: 'approved' } }
    );

    // Second submission should fail
    let caughtError: any;
    try {
      await ApplicationService.submit(payload);
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('DUPLICATE_APPLICATION');
    expect(caughtError.statusCode).toBe(409);
  });

  it('4. rejects application to a draft expo with EXPO_NOT_ACCEPTING_APPLICATIONS (400)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const exhibitor = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'draft');

    let caughtError: any;
    try {
      await ApplicationService.submit(makePayload(expoId, exhibitor._id.toString()));
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('EXPO_NOT_ACCEPTING_APPLICATIONS');
    expect(caughtError.statusCode).toBe(400);
  });

  it('5. rejects application to a completed expo with EXPO_NOT_ACCEPTING_APPLICATIONS (400)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const exhibitor = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'completed');

    let caughtError: any;
    try {
      await ApplicationService.submit(makePayload(expoId, exhibitor._id.toString()));
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('EXPO_NOT_ACCEPTING_APPLICATIONS');
    expect(caughtError.statusCode).toBe(400);
  });

  it('6. rejects application when expo does not exist with EXPO_NOT_FOUND (404)', async () => {
    const exhibitor = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const fakeExpoId = new ObjectId().toString();

    let caughtError: any;
    try {
      await ApplicationService.submit(makePayload(fakeExpoId, exhibitor._id.toString()));
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('EXPO_NOT_FOUND');
    expect(caughtError.statusCode).toBe(404);
  });

  it('7. allows reapplication after rejected status (rejected does NOT block)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const exhibitor = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const payload = makePayload(expoId, exhibitor._id.toString());

    // Submit once, mark rejected in DB
    const first = await ApplicationService.submit(payload);
    const db = getTestDb();
    await db.collection('applications').updateOne(
      { _id: first._id },
      { $set: { status: 'rejected' } }
    );

    // Re-submission should succeed
    const second = await ApplicationService.submit(payload);

    expect(second).toBeDefined();
    expect(second.status).toBe('pending');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ApplicationService.withdraw() tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ApplicationService.withdraw()', () => {
  it('1. hard-deletes a pending application', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const exhibitor = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const application = await ApplicationService.submit(makePayload(expoId, exhibitor._id.toString()));

    // Should resolve without throwing
    await expect(
      ApplicationService.withdraw(application._id.toString(), exhibitor._id.toString())
    ).resolves.toBeUndefined();

    // Record must be gone from the DB
    const db = getTestDb();
    const found = await db.collection('applications').findOne({ _id: application._id });
    expect(found).toBeNull();
  });

  it('2. allows reapplication after withdrawal (REQ-3.14)', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const exhibitor = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');
    const payload = makePayload(expoId, exhibitor._id.toString());

    // Submit → withdraw → submit again
    const first = await ApplicationService.submit(payload);
    await ApplicationService.withdraw(first._id.toString(), exhibitor._id.toString());
    const second = await ApplicationService.submit(payload);

    expect(second.status).toBe('pending');
    // Second record must be a brand-new document
    expect(second._id.toString()).not.toBe(first._id.toString());
  });

  it('3. throws APPLICATION_FORBIDDEN (403) for wrong exhibitor', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const exhibitorA = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const exhibitorB = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const application = await ApplicationService.submit(makePayload(expoId, exhibitorA._id.toString()));

    let caughtError: any;
    try {
      await ApplicationService.withdraw(application._id.toString(), exhibitorB._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('APPLICATION_FORBIDDEN');
    expect(caughtError.statusCode).toBe(403);

    // Record must still exist
    const db = getTestDb();
    const found = await db.collection('applications').findOne({ _id: application._id });
    expect(found).not.toBeNull();
  });

  it('4. throws APPLICATION_NOT_WITHDRAWABLE (400) for an approved application', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const exhibitor = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const application = await ApplicationService.submit(makePayload(expoId, exhibitor._id.toString()));
    const db = getTestDb();
    await db.collection('applications').updateOne(
      { _id: application._id },
      { $set: { status: 'approved' } }
    );

    let caughtError: any;
    try {
      await ApplicationService.withdraw(application._id.toString(), exhibitor._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('APPLICATION_NOT_WITHDRAWABLE');
    expect(caughtError.statusCode).toBe(400);

    // Record must still exist
    const found = await db.collection('applications').findOne({ _id: application._id });
    expect(found).not.toBeNull();
  });

  it('5. throws APPLICATION_NOT_WITHDRAWABLE (400) for a rejected application', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const exhibitor = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const application = await ApplicationService.submit(makePayload(expoId, exhibitor._id.toString()));
    const db = getTestDb();
    await db.collection('applications').updateOne(
      { _id: application._id },
      { $set: { status: 'rejected' } }
    );

    let caughtError: any;
    try {
      await ApplicationService.withdraw(application._id.toString(), exhibitor._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('APPLICATION_NOT_WITHDRAWABLE');
    expect(caughtError.statusCode).toBe(400);

    // Record must still exist
    const found = await db.collection('applications').findOne({ _id: application._id });
    expect(found).not.toBeNull();
  });

  it('6. throws APPLICATION_NOT_FOUND (404) for non-existent ID', async () => {
    const fakeId = new ObjectId().toString();

    let caughtError: any;
    try {
      await ApplicationService.withdraw(fakeId, new ObjectId().toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('APPLICATION_NOT_FOUND');
    expect(caughtError.statusCode).toBe(404);
  });
});

// =============================================================================
// Shared scenario helper for organizer-action tests
// =============================================================================

async function setupApprovalScenario() {
  const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
  const exhibitor = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
  const expoId = await insertExpo(organizer._id.toString(), 'published');
  const app = await ApplicationService.submit(makePayload(expoId, exhibitor._id.toString()));
  return { organizer, exhibitor, expoId, app };
}

// =============================================================================
// ApplicationService.approve()
// =============================================================================

describe('ApplicationService.approve()', () => {
  it('1. approves application with valid boothLabel', async () => {
    const { organizer, app } = await setupApprovalScenario();

    const result = await ApplicationService.approve(
      app._id.toString(),
      organizer._id.toString(),
      'B-12'
    );

    expect(result.status).toBe('approved');
    expect(result.boothLabel).toBe('B-12');
    // 10 booths, 0 previously approved → no overfill
    expect(result.overfillWarning).toBeFalsy();
  });

  it('2. throws BOOTH_CONFLICT (409) for duplicate boothLabel in same expo', async () => {
    const { organizer, expoId, app } = await setupApprovalScenario();

    // Approve first application with 'A-1'
    await ApplicationService.approve(app._id.toString(), organizer._id.toString(), 'A-1');

    // Submit a second application from a different exhibitor
    const exhibitorB = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const appB = await ApplicationService.submit(makePayload(expoId, exhibitorB._id.toString()));

    let caughtError: any;
    try {
      await ApplicationService.approve(appB._id.toString(), organizer._id.toString(), 'A-1');
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('BOOTH_CONFLICT');
    expect(caughtError.statusCode).toBe(409);
  });

  it('3. sets overfillWarning when approvedCount >= totalBooths', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const db = getTestDb();

    // Create an expo with only 1 booth
    const expoResult = await db.collection('expos').insertOne({
      organizerId: new ObjectId(organizer._id.toString()),
      name: 'Small Expo',
      description: 'test',
      status: 'published',
      startDate: new Date(Date.now() + 86400000 * 30),
      endDate: new Date(Date.now() + 86400000 * 32),
      venueName: 'V',
      venueAddress: 'A',
      totalBooths: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const tinyExpoId = expoResult.insertedId.toString();

    // First exhibitor — should succeed without warning (0 approved < 1 total)
    const exhibitorA = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const appA = await ApplicationService.submit(makePayload(tinyExpoId, exhibitorA._id.toString()));
    const resultA = await ApplicationService.approve(appA._id.toString(), organizer._id.toString(), 'A-1');
    expect(resultA.status).toBe('approved');
    expect(resultA.overfillWarning).toBeFalsy(); // 0 approved before this one, 0 < 1

    // Second exhibitor — 1 approved >= 1 total → overfill warning
    const exhibitorB = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const appB = await ApplicationService.submit(makePayload(tinyExpoId, exhibitorB._id.toString()));
    const resultB = await ApplicationService.approve(appB._id.toString(), organizer._id.toString(), 'A-2');
    expect(resultB.status).toBe('approved');
    expect(resultB.overfillWarning).toBe(true); // 1 approved >= 1 totalBooths
  });

  it('4. throws APPLICATION_FORBIDDEN (403) for wrong organizer', async () => {
    const { app } = await setupApprovalScenario();
    const wrongOrganizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });

    let caughtError: any;
    try {
      await ApplicationService.approve(app._id.toString(), wrongOrganizer._id.toString(), 'X-1');
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('APPLICATION_FORBIDDEN');
    expect(caughtError.statusCode).toBe(403);
  });

  it('5. throws APPLICATION_NOT_FOUND (404) for fake applicationId', async () => {
    const { organizer } = await setupApprovalScenario();
    const fakeId = new ObjectId().toString();

    let caughtError: any;
    try {
      await ApplicationService.approve(fakeId, organizer._id.toString(), 'X-1');
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('APPLICATION_NOT_FOUND');
    expect(caughtError.statusCode).toBe(404);
  });

  it('6. throws INVALID_BOOTH_LABEL (400) for empty boothLabel', async () => {
    const { organizer, app } = await setupApprovalScenario();

    let caughtError: any;
    try {
      await ApplicationService.approve(app._id.toString(), organizer._id.toString(), '');
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('INVALID_BOOTH_LABEL');
    expect(caughtError.statusCode).toBe(400);
  });

  it('7. throws INVALID_BOOTH_LABEL (400) for boothLabel > 20 chars', async () => {
    const { organizer, app } = await setupApprovalScenario();

    let caughtError: any;
    try {
      await ApplicationService.approve(app._id.toString(), organizer._id.toString(), 'A'.repeat(21));
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('INVALID_BOOTH_LABEL');
    expect(caughtError.statusCode).toBe(400);
  });
});

// =============================================================================
// ApplicationService.reject()
// =============================================================================

describe('ApplicationService.reject()', () => {
  it('1. rejects application with optional reason', async () => {
    const { organizer, app } = await setupApprovalScenario();

    const result = await ApplicationService.reject(
      app._id.toString(),
      organizer._id.toString(),
      'Not a good fit'
    );

    expect(result.status).toBe('rejected');
    expect(result.rejectionReason).toBe('Not a good fit');
  });

  it('2. rejects application without a reason', async () => {
    const { organizer, app } = await setupApprovalScenario();

    const result = await ApplicationService.reject(
      app._id.toString(),
      organizer._id.toString()
    );

    expect(result.status).toBe('rejected');
    expect(result.rejectionReason == null || result.rejectionReason === undefined).toBe(true);
  });

  it('3. throws APPLICATION_FORBIDDEN (403) for wrong organizer', async () => {
    const { app } = await setupApprovalScenario();
    const wrongOrganizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });

    let caughtError: any;
    try {
      await ApplicationService.reject(app._id.toString(), wrongOrganizer._id.toString(), 'nope');
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('APPLICATION_FORBIDDEN');
    expect(caughtError.statusCode).toBe(403);
  });

  it('4. throws INVALID_FIELD_LENGTH (400) for reason > 300 chars', async () => {
    const { organizer, app } = await setupApprovalScenario();

    let caughtError: any;
    try {
      await ApplicationService.reject(app._id.toString(), organizer._id.toString(), 'x'.repeat(301));
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('INVALID_FIELD_LENGTH');
    expect(caughtError.statusCode).toBe(400);
  });
});

// =============================================================================
// ApplicationService.revokeApproval()
// =============================================================================

describe('ApplicationService.revokeApproval()', () => {
  it('1. revokes an approved application — status back to pending, boothLabel cleared', async () => {
    const { organizer, expoId, app } = await setupApprovalScenario();

    // First approve
    await ApplicationService.approve(app._id.toString(), organizer._id.toString(), 'B-7');

    // Revoke
    const result = await ApplicationService.revokeApproval(
      app._id.toString(),
      organizer._id.toString()
    );

    expect(result.status).toBe('pending');
    expect(result.boothLabel == null || result.boothLabel === undefined).toBe(true);

    // Confirm 'B-7' can now be assigned to another application without conflict
    const exhibitorB = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const appB = await ApplicationService.submit(makePayload(expoId, exhibitorB._id.toString()));
    const reused = await ApplicationService.approve(appB._id.toString(), organizer._id.toString(), 'B-7');
    expect(reused.boothLabel).toBe('B-7');
  });

  it('2. throws APPLICATION_NOT_REVOCABLE (400) for a pending application', async () => {
    const { organizer, app } = await setupApprovalScenario();

    let caughtError: any;
    try {
      await ApplicationService.revokeApproval(app._id.toString(), organizer._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('APPLICATION_NOT_REVOCABLE');
    expect(caughtError.statusCode).toBe(400);
  });

  it('3. throws APPLICATION_FORBIDDEN (403) for wrong organizer', async () => {
    const { organizer, app } = await setupApprovalScenario();
    const wrongOrganizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });

    // Approve first so we can attempt revoke
    await ApplicationService.approve(app._id.toString(), organizer._id.toString(), 'C-5');

    let caughtError: any;
    try {
      await ApplicationService.revokeApproval(app._id.toString(), wrongOrganizer._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('APPLICATION_FORBIDDEN');
    expect(caughtError.statusCode).toBe(403);
  });
});

// =============================================================================
// ApplicationService.listForExpo()
// =============================================================================

describe('ApplicationService.listForExpo()', () => {
  it('1. returns applications grouped by status with fill rate', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published'); // 10 booths

    const exhibitorA = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const exhibitorB = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const exhibitorC = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });

    const appA = await ApplicationService.submit(makePayload(expoId, exhibitorA._id.toString()));
    const appB = await ApplicationService.submit(makePayload(expoId, exhibitorB._id.toString()));
    const appC = await ApplicationService.submit(makePayload(expoId, exhibitorC._id.toString()));

    // Approve two, reject one
    await ApplicationService.approve(appA._id.toString(), organizer._id.toString(), 'L-1');
    await ApplicationService.approve(appB._id.toString(), organizer._id.toString(), 'L-2');
    await ApplicationService.reject(appC._id.toString(), organizer._id.toString(), 'No space');

    const result = await ApplicationService.listForExpo(expoId, organizer._id.toString());

    expect(result.pending.length).toBe(0);
    expect(result.approved.length).toBe(2);
    expect(result.rejected.length).toBe(1);
    expect(result.totalBooths).toBe(10);
    expect(result.assignedBooths).toBe(2);
    expect(result.boothFillRate).toBe(20); // 2/10 * 100
  });

  it('2. returns empty groups for expo with no applications', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const result = await ApplicationService.listForExpo(expoId, organizer._id.toString());

    expect(result.pending).toEqual([]);
    expect(result.approved).toEqual([]);
    expect(result.rejected).toEqual([]);
    expect(result.boothFillRate).toBe(0);
  });

  it('3. throws APPLICATION_FORBIDDEN (403) for wrong organizer', async () => {
    const { expoId } = await setupApprovalScenario();
    const wrongOrganizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });

    let caughtError: any;
    try {
      await ApplicationService.listForExpo(expoId, wrongOrganizer._id.toString());
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.code).toBe('APPLICATION_FORBIDDEN');
    expect(caughtError.statusCode).toBe(403);
  });
});

// =============================================================================
// ApplicationService.getByExhibitorAndExpo() and getBoothFillRate()
// =============================================================================

describe('ApplicationService.getByExhibitorAndExpo() and getBoothFillRate()', () => {
  it('1. getByExhibitorAndExpo returns the application when one exists', async () => {
    const { exhibitor, expoId } = await setupApprovalScenario();

    const result = await ApplicationService.getByExhibitorAndExpo(
      exhibitor._id.toString(),
      expoId
    );

    expect(result).not.toBeNull();
    expect(result!.companyName).toBe('ACME');
  });

  it('2. getByExhibitorAndExpo returns null when no application exists', async () => {
    const { expoId } = await setupApprovalScenario();
    const randomExhibitorId = new ObjectId().toString();

    const result = await ApplicationService.getByExhibitorAndExpo(randomExhibitorId, expoId);

    expect(result).toBeNull();
  });

  it('3. getBoothFillRate returns 0 when no approved applications', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const expoId = await insertExpo(organizer._id.toString(), 'published');

    const rate = await ApplicationService.getBoothFillRate(expoId, 5);

    expect(rate).toBe(0);
  });

  it('4. getBoothFillRate returns correct percentage', async () => {
    const organizer = await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });
    const db = getTestDb();

    // Create expo with 4 booths
    const expoResult = await db.collection('expos').insertOne({
      organizerId: new ObjectId(organizer._id.toString()),
      name: 'Four Booth Expo',
      description: 'test',
      status: 'published',
      startDate: new Date(Date.now() + 86400000 * 30),
      endDate: new Date(Date.now() + 86400000 * 32),
      venueName: 'V',
      venueAddress: 'A',
      totalBooths: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const expoId = expoResult.insertedId.toString();

    const exhibitor = await createTestUser({ role: 'exhibitor', status: 'active', isEmailVerified: true });
    const app = await ApplicationService.submit(makePayload(expoId, exhibitor._id.toString()));
    await ApplicationService.approve(app._id.toString(), organizer._id.toString(), 'D-1');

    const rate = await ApplicationService.getBoothFillRate(expoId, 4);

    expect(rate).toBe(25); // 1/4 * 100
  });

  it('5. getBoothFillRate returns 0 when totalBooths is 0 (division guard)', async () => {
    const fakeExpoId = new ObjectId().toString();

    const rate = await ApplicationService.getBoothFillRate(fakeExpoId, 0);

    expect(rate).toBe(0);
  });
});
