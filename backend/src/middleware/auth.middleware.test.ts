import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from './auth.middleware';
import * as tokenService from '../services/token.service';

// Mock the token service
vi.mock('../services/token.service', () => ({
  verifyToken: vi.fn()
}));

describe('Authentication Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Setup mock request
    mockRequest = {
      headers: {}
    };

    // Setup mock response
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock
    };

    // Setup mock next function
    mockNext = vi.fn();
  });

  describe('Missing Authorization Header', () => {
    it('should return 401 when Authorization header is missing', async () => {
      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required. No token provided.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header does not start with Bearer', async () => {
      mockRequest.headers = {
        authorization: 'Basic abc123'
      };

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required. No token provided.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Token Verification', () => {
    it('should attach user info to request and call next() for valid token', async () => {
      const mockDecodedToken = {
        userId: '507f1f77bcf86cd799439011',
        email: 'user@example.com',
        role: 'organizer'
      };

      mockRequest.headers = {
        authorization: 'Bearer validtoken123'
      };

      vi.mocked(tokenService.verifyToken).mockReturnValue(mockDecodedToken);

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(tokenService.verifyToken).toHaveBeenCalledWith('validtoken123');
      expect(mockRequest.user).toEqual({
        userId: '507f1f77bcf86cd799439011',
        email: 'user@example.com',
        role: 'organizer'
      });
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('Token Expiry', () => {
    it('should return 401 with TOKEN_EXPIRED code when token is expired', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expiredtoken123'
      };

      vi.mocked(tokenService.verifyToken).mockImplementation(() => {
        throw new Error('Token expired');
      });

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Token expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Invalid Token', () => {
    it('should return 401 when token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalidtoken123'
      };

      vi.mocked(tokenService.verifyToken).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token. Authentication failed.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Unexpected Errors', () => {
    it('should return 401 for unexpected verification errors', async () => {
      mockRequest.headers = {
        authorization: 'Bearer sometoken123'
      };

      vi.mocked(tokenService.verifyToken).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication failed.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle tokens with missing email and role fields', async () => {
      const mockDecodedToken = {
        userId: '507f1f77bcf86cd799439011'
      };

      mockRequest.headers = {
        authorization: 'Bearer partialtoken123'
      };

      vi.mocked(tokenService.verifyToken).mockReturnValue(mockDecodedToken as any);

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toEqual({
        userId: '507f1f77bcf86cd799439011',
        email: '',
        role: ''
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should extract token correctly by removing Bearer prefix', async () => {
      const mockDecodedToken = {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        role: 'attendee'
      };

      mockRequest.headers = {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      };

      vi.mocked(tokenService.verifyToken).mockReturnValue(mockDecodedToken);

      await authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(tokenService.verifyToken).toHaveBeenCalledWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
