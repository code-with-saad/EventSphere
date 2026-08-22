import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { MongoError } from 'mongodb';
import errorHandler, { notFoundHandler } from './error.middleware';

/**
 * Test suite for global error handler middleware
 * 
 * Tests:
 * - MongoDB duplicate key errors (409)
 * - JWT errors: JsonWebTokenError (401), TokenExpiredError (401 with code)
 * - Validation errors (400)
 * - Default errors (500)
 * - Not found handler (404)
 */

describe('Error Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: any;
  let jsonMock: any;

  beforeEach(() => {
    // Reset mocks before each test
    mockRequest = {
      method: 'GET',
      originalUrl: '/test'
    };

    statusMock = vi.fn().mockReturnThis();
    jsonMock = vi.fn();

    mockResponse = {
      status: statusMock,
      json: jsonMock
    };

    mockNext = vi.fn();

    // Suppress console.error during tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('errorHandler', () => {
    it('should handle MongoDB duplicate key error (E11000) with 409 status', () => {
      const duplicateKeyError: any = {
        name: 'MongoError',
        code: 11000,
        message: 'E11000 duplicate key error collection: eventsphere.users index: email_1 dup key: { email: "test@example.com" }'
      };

      errorHandler(
        duplicateKeyError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Email already exists',
        code: 'DUPLICATE_KEY'
      });
    });

    it('should handle MongoDB duplicate key error without field name', () => {
      const duplicateKeyError: any = {
        name: 'MongoError',
        code: 11000,
        message: 'E11000 duplicate key error'
      };

      errorHandler(
        duplicateKeyError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Field already exists',
        code: 'DUPLICATE_KEY'
      });
    });

    it('should handle JsonWebTokenError with 401 status', () => {
      const jwtError = new JsonWebTokenError('invalid signature');

      errorHandler(
        jwtError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token. Authentication failed.',
        code: 'INVALID_TOKEN'
      });
    });

    it('should handle TokenExpiredError with 401 status and TOKEN_EXPIRED code', () => {
      const expiredError = new TokenExpiredError('jwt expired', new Date());

      errorHandler(
        expiredError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Token expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED'
      });
    });

    it('should handle ValidationError with 400 status', () => {
      const validationError: any = {
        name: 'ValidationError',
        message: 'Validation failed',
        errors: ['Email is required', 'Password is too short']
      };

      errorHandler(
        validationError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: ['Email is required', 'Password is too short']
      });
    });

    it('should handle ValidationError without errors array', () => {
      const validationError: any = {
        name: 'ValidationError',
        message: 'Invalid input'
      };

      errorHandler(
        validationError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: ['Invalid input']
      });
    });

    it('should handle custom errors with statusCode property', () => {
      const customError: any = {
        message: 'Resource not found',
        statusCode: 404,
        code: 'NOT_FOUND'
      };

      errorHandler(
        customError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Resource not found',
        code: 'NOT_FOUND'
      });
    });

    it('should handle custom errors with errors array', () => {
      const customError: any = {
        message: 'Multiple validation errors',
        statusCode: 400,
        errors: ['Error 1', 'Error 2']
      };

      errorHandler(
        customError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Multiple validation errors',
        errors: ['Error 1', 'Error 2']
      });
    });

    it('should handle default errors with 500 status in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const genericError = new Error('Something went wrong');

      errorHandler(
        genericError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Something went wrong'
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should hide error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const genericError = new Error('Internal database error');

      errorHandler(
        genericError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'An unexpected error occurred. Please try again later.'
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle errors without message', () => {
      const unknownError: any = {};

      errorHandler(
        unknownError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'An unexpected error occurred. Please try again later.'
      });
    });
  });

  describe('notFoundHandler', () => {
    it('should create 404 error for undefined routes', () => {
      mockRequest = {
        method: 'POST',
        originalUrl: '/api/undefined-route'
      };

      notFoundHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route not found: POST /api/undefined-route',
          statusCode: 404,
          code: 'ROUTE_NOT_FOUND'
        })
      );
    });

    it('should pass error to next middleware', () => {
      notFoundHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
