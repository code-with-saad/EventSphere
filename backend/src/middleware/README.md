# Authentication and Authorization Middleware

This directory contains authentication and authorization middleware for the EventSphere backend API.

## Authentication Middleware (`auth.middleware.ts`)

The `authenticate` middleware verifies JWT access tokens and attaches user information to the request.

### Features

- Extracts Bearer token from Authorization header
- Verifies JWT signature and expiry using the token service
- Attaches decoded user info (`userId`, `email`, `role`) to `req.user`
- Returns 401 for missing, invalid, or expired tokens
- Provides specific error code `TOKEN_EXPIRED` for expired tokens

### Requirements Validated

- **Requirement 15.1**: Verify Access_Token on protected endpoints
- **Requirement 15.2**: Return 401 Unauthorized for missing tokens
- **Requirement 15.3**: Return 401 Unauthorized for invalid/expired tokens

### Usage Example

```typescript
import express from 'express';
import { authenticate, AuthRequest } from './middleware/auth.middleware';

const app = express();

// Public endpoint (no authentication required)
app.get('/api/public', (req, res) => {
  res.json({ message: 'This is public' });
});

// Protected endpoint (authentication required)
app.get('/api/protected', authenticate, (req: AuthRequest, res) => {
  // req.user is now available with userId, email, and role
  res.json({
    message: 'This is protected',
    user: req.user
  });
});

// Protected endpoint with additional logic
app.get('/api/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    
    // Fetch user profile from database
    const profile = await getUserProfile(userId);
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});
```

### Request Flow

1. **Client sends request** with Authorization header:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Middleware extracts token** by removing "Bearer " prefix

3. **Middleware verifies token** using `verifyToken()` from token service

4. **Middleware attaches user info** to `req.user`:
   ```typescript
   req.user = {
     userId: "507f1f77bcf86cd799439011",
     email: "user@example.com",
     role: "organizer"
   }
   ```

5. **Middleware calls `next()`** to proceed to route handler

### Error Responses

#### Missing Token (401)
```json
{
  "success": false,
  "message": "Authentication required. No token provided."
}
```

#### Expired Token (401)
```json
{
  "success": false,
  "message": "Token expired. Please refresh your token.",
  "code": "TOKEN_EXPIRED"
}
```

#### Invalid Token (401)
```json
{
  "success": false,
  "message": "Invalid token. Authentication failed."
}
```

#### Generic Error (401)
```json
{
  "success": false,
  "message": "Authentication failed."
}
```

### TypeScript Types

The middleware exports the `AuthRequest` interface that extends Express's `Request`:

```typescript
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}
```

Use this interface in your route handlers to get TypeScript autocomplete and type safety for `req.user`.

### Testing

The middleware includes comprehensive unit tests in `auth.middleware.test.ts`:

- Missing Authorization header
- Invalid Authorization header format
- Valid token verification
- Expired token handling
- Invalid token handling
- Edge cases (missing email/role fields)

Run tests with:
```bash
npm test -- auth.middleware.test.ts
```

### Integration with Authorization Middleware

This middleware is designed to work with the authorization middleware:

```typescript
import { authenticate } from './middleware/auth.middleware';
import { authorize } from './middleware/authorize.middleware';

// Only SuperAdmin can access
app.get('/api/admin/users', 
  authenticate, 
  authorize('superadmin'), 
  adminHandler
);

// Organizers and SuperAdmin can access
app.get('/api/expos', 
  authenticate, 
  authorize('organizer', 'superadmin'), 
  expoHandler
);
```

### Security Considerations

1. **Token Storage**: Tokens should be stored in memory on the client (not localStorage or cookies)
2. **HTTPS Only**: Always use HTTPS in production to prevent token interception
3. **Token Expiry**: Access tokens expire in 15 minutes (configured in token service)
4. **Refresh Flow**: Client should refresh tokens before expiry or on TOKEN_EXPIRED error
5. **No Token Logging**: The middleware never logs token values to prevent leakage

### Related Files

- `../services/token.service.ts` - JWT token generation and verification
- `../services/token.service.test.ts` - Token service unit tests
- `./authorize.middleware.ts` - Role-based authorization (coming next)


---

## Authorization Middleware (`authorize.middleware.ts`)

The `authorize` middleware factory checks if an authenticated user has the required role(s) to access a route.

### Features

- Middleware factory that accepts variadic list of allowed roles
- Checks if `req.user.role` is in the `allowedRoles` array
- Returns 401 if `req.user` not present (authentication required first)
- Returns 403 Forbidden if user role not authorized
- Supports multiple roles per route

### Requirements Validated

- **Requirement 15.4**: Check user's role against required roles
- **Requirement 15.5**: Return 403 Forbidden if role not authorized

