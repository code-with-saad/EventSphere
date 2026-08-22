import { describe, it, expect } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import asyncHandler from './asyncHandler';
import errorHandler from '../middleware/error.middleware';

describe('asyncHandler integration with error middleware', () => {
  it('should catch async errors and pass them to error middleware', async () => {
    const app = express();

    // Route that throws an error
    app.get('/test-error', asyncHandler(async (_req: Request, _res: Response) => {
      throw new Error('Test async error');
    }));

    // Apply error middleware
    app.use(errorHandler);

    const response = await request(app).get('/test-error');

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      success: false,
      message: expect.stringContaining('Test async error')
    });
  });

  it('should handle successful async responses', async () => {
    const app = express();

    app.get('/test-success', asyncHandler(async (_req: Request, res: Response) => {
      res.status(200).json({ success: true, data: 'test data' });
    }));

    app.use(errorHandler);

    const response = await request(app).get('/test-success');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: 'test data'
    });
  });

  it('should handle async database-like errors with custom status codes', async () => {
    const app = express();

    app.get('/test-custom-error', asyncHandler(async (_req: Request, _res: Response) => {
      const error: any = new Error('User not found');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }));

    app.use(errorHandler);

    const response = await request(app).get('/test-custom-error');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      message: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  });

  it('should handle validation errors', async () => {
    const app = express();

    app.post('/test-validation', asyncHandler(async (_req: Request, _res: Response) => {
      const error: any = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = ['Email is required', 'Password is too short'];
      throw error;
    }));

    app.use(errorHandler);

    const response = await request(app).post('/test-validation');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Validation failed',
      errors: ['Email is required', 'Password is too short']
    });
  });

  it('should work with async middleware chain', async () => {
    const app = express();

    // First middleware
    const middleware1 = asyncHandler(async (_req: Request, _res: Response, next: NextFunction) => {
      // Simulate some async operation
      await Promise.resolve();
      next();
    });

    // Second middleware
    const middleware2 = asyncHandler(async (_req: Request, _res: Response, next: NextFunction) => {
      // Simulate some async operation
      await Promise.resolve();
      next();
    });

    // Final handler
    const handler = asyncHandler(async (_req: Request, res: Response) => {
      res.status(200).json({ success: true, message: 'All middleware executed' });
    });

    app.get('/test-chain', middleware1, middleware2, handler);
    app.use(errorHandler);

    const response = await request(app).get('/test-chain');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'All middleware executed'
    });
  });

  it('should catch errors in middleware chain', async () => {
    const app = express();

    // First middleware passes
    const middleware1 = asyncHandler(async (_req: Request, _res: Response, next: NextFunction) => {
      await Promise.resolve();
      next();
    });

    // Second middleware throws error
    const middleware2 = asyncHandler(async (_req: Request, _res: Response) => {
      throw new Error('Middleware error');
    });

    app.get('/test-chain-error', middleware1, middleware2);
    app.use(errorHandler);

    const response = await request(app).get('/test-chain-error');

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      success: false,
      message: expect.stringContaining('Middleware error')
    });
  });
});
