/**
 * Integration Tests — PATCH /api/admin/organizers/:id/approve
 *
 * Task 40.7
 *
 * Tests:
 *  - SuperAdmin can approve a pending Organizer (status → active)
 *  - Non-SuperAdmin → 403
 *  - Non-existent or non-pending organizer → 404
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { ObjectId } from 'mongodb';
import app from '../../app';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearCollections,
  getTestDb,
} from '../helpers/db';
import {
  createTestUser,
  generateTestAccessToken,
  createAndLoginUser,
} from '../helpers/auth';

vi.mock('../../services/email.service', () => ({
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
});

// ── Tests ─────────────────────────────────────────────────────────────────────

function approveUrl(id: string) {
  return `/api/admin/organizers/${id}/approve`;
}

describe('PATCH /api/admin/organizers/:id/approve', () => {
  // 40.7-a: SuperAdmin approves a pending Organizer
  it('approves a pending Organizer and changes status to active', async () => {
    const pendingOrg = await createTestUser({
      role: 'organizer',
      status: 'pending',
      isEmailVerified: false,
    });

    const superAdmin = await createTestUser({
      role: 'superadmin',
      status: 'active',
      isEmailVerified: true,
    });

    const accessToken = generateTestAccessToken(superAdmin);

    const res = await request(app)
      .patch(approveUrl(pendingOrg._id.toString()))
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.organizer.status).toBe('active');
    expect(res.body.data.organizer.id).toBe(pendingOrg._id.toString());

    // Verify the change persisted in the database
    const db = getTestDb();
    const updated = await db
      .collection('users')
      .findOne({ _id: pendingOrg._id });

    expect(updated?.status).toBe('active');
  });

  // 40.7-b: Non-SuperAdmin (active Organizer) → 403
  it('returns 403 when a non-SuperAdmin tries to approve', async () => {
    const pendingOrg = await createTestUser({
      role: 'organizer',
      status: 'pending',
      isEmailVerified: false,
    });

    const { tokens } = await createAndLoginUser(app, {
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });

    const res = await request(app)
      .patch(approveUrl(pendingOrg._id.toString()))
      .set('Authorization', `Bearer ${tokens.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);

    // Status must remain unchanged
    const db = getTestDb();
    const unchanged = await db
      .collection('users')
      .findOne({ _id: pendingOrg._id });
    expect(unchanged?.status).toBe('pending');
  });

  // 40.7-c: Exhibitor role → 403
  it('returns 403 when an Exhibitor tries to approve', async () => {
    const pendingOrg = await createTestUser({
      role: 'organizer',
      status: 'pending',
      isEmailVerified: false,
    });

    const { tokens } = await createAndLoginUser(app, {
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });

    const res = await request(app)
      .patch(approveUrl(pendingOrg._id.toString()))
      .set('Authorization', `Bearer ${tokens.accessToken}`);

    expect(res.status).toBe(403);
  });

  // 40.7-d: Unauthenticated → 401
  it('returns 401 for an unauthenticated request', async () => {
    const pendingOrg = await createTestUser({
      role: 'organizer',
      status: 'pending',
      isEmailVerified: false,
    });

    const res = await request(app)
      .patch(approveUrl(pendingOrg._id.toString()));

    expect(res.status).toBe(401);
  });

  // 40.7-e: Non-existent organizer ID → 404
  it('returns 404 for a non-existent organizer ID', async () => {
    const superAdmin = await createTestUser({
      role: 'superadmin',
      status: 'active',
      isEmailVerified: true,
    });

    const accessToken = generateTestAccessToken(superAdmin);
    const fakeId = new ObjectId().toString();

    const res = await request(app)
      .patch(approveUrl(fakeId))
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // 40.7-f: Already-active organizer → 404 (not pending)
  it('returns 404 when the organizer is already active', async () => {
    const activeOrg = await createTestUser({
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });

    const superAdmin = await createTestUser({
      role: 'superadmin',
      status: 'active',
      isEmailVerified: true,
    });

    const accessToken = generateTestAccessToken(superAdmin);

    const res = await request(app)
      .patch(approveUrl(activeOrg._id.toString()))
      .set('Authorization', `Bearer ${accessToken}`);

    // Route checks status === 'pending', returns 404 if already active
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // 40.7-g: Invalid ObjectId format → 404
  it('returns 404 for a malformed organizer ID', async () => {
    const superAdmin = await createTestUser({
      role: 'superadmin',
      status: 'active',
      isEmailVerified: true,
    });

    const accessToken = generateTestAccessToken(superAdmin);

    const res = await request(app)
      .patch(approveUrl('not-a-valid-id'))
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });
});
