import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from './auth.middleware';
import { authorize } from './authorize.middleware';
import * as tokenService from '../services/token.service';

/**
 * Integration tests for authentication and authorization middleware working together
 * 
 * These tests demonstrate the complete flow:
 * 1. Client sends request with JWT token
 * 2. authenticate middleware verifies token and sets req.user
 * 3. authorize middleware checks if user has required role
 * 4. Request proceeds to route handler or returns error
 */
describe('Authentication + Authorization Integration', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFunction = vi.fn();
  });

  describe('Complete successful authorization flow', () => {
    it('should allow SuperAdmin to access SuperAdmin-only route', () => {
      // Setup: Client sends valid SuperAdmin token
      const token = 'valid-superadmin-token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      // Mock token verification to return SuperAdmin user
      vi.spyOn(tokenService, 'verifyToken').mockReturnValue({
        userId: '123',
        email: 'admin@example.com',
        role: 'superadmin'
      });

      // Step 1: Authentication middleware verifies token
      authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      // Verify req.user is set
      expect(mockRequest.user).toEqual({
        userId: '123',
        email: 'admin@example.com',
        role: 'superadmin'
      });

      // Step 2: Authorization middleware checks role
      const authorizeSuperAdmin = authorize('superadmin');
      authorizeSuperAdmin(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      // Verify next() was called twice (once by each middleware)
      expect(nextFunction).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow Organizer to access Organizer-only route', () => {
      const token = 'valid-organizer-token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      vi.spyOn(tokenService, 'verifyToken').mockReturnValue({
        userId: '456',
        email: 'organizer@example.com',
        role: 'organizer'
      });

      // Authentication
      authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      // Authorization
      const authorizeOrganizer = authorize('organizer');
      authorizeOrganizer(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow SuperAdmin to access multi-role route (SuperAdmin or Organizer)', () => {
      const token = 'valid-superadmin-token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      vi.spyOn(tokenService, 'verifyToken').mockReturnValue({
        userId: '123',
        email: 'admin@example.com',
        role: 'superadmin'
      });

      // Authentication
      authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      // Authorization with multiple roles
      const authorizeMultiple = authorize('superadmin', 'organizer');
      authorizeMultiple(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('Authorization failures after successful authentication', () => {
    it('should deny Exhibitor access to SuperAdmin-only route', () => {
      const token = 'valid-exhibitor-token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      vi.spyOn(tokenService, 'verifyToken').mockReturnValue({
        userId: '789',
        email: 'exhibitor@example.com',
        role: 'exhibitor'
      });

      // Authentication succeeds
      authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);

      // Authorization fails
      const authorizeSuperAdmin = authorize('superadmin');
      authorizeSuperAdmin(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access forbidden. You do not have permission to access this resource.'
      });
      expect(nextFunction).toHaveBeenCalledTimes(1); // Only called once by authenticate
    });

    it('should deny Attendee access to Organizer-only route', () => {
      const token = 'valid-attendee-token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      vi.spyOn(tokenService, 'verifyToken').mockReturnValue({
        userId: '101',
        email: 'attendee@example.com',
        role: 'attendee'
      });

      // Authentication succeeds
      authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      // Authorization fails
      const authorizeOrganizer = authorize('organizer');
      authorizeOrganizer(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Authentication failures before authorization', () => {
    it('should fail at authentication step with missing token', () => {
      // No Authorization header
      mockRequest.headers = {};

      // Authentication fails
      authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required. No token provided.'
      });
      expect(nextFunction).not.toHaveBeenCalled();

      // Authorization is never reached
      // (but if it were, it would also return 401 for missing req.user)
    });

    it('should fail at authentication step with invalid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      vi.spyOn(tokenService, 'verifyToken').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Authentication fails
      authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token. Authentication failed.'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should fail at authentication step with expired token', () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token'
      };

      vi.spyOn(tokenService, 'verifyToken').mockImplementation(() => {
        throw new Error('Token expired');
      });

      // Authentication fails
      authenticate(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('Typical API endpoint patterns', () => {
    it('should simulate /api/admin/pending-organizers endpoint (SuperAdmin only)', () => {
      const token = 'valid-superadmin-token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      vi.spyOn(tokenService, 'verifyToken').mockReturnValue({
        userId: '123',
        email: 'admin@example.com',
        role: 'superadmin'
      });

      // Simulate: app.get('/api/admin/pending-organizers', authenticate, authorize('superadmin'), handler)
      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      const authMiddleware = authorize('superadmin');
      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(2);
      // Would now proceed to route handler
    });

    it('should simulate /api/events endpoint (Organizer OR SuperAdmin)', () => {
      const token = 'valid-organizer-token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      vi.spyOn(tokenService, 'verifyToken').mockReturnValue({
        userId: '456',
        email: 'organizer@example.com',
        role: 'organizer'
      });

      // Simulate: app.get('/api/events', authenticate, authorize('organizer', 'superadmin'), handler)
      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      const authMiddleware = authorize('organizer', 'superadmin');
      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(2);
    });

    it('should simulate /api/profile endpoint (all authenticated users)', () => {
      const token = 'valid-attendee-token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      vi.spyOn(tokenService, 'verifyToken').mockReturnValue({
        userId: '101',
        email: 'attendee@example.com',
        role: 'attendee'
      });

      // Simulate: app.get('/api/profile', authenticate, authorize('superadmin', 'organizer', 'exhibitor', 'attendee'), handler)
      authenticate(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      const authMiddleware = authorize('superadmin', 'organizer', 'exhibitor', 'attendee');
      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(2);
    });
  });
});
