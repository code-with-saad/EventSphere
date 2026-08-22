import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import asyncHandler from './asyncHandler';

describe('asyncHandler', () => {
  it('should call the async function and handle successful resolution', async () => {
    const mockReq = {} as Request;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;
    const mockNext = vi.fn() as NextFunction;

    const asyncFn = vi.fn().mockResolvedValue('success');
    const wrappedFn = asyncHandler(asyncFn);

    await wrappedFn(mockReq, mockRes, mockNext);

    expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled(); // Next should not be called on success
  });

  it('should catch errors and pass them to next middleware', async () => {
    const mockReq = {} as Request;
    const mockRes = {} as Response;
    const mockNext = vi.fn() as NextFunction;

    const testError = new Error('Test error');
    const asyncFn = vi.fn().mockRejectedValue(testError);
    const wrappedFn = asyncHandler(asyncFn);

    await wrappedFn(mockReq, mockRes, mockNext);

    expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(testError);
  });

  it('should handle synchronous errors thrown in async function', async () => {
    const mockReq = {} as Request;
    const mockRes = {} as Response;
    const mockNext = vi.fn() as NextFunction;

    const testError = new Error('Sync error in async function');
    const asyncFn = vi.fn().mockImplementation(async () => {
      throw testError; // Throw inside async function
    });
    const wrappedFn = asyncHandler(asyncFn);

    await wrappedFn(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(testError);
  });

  it('should work with route handlers that return values', async () => {
    const mockReq = {} as Request;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;
    const mockNext = vi.fn() as NextFunction;

    const asyncFn = async (_req: Request, res: Response) => {
      res.status(200).json({ success: true });
    };
    const wrappedFn = asyncHandler(asyncFn);

    await wrappedFn(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle async functions that use next() explicitly', async () => {
    const mockReq = {} as Request;
    const mockRes = {} as Response;
    const mockNext = vi.fn() as NextFunction;

    const asyncFn = async (_req: Request, _res: Response, next: NextFunction) => {
      next(); // Explicitly call next
    };
    const wrappedFn = asyncHandler(asyncFn);

    await wrappedFn(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
