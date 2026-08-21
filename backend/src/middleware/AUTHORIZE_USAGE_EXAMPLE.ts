/**
 * Usage Examples for Authorization Middleware
 * 
 * This file demonstrates how to use the authorize middleware
 * to protect routes based on user roles.
 */

import express, { Request, Response } from 'express';
import { authenticate } from './auth.middleware';
import { authorize } from './authorize.middleware';

const router = express.Router();

// Example 1: SuperAdmin-only route
// Only users with role 'superadmin' can access this route
router.get(
  '/admin/pending-organizers',
  authenticate,              // First verify JWT token
  authorize('superadmin'),   // Then check role
  (req: Request, res: Response) => {
    res.json({ message: 'SuperAdmin only endpoint' });
  }
);

// Example 2: Organizer-only route
// Only users with role 'organizer' can access this route
router.get(
  '/organizer/events',
  authenticate,
  authorize('organizer'),
  (req: Request, res: Response) => {
    res.json({ message: 'Organizer only endpoint' });
  }
);

// Example 3: Multiple roles allowed
// Both 'superadmin' and 'organizer' can access this route
router.get(
  '/events',
  authenticate,
  authorize('superadmin', 'organizer'),
  (req: Request, res: Response) => {
    res.json({ message: 'SuperAdmin or Organizer endpoint' });
  }
);

// Example 4: Customer-facing route (Exhibitor and Attendee)
// Both 'exhibitor' and 'attendee' roles can access this route
router.get(
  '/public/events',
  authenticate,
  authorize('exhibitor', 'attendee'),
  (req: Request, res: Response) => {
    res.json({ message: 'Exhibitor or Attendee endpoint' });
  }
);

// Example 5: All authenticated users
// Any authenticated user regardless of role can access this route
router.get(
  '/profile',
  authenticate,
  authorize('superadmin', 'organizer', 'exhibitor', 'attendee'),
  (req: Request, res: Response) => {
    res.json({ message: 'All authenticated users endpoint' });
  }
);

// Example 6: Approval endpoint (SuperAdmin only)
router.patch(
  '/admin/organizers/:id/approve',
  authenticate,
  authorize('superadmin'),
  (req: Request, res: Response) => {
    const { id } = req.params;
    // Approval logic here
    res.json({ message: `Organizer ${id} approved` });
  }
);

// Example 7: Rejection endpoint (SuperAdmin only)
router.delete(
  '/admin/organizers/:id/reject',
  authenticate,
  authorize('superadmin'),
  (req: Request, res: Response) => {
    const { id } = req.params;
    // Rejection logic here
    res.json({ message: `Organizer ${id} rejected` });
  }
);

/**
 * IMPORTANT: Order matters!
 * 
 * Always use authentication middleware BEFORE authorization middleware:
 * 
 * ✅ CORRECT:
 * router.get('/route', authenticate, authorize('role'), handler)
 * 
 * ❌ INCORRECT:
 * router.get('/route', authorize('role'), authenticate, handler)
 * 
 * The authorize middleware expects req.user to be set by the authenticate
 * middleware. If authorize runs first, it will always return 401.
 */

/**
 * Error Responses:
 * 
 * 401 Unauthorized - When req.user is not present (authentication failed)
 * {
 *   success: false,
 *   message: 'Authentication required. Please log in to access this resource.'
 * }
 * 
 * 403 Forbidden - When user is authenticated but doesn't have required role
 * {
 *   success: false,
 *   message: 'Access forbidden. You do not have permission to access this resource.'
 * }
 */

export default router;
