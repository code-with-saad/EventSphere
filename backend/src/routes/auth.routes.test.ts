import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import authRoutes from './auth.routes';
import UserModel from '../models/User.model';
import { createOTPService } from '../services/otp.service';
import { getDatabase } from '../config/database';

// Mock dependencies
vi.mock('../models/User.model');
vi.mock('../services/otp.service');
vi.mock('../config/database');

describe('POST /api/auth/verify-otp', () => {
  let app: Express;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Success Cases', () => {
    it('should verify OTP successfully for registration purpose', async () => {
      // Mock user exists and is not verified
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        isEmailVerified: false,
        status: 'active'
      };

      vi.mocked(UserModel.findByEmail).mockResolvedValue(mockUser as any);
      vi.mocked(UserModel.updateById).mockResolvedValue({
        ...mockUser,
        isEmailVerified: true,
        status: 'active'
      } as any);

      // Mock OTP service
      const mockOTPService = {
        verifyAndDeleteOTP: vi.fn().mockResolvedValue(true)
      };
      vi.mocked(createOTPService).mockReturnValue(mockOTPService as any);
      vi.mocked(getDatabase).mockReturnValue({} as any);

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'test@example.com',
          otp: '123456',
          purpose: 'registration'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Email verified successfully. You can now log in.');
      expect(response.body.data.userId).toBe('507f1f77bcf86cd799439011');
      expect(response.body.data.isEmailVerified).toBe(true);

      // Verify user was updated
      expect(UserModel.updateById).toHaveBeenCalledWith(
        mockUser._id,
        {
          isEmailVerified: true,
          status: 'active'
        }
      );

      // Verify OTP was verified and deleted
      expect(mockOTPService.verifyAndDeleteOTP).toHaveBeenCalledWith(
        'test@example.com',
        '123456',
        'registration'
      );
    });

    it('should verify OTP for password_reset purpose without updating user', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        isEmailVerified: true,
        status: 'active'
      };

      vi.mocked(UserModel.findByEmail).mockResolvedValue(mockUser as any);

      const mockOTPService = {
        verifyAndDeleteOTP: vi.fn().mockResolvedValue(true)
      };
      vi.mocked(createOTPService).mockReturnValue(mockOTPService as any);
      vi.mocked(getDatabase).mockReturnValue({} as any);

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'test@example.com',
          otp: '654321',
          purpose: 'password_reset'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Should not update user for password_reset purpose
      expect(UserModel.updateById).not.toHaveBeenCalled();
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          otp: '123456',
          purpose: 'registration'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Missing required fields: email, otp, purpose');
    });

    it('should return 400 when otp is missing', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'test@example.com',
          purpose: 'registration'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Missing required fields: email, otp, purpose');
    });

    it('should return 400 when purpose is missing', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'test@example.com',
          otp: '123456'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Missing required fields: email, otp, purpose');
    });

    it('should return 400 when purpose is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'test@example.com',
          otp: '123456',
          purpose: 'invalid_purpose'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid purpose. Must be "registration" or "password_reset"');
    });
  });

  describe('User Not Found', () => {
    it('should return 404 when user does not exist', async () => {
      vi.mocked(UserModel.findByEmail).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'nonexistent@example.com',
          otp: '123456',
          purpose: 'registration'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('Already Verified Account', () => {
    it('should return 409 when account is already verified for registration purpose', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        isEmailVerified: true,
        status: 'active'
      };

      vi.mocked(UserModel.findByEmail).mockResolvedValue(mockUser as any);

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'test@example.com',
          otp: '123456',
          purpose: 'registration'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Account already verified');
    });

    it('should not check isEmailVerified for password_reset purpose', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        isEmailVerified: true,
        status: 'active'
      };

      vi.mocked(UserModel.findByEmail).mockResolvedValue(mockUser as any);

      const mockOTPService = {
        verifyAndDeleteOTP: vi.fn().mockResolvedValue(true)
      };
      vi.mocked(createOTPService).mockReturnValue(mockOTPService as any);
      vi.mocked(getDatabase).mockReturnValue({} as any);

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'test@example.com',
          otp: '123456',
          purpose: 'password_reset'
        });

      // Should succeed even though already verified
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Invalid OTP', () => {
    it('should return 401 when OTP is invalid', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        isEmailVerified: false,
        status: 'active'
      };

      vi.mocked(UserModel.findByEmail).mockResolvedValue(mockUser as any);

      const mockOTPService = {
        verifyAndDeleteOTP: vi.fn().mockResolvedValue(false) // Invalid OTP
      };
      vi.mocked(createOTPService).mockReturnValue(mockOTPService as any);
      vi.mocked(getDatabase).mockReturnValue({} as any);

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'test@example.com',
          otp: '999999',
          purpose: 'registration'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid OTP');
    });
  });

  describe('Expired OTP', () => {
    it('should return 401 when OTP has expired', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        isEmailVerified: false,
        status: 'active'
      };

      vi.mocked(UserModel.findByEmail).mockResolvedValue(mockUser as any);

      const mockOTPService = {
        verifyAndDeleteOTP: vi.fn().mockRejectedValue(new Error('OTP has expired'))
      };
      vi.mocked(createOTPService).mockReturnValue(mockOTPService as any);
      vi.mocked(getDatabase).mockReturnValue({} as any);

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'test@example.com',
          otp: '123456',
          purpose: 'registration'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('OTP has expired');
    });
  });

  describe('No Pending OTP', () => {
    it('should return 404 when OTP record does not exist', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        isEmailVerified: false,
        status: 'active'
      };

      vi.mocked(UserModel.findByEmail).mockResolvedValue(mockUser as any);

      const mockOTPService = {
        verifyAndDeleteOTP: vi.fn().mockRejectedValue(new Error('OTP not found'))
      };
      vi.mocked(createOTPService).mockReturnValue(mockOTPService as any);
      vi.mocked(getDatabase).mockReturnValue({} as any);

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'test@example.com',
          otp: '123456',
          purpose: 'registration'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No pending OTP found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle case-insensitive email lookup', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        isEmailVerified: false,
        status: 'active'
      };

      vi.mocked(UserModel.findByEmail).mockResolvedValue(mockUser as any);
      vi.mocked(UserModel.updateById).mockResolvedValue({
        ...mockUser,
        isEmailVerified: true
      } as any);

      const mockOTPService = {
        verifyAndDeleteOTP: vi.fn().mockResolvedValue(true)
      };
      vi.mocked(createOTPService).mockReturnValue(mockOTPService as any);
      vi.mocked(getDatabase).mockReturnValue({} as any);

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'TEST@EXAMPLE.COM', // Uppercase email
          otp: '123456',
          purpose: 'registration'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // UserModel.findByEmail should handle case-insensitivity
      expect(UserModel.findByEmail).toHaveBeenCalledWith('TEST@EXAMPLE.COM');
    });

    it('should handle numeric OTP as string', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        isEmailVerified: false,
        status: 'active'
      };

      vi.mocked(UserModel.findByEmail).mockResolvedValue(mockUser as any);
      vi.mocked(UserModel.updateById).mockResolvedValue({
        ...mockUser,
        isEmailVerified: true
      } as any);

      const mockOTPService = {
        verifyAndDeleteOTP: vi.fn().mockResolvedValue(true)
      };
      vi.mocked(createOTPService).mockReturnValue(mockOTPService as any);
      vi.mocked(getDatabase).mockReturnValue({} as any);

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'test@example.com',
          otp: '123456', // String format
          purpose: 'registration'
        });

      expect(response.status).toBe(200);
      expect(mockOTPService.verifyAndDeleteOTP).toHaveBeenCalledWith(
        'test@example.com',
        '123456',
        'registration'
      );
    });
  });
});
