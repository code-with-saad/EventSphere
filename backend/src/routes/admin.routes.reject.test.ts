/**
 * Integration Tests — DELETE /api/admin/organizers/:id/reject
 *
 * Verifies that the reject endpoint soft-deletes the organizer account
 * (status → 'rejected', document preserved) and invalidates all refresh
 * tokens for that user so any open session is forced out.
 *
 * Tests:
 *  - SuperAdmin can reject a pending Organizer → 200, status becomes 'rejected'
 *  - User document still exists in DB after rejection
 *  - All refresh tokens for the user are invalidated (isValid: false)
 *  - Rejected organizer can still log in (credentials still valid)
 *  - Rejected organizer appears in GET /api/admin/organizers?status=rejected
 *  - Non-SuperAdmin → 403
 *  - Unauthenticated → 401
 *  - Non-existent organizer ID → 404
 *  - Already-active organizer → 404 (not pending)
 *  - Invalid ObjectId format → 404
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import app from '../app';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearCollections,
  getTestDb,
} from '../__tests__/helpers/db';
import {
  createTestUser,
  generateTestAccessToken,
  createAndLoginUser,
} from '../__tests__/helpers/auth';
import { createRefreshToken } from '../models/RefreshToken.model';

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
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function rejectUrl(id: string) {
  return `/api/admin/organizers/${id}/reject`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DELETE /api/admin/organizers/:id/reject', () => {
  // 45.2-a: Soft-reject sets status to 'rejected', document still exists
  it('returns 200 and soft-rejects the organizer (document preserved, status = rejected)', async () => {
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
      .delete(rejectUrl(pendingOrg._id.toString()))
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Organizer application rejected');

    // Document must still exist with status 'rejected'
    const db = getTestDb();
    const updated = await db.collection('users').findOne({ _id: pendingOrg._id });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('rejected');
  });

  // 45.2-b: All refresh tokens are invalidated (isValid → false), not deleted
  it('invalidates all refresh tokens for the rejected organizer', async () => {
    const pendingOrg = await createTestUser({
      role: 'organizer',
      status: 'pending',
      isEmailVerified: false,
    });

    // Seed an active refresh token for this organizer
    const tokenValue = 'test-refresh-token-value';
    const tokenHash = crypto.createHash('sha256').update(tokenValue).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await createRefreshToken(pendingOrg._id, tokenHash, expiresAt);

    const superAdmin = await createTestUser({
      role: 'superadmin',
      status: 'active',
      isEmailVerified: true,
    });

    const accessToken = generateTestAccessToken(superAdmin);

    const res = await request(app)
      .delete(rejectUrl(pendingOrg._id.toString()))
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);

    // Token document must still exist but be marked invalid
    const db = getTestDb();
    const tokenDoc = await db
      .collection('refresh_tokens')
      .findOne({ userId: pendingOrg._id });
    expect(tokenDoc).not.toBeNull();
    expect(tokenDoc!.isValid).toBe(false);
  });

  // 45.2-c: Rejected organizer can still log in (credentials are not removed)
  it('allows a rejected organizer to log in with valid credentials', async () => {
    const pendingOrg = await createTestUser({
      role: 'organizer',
      status: 'pending',
      isEmailVerified: false,
      password: 'TestPassword123',
    });

    const superAdmin = await createTestUser({
      role: 'superadmin',
      status: 'active',
      isEmailVerified: true,
    });

    const adminToken = generateTestAccessToken(superAdmin);

    // Reject
    await request(app)
      .delete(rejectUrl(pendingOrg._id.toString()))
      .set('Authorization', `Bearer ${adminToken}`);

    // Organizer must still be able to log in
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: pendingOrg.email, password: 'TestPassword123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.status).toBe('rejected');
  });

  // 45.2-d: Rejected organizer appears in GET /api/admin/organizers?status=rejected
  it('rejected organizer is queryable via the all-organizers endpoint', async () => {
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

    const adminToken = generateTestAccessToken(superAdmin);

    // Reject
    await request(app)
      .delete(rejectUrl(pendingOrg._id.toString()))
      .set('Authorization', `Bearer ${adminToken}`);

    // Query by rejected status
    const listRes = await request(app)
      .get('/api/admin/organizers?status=rejected')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    const ids = listRes.body.data.organizers.map((o: { id: string }) => o.id);
    expect(ids).toContain(pendingOrg._id.toString());
  });

  // 45.2-e: Non-SuperAdmin → 403, account untouched
  it('returns 403 when a non-SuperAdmin tries to reject', async () => {
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
      .delete(rejectUrl(pendingOrg._id.toString()))
      .set('Authorization', `Bearer ${tokens.accessToken}`);

    expect(res.status).toBe(403);

    // Status must remain 'pending'
    const db = getTestDb();
    const unchanged = await db.collection('users').findOne({ _id: pendingOrg._id });
    expect(unchanged).not.toBeNull();
    expect(unchanged!.status).toBe('pending');
  });

  // 45.2-f: Unauthenticated → 401
  it('returns 401 for an unauthenticated request', async () => {
    const pendingOrg = await createTestUser({
      role: 'organizer',
      status: 'pending',
      isEmailVerified: false,
    });

    const res = await request(app).delete(rejectUrl(pendingOrg._id.toString()));
    expect(res.status).toBe(401);
  });

  // 45.2-g: Non-existent organizer ID → 404
  it('returns 404 for a non-existent organizer ID', async () => {
    const superAdmin = await createTestUser({
      role: 'superadmin',
      status: 'active',
      isEmailVerified: true,
    });

    const accessToken = generateTestAccessToken(superAdmin);
    const fakeId = new ObjectId().toString();

    const res = await request(app)
      .delete(rejectUrl(fakeId))
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // 45.2-h: Already-active organizer → 404 (not pending)
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
      .delete(rejectUrl(activeOrg._id.toString()))
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // 45.2-i: Invalid ObjectId format → 404
  it('returns 404 for a malformed organizer ID', async () => {
    const superAdmin = await createTestUser({
      role: 'superadmin',
      status: 'active',
      isEmailVerified: true,
    });

    const accessToken = generateTestAccessToken(superAdmin);

    const res = await request(app)
      .delete(rejectUrl('not-a-valid-id'))
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });
});
