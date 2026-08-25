/**
 * Integration Tests — POST /api/auth/refresh
 *
 * Task 40.4
 *
 * Tests:
 *  - Valid refresh token → new accessToken + refreshToken
 *  - Invalid (random string) refresh token → 401
 *  - Already-rotated refresh token → 401
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import app from '../../app';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearCollections,
  getTestDb,
} from '../helpers/db';
import {
  createTestUser,
  generateTestRefreshToken,
  loginUser,
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

const BASE_URL = '/api/auth/refresh';

describe('POST /api/auth/refresh', () => {
  // 40.4-a: Valid refresh token returns new tokens
  it('returns a new accessToken and refreshToken for a valid refresh token', async () => {
    const user = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });

    const refreshToken = await generateTestRefreshToken(user);

    // Wait 1s so the new JWT has a different iat than the old one
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const res = await request(app)
      .post(BASE_URL)
      .set('Authorization', `Bearer ${refreshToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // The new refresh token must differ from the original (token rotation)
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
  });

  // 40.4-b: New tokens are actually persisted
  it('stores the new refresh token hash and invalidates the old one', async () => {
    const user = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });

    const oldRefreshToken = await generateTestRefreshToken(user);

    await request(app)
      .post(BASE_URL)
      .set('Authorization', `Bearer ${oldRefreshToken}`);

    const db = getTestDb();
    const oldHash = crypto.createHash('sha256').update(oldRefreshToken).digest('hex');

    // Old token should now be invalid
    const oldRecord = await db
      .collection('refresh_tokens')
      .findOne({ tokenHash: oldHash });

    expect(oldRecord?.isValid).toBe(false);

    // Two records total: the original (now invalid) + the new valid one
    const validCount = await db
      .collection('refresh_tokens')
      .countDocuments({ userId: user._id, isValid: true });

    expect(validCount).toBe(1);
  });

  // 40.4-c: Invalid token → 401
  it('returns 401 for an invalid refresh token string', async () => {
    const res = await request(app)
      .post(BASE_URL)
      .set('Authorization', 'Bearer not.a.valid.jwt.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 40.4-d: Already-rotated token → 401
  it('returns 401 when a refresh token is used twice (token rotation)', async () => {
    const user = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });

    const refreshToken = await generateTestRefreshToken(user);

    // First use — valid
    const firstRes = await request(app)
      .post(BASE_URL)
      .set('Authorization', `Bearer ${refreshToken}`);

    expect(firstRes.status).toBe(200);

    // Second use — should be rejected (token has been rotated)
    const secondRes = await request(app)
      .post(BASE_URL)
      .set('Authorization', `Bearer ${refreshToken}`);

    expect(secondRes.status).toBe(401);
    expect(secondRes.body.success).toBe(false);
  });

  // 40.4-e: Missing Authorization header → 401
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).post(BASE_URL);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 40.4-f: Using an access token (not a refresh token) → 401
  it('returns 401 when an access token is submitted instead of a refresh token', async () => {
    const user = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });

    const { accessToken } = await loginUser(app, user.email, user.password);

    const res = await request(app)
      .post(BASE_URL)
      .set('Authorization', `Bearer ${accessToken}`);

    // An access token has type === undefined (not 'refresh'), so the endpoint
    // should reject it.
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
