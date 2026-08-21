import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response, NextFunction } from 'express';
import { authorize } from './authorize.middleware';
import { AuthRequest } from './auth.middleware';

describe('authorize middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFunction = vi.fn();
  });

  describe('when user is not authenticated', () => {
    it('should return 401 if req.user is undefined', () => {
      const middleware = authorize('superadmin');
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required. Please log in to access this resource.'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if req.user is null', () => {
      mockRequest.user = undefined;
      const middleware = authorize('organizer');
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('when user is authenticated but not authorized', () => {
    it('should return 403 if user role is not in allowedRoles', () => {
      mockRequest.user = {
        userId: '123',
        email: 'user@example.com',
        role: 'attendee'
      };

      const middleware = authorize('superadmin');
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access forbidden. You do not have permission to access this resource.'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 for organizer accessing superadmin route', () => {
      mockRequest.user = {
        userId: '456',
        email: 'organizer@example.com',
        role: 'organizer'
      };

      const middleware = authorize('superadmin');
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 for exhibitor accessing organizer-only route', () => {
      mockRequest.user = {
        userId: '789',
        email: 'exhibitor@example.com',
        role: 'exhibitor'
      };

      const middleware = authorize('organizer');
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('when user is authenticated and authorized', () => {
    it('should call next() for superadmin accessing superadmin route', () => {
      mockRequest.user = {
        userId: '123',
        email: 'admin@example.com',
        role: 'superadmin'
      };

      const middleware = authorize('superadmin');
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should call next() for organizer accessing organizer route', () => {
      mockRequest.user = {
        userId: '456',
        email: 'organizer@example.com',
        role: 'organizer'
      };

      const middleware = authorize('organizer');
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should call next() for exhibitor accessing exhibitor route', () => {
      mockRequest.user = {
        userId: '789',
        email: 'exhibitor@example.com',
        role: 'exhibitor'
      };

      const middleware = authorize('exhibitor');
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should call next() for attendee accessing attendee route', () => {
      mockRequest.user = {
        userId: '101',
        email: 'attendee@example.com',
        role: 'attendee'
      };

      const middleware = authorize('attendee');
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('when multiple roles are allowed', () => {
    it('should allow superadmin when multiple roles specified', () => {
      mockRequest.user = {
        userId: '123',
        email: 'admin@example.com',
        role: 'superadmin'
      };

      const middleware = authorize('superadmin', 'organizer');
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow organizer when multiple roles specified', () => {
      mockRequest.user = {
        userId: '456',
        email: 'organizer@example.com',
        role: 'organizer'
      };

      const middleware = authorize('superadmin', 'organizer');
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny exhibitor when only superadmin and organizer allowed', () => {
      mockRequest.user = {
        userId: '789',
        email: 'exhibitor@example.com',
        role: 'exhibitor'
      };

      const middleware = authorize('superadmin', 'organizer');
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow exhibitor or attendee for customer-facing routes', () => {
      mockRequest.user = {
        userId: '789',
        email: 'exhibitor@example.com',
        role: 'exhibitor'
      };

      const middleware = authorize('exhibitor', 'attendee');
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty allowedRoles array (deny all)', () => {
      mockRequest.user = {
        userId: '123',
        email: 'admin@example.com',
        role: 'superadmin'
      };

      const middleware = authorize();
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should be case-sensitive for role matching', () => {
      mockRequest.user = {
        userId: '123',
        email: 'admin@example.com',
        role: 'superadmin'
      };

      // Case mismatch should deny access
      const middleware = authorize('SuperAdmin');
      
      middleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
