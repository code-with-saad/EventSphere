/**
 * Integration Tests — Application Flow
 *
 * Task 17 (sub-tasks 17a–17e, list, mine, all-mine)
 *
 * 17a. Submit: valid → 201 pending; duplicate → 409; non-published expo → 400
 * 17b. Edit: owner + pending → updated; non-owner → 403; approved → 400
 * 17c. Withdraw: owner + pending → deleted; can reapply; non-owner → 403; approved → 400
 * 17d. Approve: valid boothLabel → approved; duplicate label → 409; overfill warning
 * 17e. Reject with reason; revoke approval clears boothLabel
 *
 * Additional coverage:
 * - GET /api/expos/:expoId/applications  — organizer list grouped by status
 * - GET /api/expos/:expoId/applications/mine — exhibitor's own application
 * - GET /api/exhibitor/applications        — all applications across expos
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
  // Ensure indexes used by ExpoModel / ApplicationModel exist
  try {
    await db.collection('expos').createIndex(
      { name: 'text', description: 'text' },
      { name: 'name_description_text_idx' }
    );
  } catch {
    // Already exists — fine
  }
  try {
    await db.collection('applications').createIndex(
      { expoId: 1, boothLabel: 1 },
      { unique: true, sparse: true, partialFilterExpression: { status: 'approved' } }
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
  await db.collection('tickets').deleteMany({});
});

// ── Shared Helpers ────────────────────────────────────────────────────────────

/**
 * Create an organizer user, insert a published expo directly in the DB, and
 * return the relevant IDs and token.
 */
