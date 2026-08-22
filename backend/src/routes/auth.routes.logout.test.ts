import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import authRoutes from './auth.routes';
import * as RefreshTokenModel from '../models/RefreshToken.model';
import * as tokenService from '../services/token.service';
import * as authMiddleware from '../middleware/auth.middleware';

// Mock dependencies
vi.mock('../models/RefreshToken.model');
vi.mock('../services/token.service');
vi.mock('../middleware/auth.middleware', async () => {
  const actual = await vi.importActual('../middleware/auth.middleware');
  return {
    ...actual,
    authenticate: vi.fn((req, res, next) => {
      // Mock successful authentication by default
      req.user = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'attendee'
      };
      next();
    })
  };
});

describe('POST /api/auth/logout', () => {
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

  it('should successfully logout and invalidate refresh token', async () => {
    const testRefreshToken = 'test-refresh-token';
    
    // Mock invalidateRefreshToken to return true (token was invalidated)
    vi.mocked(RefreshTokenModel.invalidateRefreshToken).mockResolvedValue(true);

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer test-access-token')
      .send({ refreshToken: testRefreshToken });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Logged out successfully');

    // Verify invalidateRefreshToken was called
    expect(RefreshTokenModel.invalidateRefreshToken).toHaveBeenCalled();
  });

  it('should return 401 when access token is missing', async () => {
    // Mock authenticate middleware to reject
    vi.mocked(authMiddleware.authenticate).mockImplementationOnce((req, res: any, next) => {
      res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      });
    });

    const response = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'test-token' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Authentication required');
  });

  it('should return 400 when refresh token is missing', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer test-access-token')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Refresh token is required');
  });

  it('should return 200 even when refresh token is not found in database', async () => {
    const testRefreshToken = 'fake-refresh-token';
    
    // Mock invalidateRefreshToken to return false (token not found)
    vi.mocked(RefreshTokenModel.invalidateRefreshToken).mockResolvedValue(false);

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer test-access-token')
      .send({ refreshToken: testRefreshToken });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Logged out successfully');
  });

  it('should return 200 even if an error occurs during invalidation', async () => {
    const testRefreshToken = 'test-refresh-token';
    
    // Mock invalidateRefreshToken to throw an error
    vi.mocked(RefreshTokenModel.invalidateRefreshToken).mockRejectedValue(
      new Error('Database error')
    );

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer test-access-token')
      .send({ refreshToken: testRefreshToken });

    // Should still return success to allow client to clear tokens
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Logged out successfully');
  });
});
