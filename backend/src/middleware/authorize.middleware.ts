import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

/**
 * Authorization middleware factory that checks user role against allowed roles
 * 
 * This middleware:
 * 1. Checks if req.user exists (authentication required)
 * 2. Checks if req.user.role is in the allowedRoles array
 * 3. Returns 401 if req.user not present (must use authenticate middleware first)
 * 4. Returns 403 if user role not authorized
 * 
 * **Validates: Requirements 15.4, 15.5**
 * 
 * Usage:
 * ```typescript
 * router.get('/admin/users', 
 *   authenticate, 
 *   authorize('superadmin'), 
 *   handler
 * );
 * 
 * router.get('/organizer/events', 
 *   authenticate, 
 *   authorize('organizer', 'superadmin'), 
 *   handler
 * );
 * ```
 * 
 * @param allowedRoles - Variadic list of roles that are allowed to access the route
 * @returns Express middleware function
 */
export function authorize(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Check if user is authenticated (req.user should be set by authenticate middleware)
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to access this resource.'
      });
      return;
    }

    // Check if user's role is in the allowed roles array
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access forbidden. You do not have permission to access this resource.'
      });
      return;
    }

    // User is authenticated and authorized, proceed to next middleware
    next();
  };
}
