import { Request, Response, NextFunction } from 'express';
import { MongoError } from 'mongodb';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

/**
 * Global Error Handler Middleware
 * 
 * Provides consistent error responses across the application
 * 
 * Requirements:
 * - Handle MongoDB duplicate key errors (409)
 * - Handle JWT errors: JsonWebTokenError (401), TokenExpiredError (401 with code)
 * - Default error: 500 with generic message
 * - Return consistent error response format: { success: false, message, code?, errors? }
 */

interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: string[];
}

/**
 * Type guard to check if error is a MongoDB error
 */
function isMongoError(error: any): error is MongoError {
  return error && typeof error === 'object' && 'code' in error;
}

/**
 * Global error handler middleware
 * Must be applied as the last middleware in Express app
 * 
 * @param err - Error object
 * @param _req - Express request (unused, but required for Express error middleware signature)
 * @param res - Express response
 * @param _next - Express next function (unused, but required for Express error middleware signature)
 */
export default function errorHandler(
  err: Error | MongoError | JsonWebTokenError | TokenExpiredError | any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error for debugging (in production, use proper logging service)
  console.error('Error:', err);

  let statusCode = 500;
  let response: ErrorResponse = {
    success: false,
    message: 'An unexpected error occurred. Please try again later.'
  };

  // Handle MongoDB duplicate key error (E11000)
  // Example: Duplicate email registration
  if (isMongoError(err) && err.code === 11000) {
    statusCode = 409;
    
    // Extract field name from error message
    // MongoDB error format: "E11000 duplicate key error collection: db.users index: email_1 dup key: { email: "test@example.com" }"
    const match = err.message.match(/index: (\w+)_/);
    const fieldName = match ? match[1] : 'field';
    
    response = {
      success: false,
      message: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} already exists`,
      code: 'DUPLICATE_KEY'
    };
  }
  
  // Handle JWT JsonWebTokenError (invalid signature, malformed token, etc.)
  else if (err instanceof JsonWebTokenError && !(err instanceof TokenExpiredError)) {
    statusCode = 401;
    response = {
      success: false,
      message: 'Invalid token. Authentication failed.',
      code: 'INVALID_TOKEN'
    };
  }
  
  // Handle JWT TokenExpiredError (token has expired)
  else if (err instanceof TokenExpiredError) {
    statusCode = 401;
    response = {
      success: false,
      message: 'Token expired. Please refresh your token.',
      code: 'TOKEN_EXPIRED'
    };
  }
  
  // Handle validation errors (custom application validation)
  // These typically come from route handlers with explicit validation
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    response = {
      success: false,
      message: 'Validation failed',
      errors: err.errors || [err.message]
    };
  }
  
  // Handle MongoDB validation errors (schema-level validation if using Mongoose-like patterns)
  // Note: Native MongoDB driver doesn't have built-in validation like Mongoose
  // This is here for future extensibility if validation library is added
  else if (err.name === 'MongoServerError' && err.message.includes('validation')) {
    statusCode = 400;
    response = {
      success: false,
      message: 'Validation failed',
      errors: [err.message]
    };
  }
  
  // Handle custom application errors with statusCode property
  else if (err.statusCode) {
    statusCode = err.statusCode;
    response = {
      success: false,
      message: err.message || 'An error occurred',
      ...(err.code && { code: err.code }),
      ...(err.errors && { errors: err.errors })
    };
  }
  
  // Default error (500 Internal Server Error)
  else if (err.message) {
    // In production, don't expose internal error messages
    // For now, showing error message for development clarity
    response.message = process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred. Please try again later.'
      : err.message;
  }

  // Send error response
  res.status(statusCode).json(response);
}

/**
 * Not Found Handler
 * 
 * Handles requests to undefined routes
 * Should be placed before the error handler middleware
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  const error: any = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
}