async function createOrganizerAndPublishedExpo(): Promise<{
  organizerId: string;
  organizerToken: string;
  expoId: string;
}> {
  const organizer = await createTestUser({
    role: 'organizer',
    status: 'active',
    isEmailVerified: true,
  });
  const organizerToken = generateTestAccessToken(organizer);
  const db = getTestDb();
  const result = await db.collection('expos').insertOne({
    organizerId: new ObjectId(organizer._id.toString()),
    name: 'Flow Test Expo',
    description: 'Integration test expo',
    status: 'published',
    startDate: new Date(Date.now() + 86400000 * 30),
    endDate: new Date(Date.now() + 86400000 * 32),
    venueName: 'Test Venue',
    venueAddress: '123 Test St',
    totalBooths: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return {
    organizerId: organizer._id.toString(),
    organizerToken,
    expoId: result.insertedId.toString(),
  };
}

/**
 * Create an exhibitor user, submit an application to the given expo, and
 * return the exhibitor details and application ID.
 */
async function createExhibitorAndSubmit(expoId: string): Promise<{
  exhibitorToken: string;
  exhibitorId: string;
  applicationId: string;
}> {
  const exhibitor = await createTestUser({
    role: 'exhibitor',
    status: 'active',
    isEmailVerified: true,
  });
  const exhibitorToken = generateTestAccessToken(exhibitor);
  const res = await request(app)
    .post(`/api/expos/${expoId}/applications`)
    .set('Authorization', `Bearer ${exhibitorToken}`)
    .send({
      companyName: 'ACME Corp',
      companyDescription: 'We make widgets',
      category: 'Technology',
      phoneNumber: '+1234567890',
    });
  if (res.status !== 201) {
    throw new Error(`Submit failed: ${JSON.stringify(res.body)}`);
  }
  return {
    exhibitorToken,
    exhibitorId: exhibitor._id.toString(),
    applicationId: res.body.data.application._id,
  };
}

// ── 17a — Submit ──────────────────────────────────────────────────────────────

describe('POST /api/expos/:expoId/applications — submit (17a)', () => {
  it('17a-1: valid payload → 201, status=pending, correct companyName', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();
    const exhibitor = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });
    const exhibitorToken = generateTestAccessToken(exhibitor);

    const res = await request(app)
      .post(`/api/expos/${expoId}/applications`)
      .set('Authorization', `Bearer ${exhibitorToken}`)
      .send({
        companyName: 'ACME Corp',
        companyDescription: 'We make widgets',
        category: 'Technology',
        phoneNumber: '+1234567890',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.status).toBe('pending');
    expect(res.body.data.application.companyName).toBe('ACME Corp');
    expect(res.body.data.application._id).toBeTruthy();
  });

  it('17a-2: duplicate submission → 409 DUPLICATE_APPLICATION', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();
    const { exhibitorToken } = await createExhibitorAndSubmit(expoId);

    // Second submission with same exhibitor
    const res = await request(app)
      .post(`/api/expos/${expoId}/applications`)
      .set('Authorization', `Bearer ${exhibitorToken}`)
      .send({
        companyName: 'ACME Corp',
        companyDescription: 'We make widgets',
        category: 'Technology',
        phoneNumber: '+1234567890',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('DUPLICATE_APPLICATION');
  });

  it('17a-3: non-published expo → 400 EXPO_NOT_ACCEPTING_APPLICATIONS', async () => {
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const db = getTestDb();
    const result = await db.collection('expos').insertOne({
      organizerId: new ObjectId(organizer._id.toString()),
      name: 'Draft Expo',
      description: 'Not published yet',
      status: 'draft',
      startDate: new Date(Date.now() + 86400000 * 30),
      endDate: new Date(Date.now() + 86400000 * 32),
      venueName: 'Test Venue',
      venueAddress: '123 Test St',
      totalBooths: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const draftExpoId = result.insertedId.toString();

    const exhibitor = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });
    const exhibitorToken = generateTestAccessToken(exhibitor);

    const res = await request(app)
      .post(`/api/expos/${draftExpoId}/applications`)
      .set('Authorization', `Bearer ${exhibitorToken}`)
      .send({
        companyName: 'ACME Corp',
        companyDescription: 'We make widgets',
        category: 'Technology',
        phoneNumber: '+1234567890',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('EXPO_NOT_ACCEPTING_APPLICATIONS');
  });

  it('17a-4: unauthenticated → 401', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();

    const res = await request(app)
      .post(`/api/expos/${expoId}/applications`)
      .send({
        companyName: 'ACME Corp',
        companyDescription: 'We make widgets',
        category: 'Technology',
        phoneNumber: '+1234567890',
      });

    expect(res.status).toBe(401);
  });

  it('17a-5: organizer role cannot submit → 403', async () => {
    const { expoId, organizerToken } = await createOrganizerAndPublishedExpo();

    const res = await request(app)
      .post(`/api/expos/${expoId}/applications`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        companyName: 'ACME Corp',
        companyDescription: 'We make widgets',
        category: 'Technology',
        phoneNumber: '+1234567890',
      });

    expect(res.status).toBe(403);
  });

  it('17a-6: non-existent expo → 404 EXPO_NOT_FOUND', async () => {
    const exhibitor = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });
    const exhibitorToken = generateTestAccessToken(exhibitor);
    const fakeExpoId = new ObjectId().toString();

    const res = await request(app)
      .post(`/api/expos/${fakeExpoId}/applications`)
      .set('Authorization', `Bearer ${exhibitorToken}`)
      .send({
        companyName: 'ACME Corp',
        companyDescription: 'We make widgets',
        category: 'Technology',
        phoneNumber: '+1234567890',
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('EXPO_NOT_FOUND');
  });
});

// ── 17b — Edit ────────────────────────────────────────────────────────────────

describe('PATCH /api/expos/:expoId/applications/:id — edit (17b)', () => {
  it('17b-1: owner + pending → 200 updated', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();
    const { exhibitorToken, applicationId } = await createExhibitorAndSubmit(expoId);

    const res = await request(app)
      .patch(`/api/expos/${expoId}/applications/${applicationId}`)
      .set('Authorization', `Bearer ${exhibitorToken}`)
      .send({ companyName: 'Updated Corp' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.companyName).toBe('Updated Corp');
  });

  it('17b-2: non-owner → 403 APPLICATION_FORBIDDEN', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();
    const { applicationId } = await createExhibitorAndSubmit(expoId);

    // Different exhibitor tries to edit
    const otherExhibitor = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });
    const otherToken = generateTestAccessToken(otherExhibitor);

    const res = await request(app)
      .patch(`/api/expos/${expoId}/applications/${applicationId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ companyName: 'Hijacked Corp' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('APPLICATION_FORBIDDEN');
  });

  it('17b-3: edit approved application → 400 APPLICATION_NOT_EDITABLE', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();
    const { exhibitorToken, applicationId } = await createExhibitorAndSubmit(expoId);

    // Force to approved directly in DB
    const db = getTestDb();
    await db.collection('applications').updateOne(
      { _id: new ObjectId(applicationId) },
      { $set: { status: 'approved', boothLabel: 'A-1', updatedAt: new Date() } }
    );

    const res = await request(app)
      .patch(`/api/expos/${expoId}/applications/${applicationId}`)
      .set('Authorization', `Bearer ${exhibitorToken}`)
      .send({ companyName: 'Should Fail' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('APPLICATION_NOT_EDITABLE');
  });

  it('17b-4: unauthenticated → 401', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();
    const { applicationId } = await createExhibitorAndSubmit(expoId);

    const res = await request(app)
      .patch(`/api/expos/${expoId}/applications/${applicationId}`)
      .send({ companyName: 'No Auth' });

    expect(res.status).toBe(401);
  });

  it('17b-5: organizer role cannot edit → 403', async () => {
    const { expoId, organizerToken } = await createOrganizerAndPublishedExpo();
    const { applicationId } = await createExhibitorAndSubmit(expoId);

    const res = await request(app)
      .patch(`/api/expos/${expoId}/applications/${applicationId}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ companyName: 'Wrong Role' });

    expect(res.status).toBe(403);
  });
});

