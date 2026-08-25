/**
 * Tests for POST /api/auth/forgot-password/reset
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8
 */
import request from 'supertest';
import express, { Express } from 'express';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import authRoutes from './auth.routes';
import UserModel from '../models/User.model';
import * as RefreshTokenModel from '../models/RefreshToken.model';
import * as tokenService from '../services/token.service';
import * as passwordUtils from '../utils/password.utils';

// Mock dependencies
vi.mock('../models/User.model');
vi.mock('../models/RefreshToken.model');
vi.mock('../services/token.service');
vi.mock('../utils/password.utils');
vi.mock('../config/database');
vi.mock('../services/otp.service');
vi.mock('../services/email.service');

const VALID_RESET_TOKEN = 'valid.reset.token';
const NEW_PASSWORD = 'NewPassword123';
const MOCK_USER = {
  _id: '507f1f77bcf86cd799439011',
  email: 'user@example.com',
  passwordHash: 'oldhash',
  role: 'attendee',
  status: 'active',
  isEmailVerified: true,
};

describe('POST /api/auth/forgot-password/reset', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Requirement 14.1 — Accept resetToken and newPassword ───────────────────

  describe('Validation — missing fields (Requirement 14.3)', () => {
    it('should return 400 when resetToken is missing', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({ newPassword: NEW_PASSWORD });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when newPassword is missing', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({ resetToken: VALID_RESET_TOKEN });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when newPassword is too short (< 8 chars)', async () => {
      // validatePassword will say it's invalid
      vi.mocked(passwordUtils.validatePassword).mockReturnValue({
        isValid: false,
        error: 'Password must be at least 8 characters long',
      });

      const res = await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({ resetToken: VALID_RESET_TOKEN, newPassword: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('8 characters');
    });
  });

  // ─── Requirement 14.2 — Verify token signature/expiry ───────────────────────

  describe('Token validation (Requirement 14.2 / 14.8)', () => {
    beforeEach(() => {
      // Password passes validation in these tests
      vi.mocked(passwordUtils.validatePassword).mockReturnValue({ isValid: true });
    });

    it('should return 401 when token is invalid', async () => {
      vi.mocked(tokenService.verifyToken).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const res = await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({ resetToken: 'bad.token', newPassword: NEW_PASSWORD });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when token is expired', async () => {
      vi.mocked(tokenService.verifyToken).mockImplementation(() => {
        throw new Error('Token expired');
      });

      const res = await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({ resetToken: 'expired.token', newPassword: NEW_PASSWORD });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when token purpose is not password_reset', async () => {
      vi.mocked(tokenService.verifyToken).mockReturnValue({
        userId: MOCK_USER._id,
        email: MOCK_USER.email,
        role: MOCK_USER.role,
        // no purpose field — or wrong purpose
      } as any);

      const res = await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({ resetToken: VALID_RESET_TOKEN, newPassword: NEW_PASSWORD });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 when user from token does not exist', async () => {
      vi.mocked(tokenService.verifyToken).mockReturnValue({
        userId: MOCK_USER._id,
        purpose: 'password_reset',
      } as any);
      vi.mocked(UserModel.findById).mockResolvedValue(null as any);

      const res = await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({ resetToken: VALID_RESET_TOKEN, newPassword: NEW_PASSWORD });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Requirements 14.4–14.7 — Happy path ────────────────────────────────────

  describe('Successful password reset (Requirements 14.4, 14.5, 14.6, 14.7)', () => {
    beforeEach(() => {
      vi.mocked(passwordUtils.validatePassword).mockReturnValue({ isValid: true });
      vi.mocked(tokenService.verifyToken).mockReturnValue({
        userId: MOCK_USER._id,
        purpose: 'password_reset',
      } as any);
      vi.mocked(UserModel.findById).mockResolvedValue(MOCK_USER as any);
      vi.mocked(passwordUtils.hashPassword).mockResolvedValue('newhash');
      vi.mocked(UserModel.updateById).mockResolvedValue({ ...MOCK_USER, passwordHash: 'newhash' } as any);
      vi.mocked(RefreshTokenModel.invalidateAllUserRefreshTokens).mockResolvedValue(2);
    });

    it('should return 200 with success message', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({ resetToken: VALID_RESET_TOKEN, newPassword: NEW_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe(
        'Password reset successfully. You can now log in with your new password.'
      );
    });

    it('should hash the new password before storing (Requirement 14.4)', async () => {
      await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({ resetToken: VALID_RESET_TOKEN, newPassword: NEW_PASSWORD });

      expect(passwordUtils.hashPassword).toHaveBeenCalledWith(NEW_PASSWORD);
    });

    it('should update the user passwordHash in the database (Requirement 14.5)', async () => {
      await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({ resetToken: VALID_RESET_TOKEN, newPassword: NEW_PASSWORD });

      expect(UserModel.updateById).toHaveBeenCalledWith(
        MOCK_USER._id,
        { passwordHash: 'newhash' }
      );
    });

    it('should invalidate all refresh tokens for the user (Requirement 14.6)', async () => {
      await request(app)
        .post('/api/auth/forgot-password/reset')
        .send({ resetToken: VALID_RESET_TOKEN, newPassword: NEW_PASSWORD });

      expect(RefreshTokenModel.invalidateAllUserRefreshTokens).toHaveBeenCalled();
    });
  });
});
