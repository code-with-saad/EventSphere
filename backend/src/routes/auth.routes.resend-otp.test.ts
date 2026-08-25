/**
 * Integration Tests — POST /api/auth/resend-otp
 *
 * These tests sit next to the route file (older style) but share the same
 * Atlas test database as the __tests__/integration/ suite.
 * Email service is mocked so no real emails are sent.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearCollections,
} from '../__tests__/helpers/db';
import { createTestUser } from '../__tests__/helpers/auth';

// ── Mock email so no real emails are sent ─────────────────────────────────────
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

const BASE_URL = '/api/auth/resend-otp';

describe('POST /api/auth/resend-otp', () => {
  describe('Input Validation', () => {
    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post(BASE_URL)
        .send({ purpose: 'registration' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing required fields');
    });

    it('should return 400 if purpose is missing', async () => {
      const response = await request(app)
        .post(BASE_URL)
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing required fields');
    });

    it('should return 400 if purpose is invalid', async () => {
      const response = await request(app)
        .post(BASE_URL)
        .send({ email: 'test@example.com', purpose: 'invalid_purpose' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid purpose');
    });
  });

  describe('User Validation', () => {
    it('should return 404 if user does not exist', async () => {
      const response = await request(app)
        .post(BASE_URL)
        .send({ email: 'nonexistent@example.com', purpose: 'registration' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No pending OTP found');
    });

    it('should return 409 if account is already verified', async () => {
      // Create a verified user directly via helper
      const user = await createTestUser({
        role: 'exhibitor',
        status: 'active',
        isEmailVerified: true,
      });

      const response = await request(app)
        .post(BASE_URL)
        .send({ email: user.email, purpose: 'registration' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Account already verified');
    });
  });

  describe('Resend Count Tracking', () => {
    it('should successfully resend OTP and track count', async () => {
      // Register a new exhibitor via the API so an OTP record is created
      const email = `resend-count-${Date.now()}@example.com`;
      const registerRes = await request(app).post('/api/auth/register').send({
        email,
        password: 'TestPass123',
        fullName: 'Resend Count Test',
        role: 'exhibitor',
      });
      expect(registerRes.status).toBe(201);

      // First resend
      const response1 = await request(app)
        .post(BASE_URL)
        .send({ email, purpose: 'registration' });

      expect(response1.status).toBe(200);
      expect(response1.body.success).toBe(true);
      expect(response1.body.data.otpExpiresIn).toBe(300);
      expect(response1.body.data.remainingAttempts).toBeDefined();

      // Second resend
      const response2 = await request(app)
        .post(BASE_URL)
        .send({ email, purpose: 'registration' });
      expect(response2.status).toBe(200);
    });

    it('should return 429 when resend limit is exceeded', async () => {
      // Register a new user
      const email = `resend-limit-${Date.now()}@example.com`;
      await request(app).post('/api/auth/register').send({
        email,
        password: 'TestPass123',
        fullName: 'Resend Limit Test',
        role: 'exhibitor',
      });

      // Perform 3 resends (initial OTP was sent on register = resendCount 0)
      await request(app).post(BASE_URL).send({ email, purpose: 'registration' });
      await request(app).post(BASE_URL).send({ email, purpose: 'registration' });
      await request(app).post(BASE_URL).send({ email, purpose: 'registration' });

      // Fourth resend should fail with 429
      const response = await request(app)
        .post(BASE_URL)
        .send({ email, purpose: 'registration' });

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Maximum OTP resend attempts exceeded');
    });
  });

  describe('Response Format', () => {
    it('should return correct response structure', async () => {
      // Register a new user
      const email = `response-format-${Date.now()}@example.com`;
      await request(app).post('/api/auth/register').send({
        email,
        password: 'TestPass123',
        fullName: 'Response Format Test',
        role: 'exhibitor',
      });

      const response = await request(app)
        .post(BASE_URL)
        .send({ email, purpose: 'registration' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('otpExpiresIn');
      expect(response.body.data).toHaveProperty('remainingAttempts');
    });
  });
});
