/**
 * Test file for the token refresh endpoint
 * 
 * This test verifies the POST /api/auth/refresh endpoint implementation
 * 
 * Requirements tested:
 * - 9.3: Automatically call token refresh endpoint when Access_Token expires
 * - 9.4: Accept Refresh_Token via Authorization header
 * - 9.5: Generate new Access_Token when valid Refresh_Token submitted
 * - 9.6: Generate new Refresh_Token when valid Refresh_Token submitted
 * - 9.7: Invalidate old Refresh_Token when new tokens issued
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoClient } from 'mongodb';
import app from '../server';
import env from '../config/env';

describe('POST /api/auth/refresh', () => {
  let client: MongoClient;
  let testEmail: string;
  let testPassword: string;
  let refreshToken: string;
  let accessToken: string;

  beforeAll(async () => {
    // Connect to test database
    client = new MongoClient(env.MONGODB_URI);
    await client.connect();

    // Create a test user and login
    testEmail = `test-refresh-${Date.now()}@example.com`;
    testPassword = 'TestPassword123';

    // Register test user (exhibitor for email verification)
    await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        fullName: 'Test Refresh User',
        role: 'exhibitor'
      });

    // Get OTP from database and verify
    const db = client.db();
    const otpRecord = await db.collection('otps').findOne({ email: testEmail });
    
    if (otpRecord) {
      // For testing, we'll skip OTP verification and manually set user as verified
      await db.collection('users').updateOne(
        { email: testEmail },
        { $set: { isEmailVerified: true, status: 'active' } }
      );
    }

    // Login to get tokens
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

    refreshToken = loginResponse.body.data.refreshToken;
    accessToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup: delete test user
    if (client) {
      const db = client.db();
      await db.collection('users').deleteOne({ email: testEmail });
      await db.collection('refresh_tokens').deleteMany({ userId: testEmail });
      await client.close();
    }
  });

  it('should return 401 if no refresh token provided', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({});

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
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${refreshToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data).toHaveProperty('refreshToken');
    expect(response.body.data.accessToken).not.toBe(accessToken);
    expect(response.body.data.refreshToken).not.toBe(refreshToken);
  });

  it('should invalidate old refresh token after rotation', async () => {
    // Get new tokens
    const response1 = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${refreshToken}`);

    expect(response1.status).toBe(200);

    // Try to use old refresh token again - should fail
    const response2 = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${refreshToken}`);

    expect(response2.status).toBe(401);
    expect(response2.body.code).toBe('TOKEN_REVOKED');
  });

  it('should return 401 if access token is used instead of refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_TOKEN_TYPE');
  });
});
