/**
 * Integration Tests — DELETE /api/admin/organizers/:id/reject
 *
 * Task 45.2
 *
 * Verifies that the reject endpoint hard-deletes the organizer account
 * and all associated refresh tokens (Requirements 11.5, 11.7).
 *
 * Tests:
 *  - SuperAdmin can reject (hard-delete) a pending Organizer → 200
 *  - User no longer exists in DB after rejection
 *  - All refresh tokens for the user are removed
 *  - Non-SuperAdmin → 403
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
  // 45.2-a: SuperAdmin can hard-delete a pending organizer
  it('returns 200 and hard-deletes the organizer account', async () => {
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

    // Verify the user no longer exists in the database
    const db = getTestDb();
    const deleted = await db.collection('users').findOne({ _id: pendingOrg._id });
    expect(deleted).toBeNull();
  });

  // 45.2-b: All refresh tokens are deleted along with the account
  it('deletes all refresh tokens associated with the organizer', async () => {
    const pendingOrg = await createTestUser({
      role: 'organizer',
      status: 'pending',
      isEmailVerified: false,
    });

    // Seed a refresh token for this organizer
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

    // Verify the refresh token no longer exists
    const db = getTestDb();
    const tokenDoc = await db
      .collection('refresh_tokens')
      .findOne({ userId: pendingOrg._id });
    expect(tokenDoc).toBeNull();
  });

  // 45.2-c: Non-SuperAdmin (active organizer) → 403
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
    expect(res.body.success).toBe(false);

    // Status must remain — account should still exist
    const db = getTestDb();
    const unchanged = await db.collection('users').findOne({ _id: pendingOrg._id });
    expect(unchanged).not.toBeNull();
  });

  // 45.2-d: Unauthenticated → 401
  it('returns 401 for an unauthenticated request', async () => {
    const pendingOrg = await createTestUser({
      role: 'organizer',
      status: 'pending',
      isEmailVerified: false,
    });

    const res = await request(app).delete(rejectUrl(pendingOrg._id.toString()));

    expect(res.status).toBe(401);
  });

  // 45.2-e: Non-existent organizer ID → 404
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

  // 45.2-f: Already-active organizer → 404 (not pending)
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

  // 45.2-g: Invalid ObjectId format → 404
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
