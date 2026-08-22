import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import errorHandler, { notFoundHandler } from './error.middleware';

/**
 * Integration tests for error handler middleware
 * 
 * Tests error handler behavior in actual Express app context
 */

describe('Error Handler Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Test route that throws MongoDB duplicate key error
    app.get('/test/duplicate-key', (_req: Request, _res: Response, next: NextFunction) => {
      const error: any = {
        name: 'MongoError',
        code: 11000,
        message: 'E11000 duplicate key error collection: test.users index: email_1 dup key: { email: "duplicate@test.com" }'
      };
      next(error);
    });

    // Test route that throws JWT error
    app.get('/test/jwt-invalid', (_req: Request, _res: Response, next: NextFunction) => {
      next(new JsonWebTokenError('invalid token'));
    });

    // Test route that throws TokenExpiredError
    app.get('/test/jwt-expired', (_req: Request, _res: Response, next: NextFunction) => {
      next(new TokenExpiredError('jwt expired', new Date()));
    });

    // Test route that throws validation error
    app.get('/test/validation', (_req: Request, _res: Response, next: NextFunction) => {
      const error: any = {
        name: 'ValidationError',
        message: 'Validation failed',
        errors: ['Field1 is required', 'Field2 is invalid']
      };
      next(error);
    });

    // Test route that throws custom error
    app.get('/test/custom-error', (_req: Request, _res: Response, next: NextFunction) => {
      const error: any = {
        message: 'Custom error occurred',
        statusCode: 403,
        code: 'FORBIDDEN'
      };
      next(error);
    });

    // Test route that throws generic error
    app.get('/test/generic-error', (_req: Request, _res: Response, next: NextFunction) => {
      next(new Error('Generic error message'));
    });

    // Test route that succeeds (no error)
    app.get('/test/success', (_req: Request, res: Response) => {
      res.json({ success: true, message: 'Success' });
    });

    // Apply 404 handler and error handler (must be last)
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  describe('MongoDB Errors', () => {
    it('should return 409 for duplicate key error', async () => {
      const response = await request(app)
        .get('/test/duplicate-key')
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        message: 'Email already exists',
        code: 'DUPLICATE_KEY'
      });
    });
  });

  describe('JWT Errors', () => {
    it('should return 401 for invalid JWT token', async () => {
      const response = await request(app)
        .get('/test/jwt-invalid')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Invalid token. Authentication failed.',
        code: 'INVALID_TOKEN'
      });
    });

    it('should return 401 with TOKEN_EXPIRED code for expired token', async () => {
      const response = await request(app)
        .get('/test/jwt-expired')
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Token expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED'
      });
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for validation errors', async () => {
      const response = await request(app)
        .get('/test/validation')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Validation failed',
        errors: ['Field1 is required', 'Field2 is invalid']
      });
    });
  });

  describe('Custom Errors', () => {
    it('should handle custom errors with statusCode', async () => {
      const response = await request(app)
        .get('/test/custom-error')
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        message: 'Custom error occurred',
        code: 'FORBIDDEN'
      });
    });
  });

  describe('Generic Errors', () => {
    it('should return 500 for generic errors', async () => {
      const response = await request(app)
        .get('/test/generic-error')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('404 Not Found', () => {
    it('should return 404 for undefined routes', async () => {
      const response = await request(app)
        .get('/this-route-does-not-exist')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Route not found: GET /this-route-does-not-exist',
        code: 'ROUTE_NOT_FOUND'
      });
    });

    it('should not interfere with successful routes', async () => {
      const response = await request(app)
        .get('/test/success')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Success'
      });
    });
  });

  describe('Response Format', () => {
    it('should always return JSON with success: false', async () => {
      const response = await request(app)
        .get('/test/generic-error')
        .expect(500)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
    });

    it('should include code field when applicable', async () => {
      const response = await request(app)
        .get('/test/jwt-expired')
        .expect(401);

      expect(response.body).toHaveProperty('code', 'TOKEN_EXPIRED');
    });

    it('should include errors array when applicable', async () => {
      const response = await request(app)
        .get('/test/validation')
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });
});
