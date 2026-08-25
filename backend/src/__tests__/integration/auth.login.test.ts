/**
 * Integration Tests — POST /api/auth/login
 *
 * Task 40.3
 *
 * Tests:
 *  - Valid credentials return accessToken and refreshToken
 *  - Invalid credentials → 401
 *  - Pending Organizer can still log in (returns 200 with status=pending per design)
 *  - Unverified Exhibitor → 403 EMAIL_NOT_VERIFIED
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../app';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearCollections,
  getTestDb,
} from '../helpers/db';
import { createTestUser } from '../helpers/auth';

// ── Mock email (not needed for login but keeps imports consistent) ─────────────
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

const BASE_URL = '/api/auth/login';

describe('POST /api/auth/login', () => {
  // 40.3-a: Valid credentials return both tokens
  it('returns accessToken and refreshToken for valid credentials', async () => {
    const user = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });

    const res = await request(app)
      .post(BASE_URL)
      .send({ email: user.email, password: user.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe(user.email);
    expect(res.body.data.user.role).toBe('attendee');
    // Sensitive field must not be exposed
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  // 40.3-b: Refresh token is persisted in the database
  it('persists the refresh token hash in the database', async () => {
    const user = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: true,
    });

    const res = await request(app)
      .post(BASE_URL)
      .send({ email: user.email, password: user.password });

    expect(res.status).toBe(200);

    // There should be exactly one refresh token for this user
    const db = getTestDb();
    const tokenCount = await db
      .collection('refresh_tokens')
      .countDocuments({ userId: user._id });

    expect(tokenCount).toBe(1);
  });

  // 40.3-c: Wrong password → 401
  it('returns 401 for wrong password', async () => {
    const user = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });

    const res = await request(app)
      .post(BASE_URL)
      .send({ email: user.email, password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  // 40.3-d: Non-existent email → 401
  it('returns 401 for a non-existent email', async () => {
    const res = await request(app)
      .post(BASE_URL)
      .send({ email: 'nobody@example.com', password: 'Password123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  // 40.3-e: Pending Organizer login — returns 200 with status=pending
  // (design decision: login is allowed; frontend shows pending screen)
  it('allows a pending Organizer to log in and returns status=pending', async () => {
    const user = await createTestUser({
      role: 'organizer',
      status: 'pending',
      isEmailVerified: false,
    });

    const res = await request(app)
      .post(BASE_URL)
      .send({ email: user.email, password: user.password });

    // Per design doc: pending organizers can log in — frontend routes them
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.status).toBe('pending');
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  // 40.3-f: Unverified Exhibitor → 403 EMAIL_NOT_VERIFIED
  it('returns 403 when an Exhibitor has not verified their email', async () => {
    const user = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: false,
    });

    const res = await request(app)
      .post(BASE_URL)
      .send({ email: user.email, password: user.password });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  // 40.3-g: Unverified Attendee → 403 EMAIL_NOT_VERIFIED
  it('returns 403 when an Attendee has not verified their email', async () => {
    const user = await createTestUser({
      role: 'attendee',
      status: 'active',
      isEmailVerified: false,
    });

    const res = await request(app)
      .post(BASE_URL)
      .send({ email: user.email, password: user.password });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  // 40.3-h: Missing fields → 400
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post(BASE_URL)
      .send({ email: 'x@x.com' }); // missing password

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
