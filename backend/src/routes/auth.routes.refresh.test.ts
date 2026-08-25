/**
 * Tests for POST /api/auth/refresh
 *
 * Requirements: 9.3, 9.4, 9.5, 9.6, 9.7
 *
 * These tests are co-located with the route file and share the Atlas test
 * database. Email service is mocked so no real emails are sent.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearCollections,
} from '../__tests__/helpers/db';
import {
  createTestUser,
  generateTestRefreshToken,
  loginUser,
} from '../__tests__/helpers/auth';

// ── Mock email ────────────────────────────────────────────────────────────────
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  it('should return 401 if no refresh token provided', async () => {
    const response = await request(app).post('/api/auth/refresh').send({});
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('MISSING_REFRESH_TOKEN');
  });

  it('should return 401 if refresh token is invalid', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', 'Bearer invalid-token-here');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should return new tokens when valid refresh token provided', async () => {
    const user = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });

    const { accessToken } = await loginUser(app, user.email, user.password);
    const refreshToken = await generateTestRefreshToken(user);

    // Wait 1s so new JWT has a different iat
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${refreshToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data).toHaveProperty('refreshToken');
    expect(response.body.data.refreshToken).not.toBe(refreshToken);
    expect(response.body.data.accessToken).not.toBe(accessToken);
  });

  it('should invalidate old refresh token after rotation', async () => {
    const user = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });

    const refreshToken = await generateTestRefreshToken(user);

    // First use — should succeed
    const response1 = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${refreshToken}`);
    expect(response1.status).toBe(200);

    // Second use of same token — should be rejected (rotated)
    const response2 = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${refreshToken}`);
    expect(response2.status).toBe(401);
    expect(response2.body.code).toBe('TOKEN_REVOKED');
  });

  it('should return 401 if access token is used instead of refresh token', async () => {
    const user = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });

    const { accessToken } = await loginUser(app, user.email, user.password);

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_TOKEN_TYPE');
  });
});
