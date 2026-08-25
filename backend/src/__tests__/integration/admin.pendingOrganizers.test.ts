/**
 * Integration Tests — GET /api/admin/pending-organizers
 *
 * Task 40.6
 *
 * Tests:
 *  - SuperAdmin can access and receives list of pending organizers
 *  - Non-SuperAdmin (Organizer role) → 403
 *  - Unauthenticated request → 401
 *  - List contains only pending Organizers (not active, not other roles)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../app';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearCollections,
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

const BASE_URL = '/api/admin/pending-organizers';

describe('GET /api/admin/pending-organizers', () => {
  // 40.6-a: SuperAdmin receives the list
  it('returns pending organizers for a SuperAdmin', async () => {
    // Create two pending organizers
    await createTestUser({ role: 'organizer', status: 'pending', isEmailVerified: false });
    await createTestUser({ role: 'organizer', status: 'pending', isEmailVerified: false });
    // Create one active organizer (should NOT appear)
    await createTestUser({ role: 'organizer', status: 'active', isEmailVerified: true });

    const superAdmin = await createTestUser({
      role: 'superadmin',
      status: 'active',
      isEmailVerified: true,
    });

    const accessToken = generateTestAccessToken(superAdmin);

    const res = await request(app)
      .get(BASE_URL)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(2);
    expect(res.body.data.organizers).toHaveLength(2);

    // Every returned organizer must be pending
    for (const org of res.body.data.organizers) {
      expect(org.status).toBe('pending');
    }

    // Sensitive fields must not be returned
    for (const org of res.body.data.organizers) {
      expect(org.passwordHash).toBeUndefined();
    }
  });

  // 40.6-b: List contains the correct fields
  it('returns organizers with id, email, fullName, status, createdAt', async () => {
    await createTestUser({ role: 'organizer', status: 'pending', isEmailVerified: false });

    const superAdmin = await createTestUser({
      role: 'superadmin',
      status: 'active',
      isEmailVerified: true,
    });

    const accessToken = generateTestAccessToken(superAdmin);

    const res = await request(app)
      .get(BASE_URL)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const org = res.body.data.organizers[0];
    expect(org.id).toBeDefined();
    expect(org.email).toBeDefined();
    expect(org.fullName).toBeDefined();
    expect(org.status).toBe('pending');
    expect(org.createdAt).toBeDefined();
  });

  // 40.6-c: Non-SuperAdmin (Organizer) → 403
  it('returns 403 when a non-SuperAdmin accesses the endpoint', async () => {
    const { tokens } = await createAndLoginUser(app, {
      role: 'organizer',
      status: 'active',
      isEmailVerified: true,
    });

    const res = await request(app)
      .get(BASE_URL)
      .set('Authorization', `Bearer ${tokens.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 40.6-d: Exhibitor → 403
  it('returns 403 for an Exhibitor', async () => {
    const { tokens } = await createAndLoginUser(app, {
      role: 'exhibitor',
      status: 'active',
      isEmailVerified: true,
    });

    const res = await request(app)
      .get(BASE_URL)
      .set('Authorization', `Bearer ${tokens.accessToken}`);

    expect(res.status).toBe(403);
  });

  // 40.6-e: Unauthenticated → 401
  it('returns 401 for an unauthenticated request', async () => {
    const res = await request(app).get(BASE_URL);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 40.6-f: Empty list when no pending organizers
  it('returns an empty list when there are no pending organizers', async () => {
    const superAdmin = await createTestUser({
      role: 'superadmin',
      status: 'active',
      isEmailVerified: true,
    });

    const accessToken = generateTestAccessToken(superAdmin);

    const res = await request(app)
      .get(BASE_URL)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(0);
    expect(res.body.data.organizers).toHaveLength(0);
  });
});
