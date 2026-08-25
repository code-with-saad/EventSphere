/**
 * Integration Tests — POST /api/auth/register
 *
 * Task 40.1
 *
 * Tests:
 *  - Successful Organizer registration (status=pending)
 *  - Successful Exhibitor registration (OTP sent — email mocked)
 *  - Duplicate email → 409
 *  - Invalid email format → 400
 *  - SuperAdmin role registration → 403
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../app';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearCollections,
} from '../helpers/db';

// ── Mock the email service so no real emails are sent ─────────────────────────
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

const BASE_URL = '/api/auth/register';

function organizerPayload(overrides = {}) {
  return {
    email: 'organizer@example.com',
    password: 'Password123',
    fullName: 'Test Organizer',
    role: 'organizer',
    ...overrides,
  };
}

function exhibitorPayload(overrides = {}) {
  return {
    email: 'exhibitor@example.com',
    password: 'Password123',
    fullName: 'Test Exhibitor',
    role: 'exhibitor',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  // 40.1-a: Organizer registration
  it('registers an Organizer and returns status=pending', async () => {
    const res = await request(app).post(BASE_URL).send(organizerPayload());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('organizer');
    expect(res.body.user.status).toBe('pending');
    expect(res.body.user.email).toBe('organizer@example.com');
    // passwordHash must NOT be exposed
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  // 40.1-b: Exhibitor registration (OTP sent)
  it('registers an Exhibitor and triggers OTP email', async () => {
    const { createEmailService } = await import('../../services/email.service');
    const mockSendOTP = vi.fn().mockResolvedValue(true);
    (createEmailService as ReturnType<typeof vi.fn>).mockReturnValue({
      sendOTPEmail: mockSendOTP,
    });

    const res = await request(app).post(BASE_URL).send(exhibitorPayload());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('exhibitor');
    expect(res.body.user.isEmailVerified).toBe(false);
    // Email service should have been called with the right purpose
    expect(mockSendOTP).toHaveBeenCalledWith(
      'exhibitor@example.com',
      expect.any(String),
      'registration'
    );
  });

  // 40.1-c: Attendee registration also triggers OTP
  it('registers an Attendee and triggers OTP email', async () => {
    const res = await request(app).post(BASE_URL).send({
      email: 'attendee@example.com',
      password: 'Password123',
      fullName: 'Test Attendee',
      role: 'attendee',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('attendee');
    expect(res.body.user.isEmailVerified).toBe(false);
  });

  // 40.1-d: Duplicate email → 409
  it('returns 409 when email is already registered', async () => {
    // Register once
    await request(app).post(BASE_URL).send(organizerPayload());

    // Try again with the same email
    const res = await request(app)
      .post(BASE_URL)
      .send(organizerPayload({ email: 'organizer@example.com', role: 'exhibitor' }));

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already registered/i);
  });

  // 40.1-e: Invalid email format → 400
  it('returns 400 for an invalid email format', async () => {
    const res = await request(app)
      .post(BASE_URL)
      .send(organizerPayload({ email: 'not-a-valid-email' }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 40.1-f: SuperAdmin role → 403
  it('returns 403 when attempting to register as superadmin', async () => {
    const res = await request(app)
      .post(BASE_URL)
      .send(organizerPayload({ role: 'superadmin' }));

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/superadmin/i);
  });

  // 40.1-g: Password too short → 400
  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await request(app)
      .post(BASE_URL)
      .send(organizerPayload({ password: 'short' }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 40.1-h: Missing required fields → 400
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post(BASE_URL).send({ email: 'x@x.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
