/**
 * USAGE EXAMPLE: Authentication Middleware
 * 
 * This file demonstrates how to use the authentication middleware
 * in your Express routes. DO NOT import or execute this file.
 * It is for reference only.
 */

import express, { Router } from 'express';
import { authenticate, AuthRequest } from './auth.middleware';

// Example 1: Single Protected Route
// ===================================

const router1 = Router();

// Public route - no authentication
router1.get('/api/public/events', (req, res) => {
  res.json({
    success: true,
    data: {
      events: []
    }
  });
});

// Protected route - authentication required
router1.get('/api/profile', authenticate, (req: AuthRequest, res) => {
  // req.user is available here after authentication
  res.json({
    success: true,
    data: {
      userId: req.user!.userId,
      email: req.user!.email,
      role: req.user!.role
    }
  });
});

// Example 2: Protected Route with Database Query
// ==============================================

const router2 = Router();

router2.get('/api/user/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    
    // Fetch user details from database
    // const user = await db.collection('users').findOne({ _id: ObjectId(userId) });
    
    res.json({
      success: true,
      data: {
        // user details
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// Example 3: Multiple Routes with Authentication
// ==============================================

const router3 = Router();

// Apply authentication to all routes in this router
router3.use(authenticate);

// All routes below are protected
router3.get('/api/dashboard', (req: AuthRequest, res) => {
  res.json({
    success: true,
    message: `Welcome ${req.user!.email}`
  });
});

router3.get('/api/settings', (req: AuthRequest, res) => {
  res.json({
    success: true,
    data: {
      userId: req.user!.userId
    }
  });
});

// Example 4: Combining with Authorization Middleware
// ==================================================

const router4 = Router();

// This would come from authorize.middleware.ts (Task 11.2)
// function authorize(...roles: string[]) { ... }

// Only authenticated SuperAdmin can access
// router4.get(
//   '/api/admin/users',
//   authenticate,
//   authorize('superadmin'),
//   (req: AuthRequest, res) => {
//     res.json({
//       success: true,
//       data: {
//         users: []
//       }
//     });
//   }
// );

// Example 5: Error Handling
// =========================

const router5 = Router();

router5.get('/api/secure-data', authenticate, async (req: AuthRequest, res) => {
  try {
    // Check if user has access to requested resource
    const requestedResourceId = req.params.id;
    const userId = req.user!.userId;
    
    // Verify ownership or permissions
    // const hasAccess = await checkUserAccess(userId, requestedResourceId);
    
    // if (!hasAccess) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Access denied to this resource'
    //   });
    // }
    
    res.json({
      success: true,
      data: {
        // resource data
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Example 6: Using AuthRequest Type in Handlers
// =============================================

// Define a typed handler function
async function getMyExpos(req: AuthRequest, res: express.Response) {
  const userId = req.user!.userId;
  
  // Fetch user's expos
  // const expos = await db.collection('expos')
  //   .find({ organizerId: userId })
  //   .toArray();
  
  res.json({
    success: true,
    data: {
      expos: []
    }
  });
}

const router6 = Router();
router6.get('/api/my-expos', authenticate, getMyExpos);

// Example 7: Client Request Format
// ================================

/**
 * When making requests from the frontend, include the Authorization header:
 * 
 * fetch('http://localhost:5000/api/profile', {
 *   method: 'GET',
 *   headers: {
 *     'Authorization': `Bearer ${accessToken}`,
 *     'Content-Type': 'application/json'
 *   }
 * })
 * 
 * Or with Axios:
 * 
 * axios.get('/api/profile', {
 *   headers: {
 *     'Authorization': `Bearer ${accessToken}`
 *   }
 * })
 * 
 * Or configure Axios interceptor to add token automatically:
 * 
 * axios.interceptors.request.use((config) => {
 *   const token = getAccessToken(); // from your auth context
 *   if (token) {
 *     config.headers.Authorization = `Bearer ${token}`;
 *   }
 *   return config;
 * });
 */

// Example 8: Testing Protected Routes
// ===================================

/**
 * Testing with curl:
 * 
 * # Get a token first
 * TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
 *   -H "Content-Type: application/json" \
 *   -d '{"email":"user@example.com","password":"password123"}' \
 *   | jq -r '.data.accessToken')
 * 
 * # Use the token to access protected route
 * curl http://localhost:5000/api/profile \
 *   -H "Authorization: Bearer $TOKEN"
 * 
 * Testing with Postman:
 * 1. Add Authorization header
 * 2. Select "Bearer Token" type
 * 3. Paste your access token
 * 4. Send request
 */

export {
  router1,
  router2,
  router3,
  router4,
  router5,
  router6
};
