/**
 * Integration Tests — POST /api/auth/verify-otp
 *
 * Task 40.2
 *
 * Tests:
 *  - Valid OTP activates account (isEmailVerified=true, status=active)
 *  - Invalid OTP → 401
 *  - Expired OTP → 401
 *  - Already-verified account → 409
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
import { createTestUser } from '../helpers/auth';

// ── Mock email so OTP emails are swallowed ────────────────────────────────────
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

// ── Helper ────────────────────────────────────────────────────────────────────

const BASE_URL = '/api/auth/verify-otp';

/**
 * Insert a real OTP record for the given email/purpose and return the
 * plaintext OTP (so tests can submit it).
 */
async function seedOTP(
  email: string,
  purpose: 'registration' | 'password_reset',
  opts: { expired?: boolean } = {}
): Promise<string> {
  const db = getTestDb();
  const plainOTP = '123456';
  const otpHash = await bcrypt.hash(plainOTP, 10);

  const expiresAt = opts.expired
    ? new Date(Date.now() - 1000) // 1 second in the past
    : new Date(Date.now() + 5 * 60 * 1000); // 5 minutes in the future

  // upsert — safe if collection already has an entry for this email+purpose
  await db.collection('otps').updateOne(
    { email: email.toLowerCase(), purpose },
    {
      $set: {
        email: email.toLowerCase(),
        purpose,
        otpHash,
        expiresAt,
        resendCount: 0,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  return plainOTP;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/verify-otp', () => {
  // 40.2-a: Valid OTP activates account
  it('activates an unverified account with a valid OTP', async () => {
    const user = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: false,
    });

    const otp = await seedOTP(user.email, 'registration');

    const res = await request(app).post(BASE_URL).send({
      email: user.email,
      otp,
      purpose: 'registration',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isEmailVerified).toBe(true);

    // Confirm the user is now verified in the database
    const db = getTestDb();
    const updated = await db.collection('users').findOne({ email: user.email });
    expect(updated?.isEmailVerified).toBe(true);
    expect(updated?.status).toBe('active');
  });

  // 40.2-b: Wrong OTP → 401
  it('returns 401 for an incorrect OTP', async () => {
    const user = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: false,
    });

    await seedOTP(user.email, 'registration');

    const res = await request(app).post(BASE_URL).send({
      email: user.email,
      otp: '000000', // wrong OTP
      purpose: 'registration',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid otp/i);
  });

  // 40.2-c: Expired OTP → 401
  it('returns 401 for an expired OTP', async () => {
    const user = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: false,
    });

    const otp = await seedOTP(user.email, 'registration', { expired: true });

    const res = await request(app).post(BASE_URL).send({
      email: user.email,
      otp,
      purpose: 'registration',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/expired/i);
  });

  // 40.2-d: Already verified → 409
  it('returns 409 when the account is already verified', async () => {
    const user = await createTestUser({
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true, // already verified
    });

    const otp = await seedOTP(user.email, 'registration');

    const res = await request(app).post(BASE_URL).send({
      email: user.email,
      otp,
      purpose: 'registration',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already verified/i);
  });

  // 40.2-e: Missing fields → 400
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post(BASE_URL).send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
