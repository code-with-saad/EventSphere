# Global Error Handler

## Overview

The global error handler provides consistent error responses across the EventSphere backend API. It handles common error types and ensures all errors return a standardized JSON format.

## Features

- **Consistent Error Format**: All errors return `{ success: false, message, code?, errors? }`
- **MongoDB Error Handling**: Handles duplicate key errors (E11000)
- **JWT Error Handling**: Handles invalid and expired tokens
- **Validation Error Handling**: Supports validation error arrays
- **Custom Error Support**: Handles custom errors with statusCode property
- **Production Safety**: Hides internal error details in production
- **404 Handler**: Provides helpful messages for undefined routes

## Error Response Format

```typescript
interface ErrorResponse {
  success: false;        // Always false for errors
  message: string;       // Human-readable error message
  code?: string;         // Optional error code for programmatic handling
  errors?: string[];     // Optional array of validation errors
}
```

## Supported Error Types

### 1. MongoDB Duplicate Key Error (409 Conflict)

**Trigger**: Attempting to create a document with a duplicate unique field (e.g., email)

**Example**:
```typescript
// MongoDB Error:
// E11000 duplicate key error collection: eventsphere.users index: email_1 dup key: { email: "user@example.com" }

// Response:
{
  "success": false,
  "message": "Email already exists",
  "code": "DUPLICATE_KEY"
}
```

### 2. JWT JsonWebTokenError (401 Unauthorized)

**Trigger**: Invalid JWT signature, malformed token, or other JWT-related errors

**Example**:
```typescript
// Error: JsonWebTokenError: invalid signature

// Response:
{
  "success": false,
  "message": "Invalid token. Authentication failed.",
  "code": "INVALID_TOKEN"
}
```

### 3. JWT TokenExpiredError (401 Unauthorized)

**Trigger**: JWT token has expired

**Example**:
```typescript
// Error: TokenExpiredError: jwt expired

// Response:
{
  "success": false,
  "message": "Token expired. Please refresh your token.",
  "code": "TOKEN_EXPIRED"
}
```

**Frontend Usage**: Check for `TOKEN_EXPIRED` code to trigger automatic token refresh.

### 4. Validation Errors (400 Bad Request)

**Trigger**: Application validation failures

**Example**:
```typescript
// Create validation error
const error: any = {
  name: 'ValidationError',
  message: 'Validation failed',
  errors: ['Email is required', 'Password must be at least 8 characters']
};
next(error);

// Response:
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Email is required",
    "Password must be at least 8 characters"
  ]
}
```

### 5. Custom Application Errors

**Trigger**: Custom errors with statusCode property

**Example**:
```typescript
// Create custom error
const error: any = {
  message: 'Resource not found',
  statusCode: 404,
  code: 'NOT_FOUND'
};
next(error);

// Response:
{
  "success": false,
  "message": "Resource not found",
  "code": "NOT_FOUND"
}
```

### 6. Generic Errors (500 Internal Server Error)

**Trigger**: Unexpected errors

**Development Response** (shows actual error message):
```json
{
  "success": false,
  "message": "Database connection failed"
}
```

**Production Response** (hides internal details):
```json
{
  "success": false,
  "message": "An unexpected error occurred. Please try again later."
}
```

### 7. Not Found (404)

**Trigger**: Request to undefined route

**Example**:
```typescript
// Request: GET /api/undefined-route

// Response:
{
  "success": false,
  "message": "Route not found: GET /api/undefined-route",
  "code": "ROUTE_NOT_FOUND"
}
```

## Usage in Routes

### With AsyncHandler

The recommended approach is to use the `asyncHandler` wrapper:

```typescript
import asyncHandler from '../utils/asyncHandler';

router.post('/register', asyncHandler(async (req, res) => {
  // Your async code here
  // Errors are automatically caught and passed to error handler
  
  const user = await UserModel.create(userData);
  res.json({ success: true, data: user });
}));
```

### Explicit Error Handling

You can also explicitly pass errors to the error handler:

```typescript
router.post('/login', async (req, res, next) => {
  try {
    // Your code here
  } catch (error) {
    next(error); // Pass to error handler
  }
});
```

### Throwing Custom Errors

```typescript
router.get('/protected', authenticate, async (req, res, next) => {
  if (!req.user) {
    const error: any = new Error('Authentication required');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return next(error);
  }
  
  // Continue with protected logic
});
```

## Integration in Express App

The error handler must be applied **after all routes** and **as the last middleware**:

```typescript
import express from 'express';
import errorHandler, { notFoundHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler (before error handler)
app.use(notFoundHandler);

// Global error handler (MUST BE LAST)
app.use(errorHandler);
```

## Frontend Error Handling

### Axios Response Interceptor

```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const errorResponse = error.response?.data;
    
    // Check for specific error codes
    if (errorResponse?.code === 'TOKEN_EXPIRED') {
      // Trigger token refresh
      await refreshAccessToken();
      return api(error.config); // Retry request
    }
    
    if (errorResponse?.code === 'INVALID_TOKEN') {
      // Logout user
      logout();
      window.location.href = '/login';
    }
    
    // Show error message to user
    toast.error(errorResponse?.message || 'An error occurred');
    
    return Promise.reject(error);
  }
);
```

### Handling Validation Errors

```typescript
try {
  await api.post('/api/auth/register', formData);
} catch (error) {
  const errorResponse = error.response?.data;
  
  if (errorResponse?.errors) {
    // Display each validation error
    errorResponse.errors.forEach((msg: string) => {
      toast.error(msg);
    });
  } else {
    // Display general error message
    toast.error(errorResponse?.message || 'Registration failed');
  }
}
```

## Testing

### Unit Tests

```typescript
import errorHandler from './error.middleware';

it('should handle MongoDB duplicate key error', () => {
  const error = {
    name: 'MongoError',
    code: 11000,
    message: 'E11000 duplicate key error...'
  };
  
  errorHandler(error, mockReq, mockRes, mockNext);
  
  expect(mockRes.status).toHaveBeenCalledWith(409);
  expect(mockRes.json).toHaveBeenCalledWith({
    success: false,
    message: 'Email already exists',
    code: 'DUPLICATE_KEY'
  });
});
```

### Integration Tests

```typescript
import request from 'supertest';
import app from '../server';

it('should return 404 for undefined routes', async () => {
  const response = await request(app)
    .get('/undefined-route')
    .expect(404);
  
  expect(response.body).toEqual({
    success: false,
    message: 'Route not found: GET /undefined-route',
    code: 'ROUTE_NOT_FOUND'
  });
});
```

## Best Practices

1. **Always use asyncHandler**: Wrap async route handlers to avoid unhandled promise rejections
2. **Never expose sensitive data**: Error messages should not reveal system internals
3. **Use error codes**: Provide `code` field for programmatic error handling on frontend
4. **Log errors**: The error handler logs all errors to console (use proper logging service in production)
5. **Test error paths**: Write tests for both success and error scenarios
6. **Validate early**: Validate input before expensive operations to provide better error messages

## Common Error Scenarios

### Registration with Duplicate Email

```typescript
// User tries to register with existing email
// Automatic: MongoDB duplicate key error caught
// Response: 409 with "Email already exists"
```

### Login with Invalid Token

```typescript
// User sends malformed or tampered JWT
// Automatic: JsonWebTokenError caught
// Response: 401 with "Invalid token"
```

### Expired Access Token

```typescript
// User's access token has expired
// Automatic: TokenExpiredError caught
// Response: 401 with "TOKEN_EXPIRED" code
// Frontend: Triggers automatic token refresh
```

### Form Validation Failures

```typescript
// Multiple form fields fail validation
// Manual: Route creates ValidationError
// Response: 400 with array of error messages
```

## Environment-Specific Behavior

### Development
- Shows actual error messages
- Logs full error stack traces
- Helps with debugging

### Production
- Hides internal error details
- Shows generic messages for 500 errors
- Prevents information leakage

Set `NODE_ENV=production` to enable production error handling.

## Error Handler Files

- **Implementation**: `src/middleware/error.middleware.ts`
- **Unit Tests**: `src/middleware/error.middleware.test.ts`
- **Integration Tests**: `src/middleware/error.integration.test.ts`
- **Documentation**: `src/middleware/ERROR_HANDLER_USAGE.md` (this file)

## Related Middleware

- **Authentication Middleware**: `src/middleware/auth.middleware.ts` (uses error handler for JWT errors)
- **Authorization Middleware**: `src/middleware/authorize.middleware.ts` (uses error handler for 403 errors)
- **Async Handler**: `src/utils/asyncHandler.ts` (wraps routes to catch errors)

## Summary

The global error handler ensures consistent, secure, and user-friendly error responses across the EventSphere API. It handles common error types automatically, supports custom application errors, and provides appropriate error details based on the environment.