### Usage Example

```typescript
import express from 'express';
import { authenticate, AuthRequest } from './middleware/auth.middleware';
import { authorize } from './middleware/authorize.middleware';

const app = express();

// SuperAdmin-only route
app.get('/api/admin/pending-organizers',
  authenticate,              // First verify JWT token
  authorize('superadmin'),   // Then check role
  (req: AuthRequest, res) => {
    res.json({ message: 'SuperAdmin only endpoint' });
  }
);

// Multiple roles allowed (Organizer OR SuperAdmin)
app.get('/api/events',
  authenticate,
  authorize('organizer', 'superadmin'),
  (req: AuthRequest, res) => {
    res.json({ message: 'Organizer or SuperAdmin endpoint' });
  }
);

// Customer-facing route (Exhibitor OR Attendee)
app.get('/api/public/events',
  authenticate,
  authorize('exhibitor', 'attendee'),
  (req: AuthRequest, res) => {
    res.json({ message: 'Exhibitor or Attendee endpoint' });
  }
);

// All authenticated users (any role)
app.get('/api/profile',
  authenticate,
  authorize('superadmin', 'organizer', 'exhibitor', 'attendee'),
  (req: AuthRequest, res) => {
    res.json({ message: 'All authenticated users' });
  }
);
```

### Middleware Order (IMPORTANT!)

The `authorize` middleware **must** come after the `authenticate` middleware:

✅ **CORRECT:**
```typescript
router.get('/route', authenticate, authorize('role'), handler)
```

❌ **INCORRECT:**
```typescript
router.get('/route', authorize('role'), authenticate, handler)
```

The `authorize` middleware expects `req.user` to be set by the `authenticate` middleware. If `authorize` runs first, it will always return 401.

### Error Responses

#### Authentication Required (401)
Returned when `req.user` is not present (authentication middleware not used or failed):
```json
{
  "success": false,
  "message": "Authentication required. Please log in to access this resource."
}
```

#### Access Forbidden (403)
Returned when user is authenticated but doesn't have the required role:
```json
{
  "success": false,
  "message": "Access forbidden. You do not have permission to access this resource."
}
```

### Role-Based Access Control Examples

#### SuperAdmin Routes
Only accessible by users with role `'superadmin'`:
```typescript
router.get('/admin/pending-organizers', authenticate, authorize('superadmin'), handler);
router.patch('/admin/organizers/:id/approve', authenticate, authorize('superadmin'), handler);
router.delete('/admin/organizers/:id/reject', authenticate, authorize('superadmin'), handler);
```

#### Organizer Routes
Only accessible by users with role `'organizer'`:
```typescript
router.get('/organizer/events', authenticate, authorize('organizer'), handler);
router.post('/organizer/events', authenticate, authorize('organizer'), handler);
```

#### Exhibitor Routes
Only accessible by users with role `'exhibitor'`:
```typescript
router.get('/exhibitor/booths', authenticate, authorize('exhibitor'), handler);
```

#### Attendee Routes
Only accessible by users with role `'attendee'`:
```typescript
router.get('/attendee/tickets', authenticate, authorize('attendee'), handler);
```

#### Mixed-Role Routes
Accessible by multiple specific roles:
```typescript
// Superadmin and Organizer can manage events
router.post('/events', authenticate, authorize('superadmin', 'organizer'), handler);

// Exhibitors and Attendees can browse public events
router.get('/public/events', authenticate, authorize('exhibitor', 'attendee'), handler);

// All roles can access profile
router.get('/profile', authenticate, authorize('superadmin', 'organizer', 'exhibitor', 'attendee'), handler);
```

### Testing

The middleware includes comprehensive unit tests in `authorize.middleware.test.ts`:

- User not authenticated (req.user undefined/null)
- User authenticated but not authorized (wrong role)
- User authenticated and authorized (correct role)
- Multiple roles allowed
- Edge cases (empty allowedRoles, case sensitivity)

Run tests with:
```bash
npm test -- authorize.middleware.test.ts --run
```

All 15 tests should pass.

### Security Considerations

1. **Always use authenticate first**: The authorize middleware depends on req.user being set
2. **Role case-sensitivity**: Role matching is case-sensitive ('superadmin' !== 'SuperAdmin')
3. **Principle of least privilege**: Only grant access to roles that actually need it
4. **Empty allowedRoles**: If no roles are specified, all users are denied (403)

### Related Files

- `./auth.middleware.ts` - JWT authentication middleware (must be used before this)
- `./AUTHORIZE_USAGE_EXAMPLE.ts` - Comprehensive usage examples
- `./authorize.middleware.test.ts` - Unit tests
