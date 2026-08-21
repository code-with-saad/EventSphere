import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Application } from 'express';
import authRoutes from './auth.routes';
import { connectDatabase, closeDatabase, getDatabase } from '../config/database';
import UserModel from '../models/User.model';
import { createOTPModel } from '../models/OTP.model';

describe('POST /api/auth/resend-otp', () => {
  let app: Application;

  beforeAll(async () => {
    await connectDatabase();
    
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Input Validation', () => {
    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/resend-otp')
        .send({ purpose: 'registration' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing required fields');
    });

    it('should return 400 if purpose is missing', async () => {
      const response = await request(app)
        .post('/api/auth/resend-otp')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing required fields');
    });

    it('should return 400 if purpose is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/resend-otp')
        .send({
          email: 'test@example.com',
          purpose: 'invalid_purpose'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid purpose');
    });
  });

  describe('User Validation', () => {
    it('should return 404 if user does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/resend-otp')
        .send({
          email: 'nonexistent-' + Date.now() + '@example.com',
          purpose: 'registration'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No pending OTP found');
    });

    it('should return 409 if account is already verified', async () => {
      // Create a verified user
      const email = 'verified-' + Date.now() + '@example.com';
      await UserModel.create({
        email,
        passwordHash: 'hashedpassword',
        fullName: 'Verified User',
        role: 'exhibitor',
        status: 'active',
        isEmailVerified: true
      });

      const response = await request(app)
        .post('/api/auth/resend-otp')
        .send({
          email,
          purpose: 'registration'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Account already verified');

      // Cleanup
      await UserModel.deleteByEmail(email);
    });
  });

  describe('Resend Count Tracking', () => {
    it('should successfully resend OTP and track count', async () => {
      // Register a new user first
      const email = 'resend-count-' + Date.now() + '@example.com';
      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'TestPass123',
          fullName: 'Resend Count Test',
          role: 'exhibitor'
        });

      // First resend
      const response1 = await request(app)
        .post('/api/auth/resend-otp')
        .send({
          email,
          purpose: 'registration'
        });

      expect(response1.status).toBe(200);
      expect(response1.body.success).toBe(true);
      expect(response1.body.data.resendCount).toBe(1);
      expect(response1.body.data.remainingAttempts).toBe(2);
      expect(response1.body.data.otpExpiresIn).toBe(300);

      // Second resend
      const response2 = await request(app)
        .post('/api/auth/resend-otp')
        .send({
          email,
          purpose: 'registration'
        });

      expect(response2.status).toBe(200);
      expect(response2.body.data.resendCount).toBe(2);
      expect(response2.body.data.remainingAttempts).toBe(1);

      // Third resend
      const response3 = await request(app)
        .post('/api/auth/resend-otp')
        .send({
          email,
          purpose: 'registration'
        });

      expect(response3.status).toBe(200);
      expect(response3.body.data.resendCount).toBe(3);
      expect(response3.body.data.remainingAttempts).toBe(0);

      // Cleanup
      await UserModel.deleteByEmail(email);
      const db = getDatabase();
      const otpModel = createOTPModel(db);
      await otpModel.deleteByEmailAndPurpose(email, 'registration');
    });

    it('should return 429 when resend limit is exceeded', async () => {
      // Register a new user
      const email = 'resend-limit-' + Date.now() + '@example.com';
      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'TestPass123',
          fullName: 'Resend Limit Test',
          role: 'exhibitor'
        });

      // Perform 3 resends
      await request(app).post('/api/auth/resend-otp').send({ email, purpose: 'registration' });
      await request(app).post('/api/auth/resend-otp').send({ email, purpose: 'registration' });
      await request(app).post('/api/auth/resend-otp').send({ email, purpose: 'registration' });

      // Fourth resend should fail
      const response = await request(app)
        .post('/api/auth/resend-otp')
        .send({
          email,
          purpose: 'registration'
        });

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Maximum OTP resend attempts exceeded');

      // Cleanup
      await UserModel.deleteByEmail(email);
      const db = getDatabase();
      const otpModel = createOTPModel(db);
      await otpModel.deleteByEmailAndPurpose(email, 'registration');
    });
  });

  describe('Response Format', () => {
    it('should return correct response structure', async () => {
      // Register a new user
      const email = 'response-format-' + Date.now() + '@example.com';
      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'TestPass123',
          fullName: 'Response Format Test',
          role: 'exhibitor'
        });

      const response = await request(app)
        .post('/api/auth/resend-otp')
        .send({
          email,
          purpose: 'registration'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('otpExpiresIn');
      expect(response.body.data).toHaveProperty('resendCount');
      expect(response.body.data).toHaveProperty('remainingAttempts');

      // Cleanup
      await UserModel.deleteByEmail(email);
      const db = getDatabase();
      const otpModel = createOTPModel(db);
      await otpModel.deleteByEmailAndPurpose(email, 'registration');
    });
  });
});
