/**
 * Integration Tests — Forgot Password Flow (3 steps)
 *
 * Task 40.5
 *
 *  Step 1: POST /api/auth/forgot-password/request
 *  Step 2: POST /api/auth/forgot-password/verify-otp
 *  Step 3: POST /api/auth/forgot-password/reset
 *
 * Tests:
 *  - Complete happy path (request → verify OTP → reset)
 *  - Old password no longer works after reset
 *  - All refresh tokens for the user are invalidated after reset
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
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

// ── Mock email ────────────────────────────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const REQUEST_URL = '/api/auth/forgot-password/request';
const VERIFY_URL = '/api/auth/forgot-password/verify-otp';
const RESET_URL = '/api/auth/forgot-password/reset';

/**
 * Directly seed a password_reset OTP for the given email and return the
 * plaintext OTP — bypassing the email-send step so we can control the OTP.
 */
async function seedPasswordResetOTP(email: string): Promise<string> {
  const db = getTestDb();
  const plainOTP = '654321';
  const otpHash = await bcrypt.hash(plainOTP, 10);

  await db.collection('otps').updateOne(
    { email: email.toLowerCase(), purpose: 'password_reset' },
    {
      $set: {
        email: email.toLowerCase(),
        purpose: 'password_reset',
        otpHash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        resendCount: 0,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  return plainOTP;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Forgot Password Flow', () => {
  // ── Step 1 ──────────────────────────────────────────────────────────────────

  describe('POST /api/auth/forgot-password/request', () => {
    it('returns 200 success for a registered email (prevents enumeration)', async () => {
      const user = await createTestUser({
        role: 'attendee',
        status: 'active',
        isEmailVerified: true,
      });

      const res = await request(app)
        .post(REQUEST_URL)
        .send({ email: user.email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Same message regardless of whether account exists
      expect(res.body.message).toMatch(/if an account exists/i);
    });

    it('returns 200 success even for a non-existent email (prevents enumeration)', async () => {
      const res = await request(app)
        .post(REQUEST_URL)
        .send({ email: 'doesnotexist@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/if an account exists/i);
    });

    it('returns 400 for an invalid email format', async () => {
      const res = await request(app)
        .post(REQUEST_URL)
        .send({ email: 'not-valid' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Step 2 ──────────────────────────────────────────────────────────────────

  describe('POST /api/auth/forgot-password/verify-otp', () => {
    it('returns a reset token for a valid OTP', async () => {
      const user = await createTestUser({
        role: 'attendee',
        status: 'active',
        isEmailVerified: true,
      });

      const otp = await seedPasswordResetOTP(user.email);

      const res = await request(app)
        .post(VERIFY_URL)
        .send({ email: user.email, otp });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resetToken).toBeDefined();
      expect(res.body.data.expiresIn).toBe(600); // 10 minutes
    });

    it('returns 401 for an incorrect OTP', async () => {
      const user = await createTestUser({
        role: 'attendee',
        status: 'active',
        isEmailVerified: true,
      });

      await seedPasswordResetOTP(user.email);

      const res = await request(app)
        .post(VERIFY_URL)
        .send({ email: user.email, otp: '000000' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 for an expired OTP', async () => {
      const db = getTestDb();
      const user = await createTestUser({
        role: 'attendee',
        status: 'active',
        isEmailVerified: true,
      });

      const expiredOTP = '111111';
      const otpHash = await bcrypt.hash(expiredOTP, 10);

      await db.collection('otps').insertOne({
        email: user.email,
        purpose: 'password_reset',
        otpHash,
        expiresAt: new Date(Date.now() - 1000), // already expired
        resendCount: 0,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post(VERIFY_URL)
        .send({ email: user.email, otp: expiredOTP });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/expired/i);
    });
  });

  // ── Step 3 ──────────────────────────────────────────────────────────────────

  describe('POST /api/auth/forgot-password/reset', () => {
    it('resets the password with a valid reset token', async () => {
      const user = await createTestUser({
        role: 'attendee',
        status: 'active',
        isEmailVerified: true,
      });

      const otp = await seedPasswordResetOTP(user.email);
      const verifyRes = await request(app)
        .post(VERIFY_URL)
        .send({ email: user.email, otp });

      const { resetToken } = verifyRes.body.data;

      const newPassword = 'NewPassword456!';
      const resetRes = await request(app)
        .post(RESET_URL)
        .send({ resetToken, newPassword });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);
      expect(resetRes.body.message).toMatch(/password reset successfully/i);
    });

    it('returns 400 when new password is too short', async () => {
      const user = await createTestUser({
        role: 'attendee',
        status: 'active',
        isEmailVerified: true,
      });

      const otp = await seedPasswordResetOTP(user.email);
      const verifyRes = await request(app)
        .post(VERIFY_URL)
        .send({ email: user.email, otp });

      const { resetToken } = verifyRes.body.data;

      const res = await request(app)
        .post(RESET_URL)
        .send({ resetToken, newPassword: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 for an invalid reset token', async () => {
      const res = await request(app)
        .post(RESET_URL)
        .send({ resetToken: 'invalid.token.here', newPassword: 'NewPassword123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ── End-to-end happy path ────────────────────────────────────────────────────

  describe('Complete flow', () => {
    it('old password fails after successful reset', async () => {
      const user = await createTestUser({
        role: 'exhibitor',
        status: 'active',
        isEmailVerified: true,
      });

      const oldPassword = user.password;

      // Step 1 — request OTP (triggers email, mocked)
      await request(app).post(REQUEST_URL).send({ email: user.email });

      // Directly seed a known OTP into the DB
      const otp = await seedPasswordResetOTP(user.email);

      // Step 2 — verify OTP
      const verifyRes = await request(app)
        .post(VERIFY_URL)
        .send({ email: user.email, otp });
      expect(verifyRes.status).toBe(200);

      const { resetToken } = verifyRes.body.data;

      // Step 3 — reset password
      const newPassword = 'BrandNewPass789!';
      const resetRes = await request(app)
        .post(RESET_URL)
        .send({ resetToken, newPassword });
      expect(resetRes.status).toBe(200);

      // Old password must no longer work
      const oldLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: oldPassword });
      expect(oldLoginRes.status).toBe(401);

      // New password must work
      const newLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: user.email, password: newPassword });
      expect(newLoginRes.status).toBe(200);
    });

    it('all existing refresh tokens are invalidated after password reset', async () => {
      const user = await createTestUser({
        role: 'exhibitor',
        status: 'active',
        isEmailVerified: true,
      });

      // Create two active refresh tokens for this user
      await generateTestRefreshToken(user);
      await generateTestRefreshToken(user);

      const db = getTestDb();
      const validBefore = await db
        .collection('refresh_tokens')
        .countDocuments({ userId: user._id, isValid: true });
      expect(validBefore).toBe(2);

      // Run the reset flow
      const otp = await seedPasswordResetOTP(user.email);
      const verifyRes = await request(app)
        .post(VERIFY_URL)
        .send({ email: user.email, otp });
      expect(verifyRes.status).toBe(200);

      const { resetToken } = verifyRes.body.data;
      const resetRes = await request(app)
        .post(RESET_URL)
        .send({ resetToken, newPassword: 'NewPass12345!' });
      expect(resetRes.status).toBe(200);

      // All tokens must now be invalid
      const validAfter = await db
        .collection('refresh_tokens')
        .countDocuments({ userId: user._id, isValid: true });
      expect(validAfter).toBe(0);
    });
  });
});
