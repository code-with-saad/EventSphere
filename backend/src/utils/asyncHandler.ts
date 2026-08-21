import { Request, Response, NextFunction } from 'express';

/**
 * Async Handler Utility
 * 
 * Wraps async route handlers to automatically catch errors
 * and pass them to Express error handling middleware.
 * 
 * This eliminates the need for try-catch blocks in every route handler.
 * 
 * @param fn Async route handler function
 * @returns Wrapped function that catches errors
 * 
 * @example
 * router.post('/register', asyncHandler(async (req, res) => {
 *   // Your async code here
 *   // Errors will be automatically caught and passed to error middleware
 * }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