// ── 17c — Withdraw ────────────────────────────────────────────────────────────

describe('DELETE /api/expos/:expoId/applications/:id — withdraw (17c)', () => {
  it('17c-1: owner + pending → 200, record deleted from DB', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();
    const { exhibitorToken, applicationId } = await createExhibitorAndSubmit(expoId);

    const res = await request(app)
      .delete(`/api/expos/${expoId}/applications/${applicationId}`)
      .set('Authorization', `Bearer ${exhibitorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirm record no longer in DB
    const db = getTestDb();
    const record = await db
      .collection('applications')
      .findOne({ _id: new ObjectId(applicationId) });
    expect(record).toBeNull();
  });

  it('17c-2: can reapply after withdrawal', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();
    const { exhibitorToken, applicationId: firstId } =
      await createExhibitorAndSubmit(expoId);

    // Withdraw
    await request(app)
      .delete(`/api/expos/${expoId}/applications/${firstId}`)
      .set('Authorization', `Bearer ${exhibitorToken}`);

    // Reapply
    const res = await request(app)
      .post(`/api/expos/${expoId}/applications`)
      .set('Authorization', `Bearer ${exhibitorToken}`)
      .send({
        companyName: 'ACME Corp',
        companyDescription: 'We make widgets',
        category: 'Technology',
        phoneNumber: '+1234567890',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application._id).not.toBe(firstId);
  });

  it('17c-3: non-owner → 403 APPLICATION_FORBIDDEN', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();
    const { applicationId } = await createExhibitorAndSubmit(expoId);

    const otherExhibitor = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });
    const otherToken = generateTestAccessToken(otherExhibitor);

    const res = await request(app)
      .delete(`/api/expos/${expoId}/applications/${applicationId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('APPLICATION_FORBIDDEN');
  });

  it('17c-4: withdraw approved application → 400 APPLICATION_NOT_WITHDRAWABLE', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();
    const { exhibitorToken, applicationId } = await createExhibitorAndSubmit(expoId);

    // Force to approved in DB
    const db = getTestDb();
    await db.collection('applications').updateOne(
      { _id: new ObjectId(applicationId) },
      { $set: { status: 'approved', boothLabel: 'B-2', updatedAt: new Date() } }
    );

    const res = await request(app)
      .delete(`/api/expos/${expoId}/applications/${applicationId}`)
      .set('Authorization', `Bearer ${exhibitorToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('APPLICATION_NOT_WITHDRAWABLE');
  });

  it('17c-5: unauthenticated → 401', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();
    const { applicationId } = await createExhibitorAndSubmit(expoId);

    const res = await request(app)
      .delete(`/api/expos/${expoId}/applications/${applicationId}`);

    expect(res.status).toBe(401);
  });
});

// ── 17d — Approve ─────────────────────────────────────────────────────────────

describe('PATCH /api/expos/:expoId/applications/:id/review — approve (17d)', () => {
  it('17d-1: valid boothLabel → 200 approved, boothLabel stored, overfillWarning=false', async () => {
    const { expoId, organizerToken } = await createOrganizerAndPublishedExpo();
    const { applicationId } = await createExhibitorAndSubmit(expoId);

    const res = await request(app)
      .patch(`/api/expos/${expoId}/applications/${applicationId}/review`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ action: 'approve', boothLabel: 'B-1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.status).toBe('approved');
    expect(res.body.data.application.boothLabel).toBe('B-1');
    expect(res.body.data.overfillWarning).toBe(false);
  });

  it('17d-2: duplicate boothLabel → 409 BOOTH_CONFLICT', async () => {
    const { expoId, organizerToken } = await createOrganizerAndPublishedExpo();

    // Approve exhibitor A with 'A-1'
    const { applicationId: appIdA } = await createExhibitorAndSubmit(expoId);
    await request(app)
      .patch(`/api/expos/${expoId}/applications/${appIdA}/review`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ action: 'approve', boothLabel: 'A-1' });

    // Approve exhibitor B with same 'A-1'
    const { applicationId: appIdB } = await createExhibitorAndSubmit(expoId);
    const res = await request(app)
      .patch(`/api/expos/${expoId}/applications/${appIdB}/review`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ action: 'approve', boothLabel: 'A-1' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('BOOTH_CONFLICT');
  });

  it('17d-3: overfill → 200 with overfillWarning=true on second approval beyond capacity', async () => {
    // Create expo with totalBooths: 1
    const organizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const organizerToken = generateTestAccessToken(organizer);
    const db = getTestDb();
    const result = await db.collection('expos').insertOne({
      organizerId: new ObjectId(organizer._id.toString()),
      name: 'Small Expo',
      description: 'Only 1 booth',
      status: 'published',
      startDate: new Date(Date.now() + 86400000 * 30),
      endDate: new Date(Date.now() + 86400000 * 32),
      venueName: 'Test Venue',
      venueAddress: '123 Test St',
      totalBooths: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const smallExpoId = result.insertedId.toString();

    // First approval fills the 1 booth — should NOT warn
    const { applicationId: appIdA } = await createExhibitorAndSubmit(smallExpoId);
    const firstApprove = await request(app)
      .patch(`/api/expos/${smallExpoId}/applications/${appIdA}/review`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ action: 'approve', boothLabel: 'X-1' });

    expect(firstApprove.status).toBe(200);
    expect(firstApprove.body.data.overfillWarning).toBe(false);

    // Second approval exceeds capacity — must warn
    const { applicationId: appIdB } = await createExhibitorAndSubmit(smallExpoId);
    const res = await request(app)
      .patch(`/api/expos/${smallExpoId}/applications/${appIdB}/review`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ action: 'approve', boothLabel: 'X-2' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.overfillWarning).toBe(true);
  });

  it('17d-4: non-organizer (exhibitor) cannot review → 403', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();
    const { exhibitorToken, applicationId } = await createExhibitorAndSubmit(expoId);

    const res = await request(app)
      .patch(`/api/expos/${expoId}/applications/${applicationId}/review`)
      .set('Authorization', `Bearer ${exhibitorToken}`)
      .send({ action: 'approve', boothLabel: 'C-1' });

    expect(res.status).toBe(403);
  });

  it('17d-5: wrong organizer → 403 APPLICATION_FORBIDDEN', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();
    const { applicationId } = await createExhibitorAndSubmit(expoId);

    // A different organizer who does not own the expo
    const wrongOrganizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const wrongToken = generateTestAccessToken(wrongOrganizer);

    const res = await request(app)
      .patch(`/api/expos/${expoId}/applications/${applicationId}/review`)
      .set('Authorization', `Bearer ${wrongToken}`)
      .send({ action: 'approve', boothLabel: 'D-1' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('APPLICATION_FORBIDDEN');
  });

  it('17d-6: missing/empty boothLabel → 400 INVALID_BOOTH_LABEL', async () => {
    const { expoId, organizerToken } = await createOrganizerAndPublishedExpo();
    const { applicationId } = await createExhibitorAndSubmit(expoId);

    const res = await request(app)
      .patch(`/api/expos/${expoId}/applications/${applicationId}/review`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ action: 'approve', boothLabel: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('INVALID_BOOTH_LABEL');
  });

  it('17d-7: invalid action → 400, success=false', async () => {
    const { expoId, organizerToken } = await createOrganizerAndPublishedExpo();
    const { applicationId } = await createExhibitorAndSubmit(expoId);

    const res = await request(app)
      .patch(`/api/expos/${expoId}/applications/${applicationId}/review`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ action: 'invalidAction' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ── 17e — Reject and Revoke ───────────────────────────────────────────────────

describe('PATCH .../review — reject and revoke (17e)', () => {
  it('17e-1: reject with reason → 200, status=rejected, rejectionReason stored', async () => {
    const { expoId, organizerToken } = await createOrganizerAndPublishedExpo();
    const { applicationId } = await createExhibitorAndSubmit(expoId);

    const res = await request(app)
      .patch(`/api/expos/${expoId}/applications/${applicationId}/review`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ action: 'reject', reason: 'Not a good fit' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.status).toBe('rejected');
    expect(res.body.data.application.rejectionReason).toBe('Not a good fit');
  });

  it('17e-2: reject without reason → 200, status=rejected', async () => {
    const { expoId, organizerToken } = await createOrganizerAndPublishedExpo();
    const { applicationId } = await createExhibitorAndSubmit(expoId);

    const res = await request(app)
      .patch(`/api/expos/${expoId}/applications/${applicationId}/review`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ action: 'reject' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.status).toBe('rejected');
  });

  it('17e-3: revoke approval → 200, status=pending, boothLabel cleared', async () => {
    const { expoId, organizerToken } = await createOrganizerAndPublishedExpo();
    const { applicationId } = await createExhibitorAndSubmit(expoId);

    // First approve
    await request(app)
      .patch(`/api/expos/${expoId}/applications/${applicationId}/review`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ action: 'approve', boothLabel: 'E-5' });

    // Then revoke
    const res = await request(app)
      .patch(`/api/expos/${expoId}/applications/${applicationId}/review`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ action: 'revoke' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.status).toBe('pending');
    // boothLabel must be absent or null after revoke
    expect(res.body.data.application.boothLabel == null).toBe(true);
  });

  it('17e-4: revoke on non-approved application → 400 APPLICATION_NOT_REVOCABLE', async () => {
    const { expoId, organizerToken } = await createOrganizerAndPublishedExpo();
    const { applicationId } = await createExhibitorAndSubmit(expoId);

    // Application is still pending — revoke should fail
    const res = await request(app)
      .patch(`/api/expos/${expoId}/applications/${applicationId}/review`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ action: 'revoke' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('APPLICATION_NOT_REVOCABLE');
  });

  it('17e-5: wrong organizer on reject → 403 APPLICATION_FORBIDDEN', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();
    const { applicationId } = await createExhibitorAndSubmit(expoId);

    const wrongOrganizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const wrongToken = generateTestAccessToken(wrongOrganizer);

    const res = await request(app)
      .patch(`/api/expos/${expoId}/applications/${applicationId}/review`)
      .set('Authorization', `Bearer ${wrongToken}`)
      .send({ action: 'reject', reason: 'Not a fit' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('APPLICATION_FORBIDDEN');
  });
});

// ── List for expo ─────────────────────────────────────────────────────────────

describe('GET /api/expos/:expoId/applications — list for expo', () => {
  it('list-1: organizer sees all applications grouped by status with boothFillRate', async () => {
    const { expoId, organizerToken } = await createOrganizerAndPublishedExpo();

    // Submit 2 exhibitors
    const { applicationId: appIdA } = await createExhibitorAndSubmit(expoId);
    const { applicationId: appIdB } = await createExhibitorAndSubmit(expoId);

    // Approve first, reject second
    await request(app)
      .patch(`/api/expos/${expoId}/applications/${appIdA}/review`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ action: 'approve', boothLabel: 'F-1' });

    await request(app)
      .patch(`/api/expos/${expoId}/applications/${appIdB}/review`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ action: 'reject', reason: 'No room' });

    const res = await request(app)
      .get(`/api/expos/${expoId}/applications`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pending.length).toBe(0);
    expect(res.body.data.approved.length).toBe(1);
    expect(res.body.data.rejected.length).toBe(1);
    // 1 approved / 10 total booths * 100 = 10
    expect(res.body.data.boothFillRate).toBe(10);
    expect(res.body.data.totalBooths).toBe(10);
    expect(res.body.data.assignedBooths).toBe(1);
  });

  it('list-2: wrong organizer → 403 APPLICATION_FORBIDDEN', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();

    const wrongOrganizer = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });
    const wrongToken = generateTestAccessToken(wrongOrganizer);

    const res = await request(app)
      .get(`/api/expos/${expoId}/applications`)
      .set('Authorization', `Bearer ${wrongToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('APPLICATION_FORBIDDEN');
  });

  it('list-3: exhibitor role cannot list expo applications → 403', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();
    const { exhibitorToken } = await createExhibitorAndSubmit(expoId);

    const res = await request(app)
      .get(`/api/expos/${expoId}/applications`)
      .set('Authorization', `Bearer ${exhibitorToken}`);

    expect(res.status).toBe(403);
  });
});

// ── GET mine ──────────────────────────────────────────────────────────────────

describe('GET /api/expos/:expoId/applications/mine', () => {
  it('mine-1: exhibitor sees own application', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();
    const { exhibitorToken } = await createExhibitorAndSubmit(expoId);

    const res = await request(app)
      .get(`/api/expos/${expoId}/applications/mine`)
      .set('Authorization', `Bearer ${exhibitorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application).not.toBeNull();
    expect(res.body.data.application.companyName).toBe('ACME Corp');
  });

  it('mine-2: returns null when no application exists', async () => {
    const { expoId } = await createOrganizerAndPublishedExpo();
    const exhibitor = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });
    const exhibitorToken = generateTestAccessToken(exhibitor);

    const res = await request(app)
      .get(`/api/expos/${expoId}/applications/mine`)
      .set('Authorization', `Bearer ${exhibitorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application).toBeNull();
  });

  it('mine-3: organizer cannot access /mine → 403', async () => {
    const { expoId, organizerToken } = await createOrganizerAndPublishedExpo();

    const res = await request(app)
      .get(`/api/expos/${expoId}/applications/mine`)
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(403);
  });
});

// ── GET /api/exhibitor/applications ───────────────────────────────────────────

describe('GET /api/exhibitor/applications — list all mine', () => {
  it('all-mine-1: returns all applications across expos for this exhibitor', async () => {
    // Create 2 separate expos
    const { expoId: expo1 } = await createOrganizerAndPublishedExpo();
    const { expoId: expo2 } = await createOrganizerAndPublishedExpo();

    // One exhibitor submits to both
    const exhibitor = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });
    const exhibitorToken = generateTestAccessToken(exhibitor);

    await request(app)
      .post(`/api/expos/${expo1}/applications`)
      .set('Authorization', `Bearer ${exhibitorToken}`)
      .send({
        companyName: 'Corp One',
        companyDescription: 'First',
        category: 'Technology',
        phoneNumber: '+1234567890',
      });

    await request(app)
      .post(`/api/expos/${expo2}/applications`)
      .set('Authorization', `Bearer ${exhibitorToken}`)
      .send({
        companyName: 'Corp Two',
        companyDescription: 'Second',
        category: 'Retail',
        phoneNumber: '+0987654321',
      });

    const res = await request(app)
      .get('/api/exhibitor/applications')
      .set('Authorization', `Bearer ${exhibitorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.applications.length).toBe(2);
  });

  it('all-mine-2: organizer cannot access → 403', async () => {
    const { organizerToken } = await createOrganizerAndPublishedExpo();

    const res = await request(app)
      .get('/api/exhibitor/applications')
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(403);
  });
});
