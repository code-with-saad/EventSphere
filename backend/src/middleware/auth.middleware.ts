import { Request, Response, NextFunction } from 'express';
import { verifyToken, DecodedToken } from '../services/token.service';

/**
 * Extended Express Request interface to include authenticated user information
 */
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * Authentication middleware that verifies JWT access token
 * 
 * This middleware:
 * 1. Extracts the Bearer token from the Authorization header
 * 2. Verifies the JWT signature and expiry using the token service
 * 3. Attaches decoded user info (userId, email, role) to req.user
 * 4. Returns 401 for missing, invalid, or expired tokens
 * 5. Adds specific error code TOKEN_EXPIRED for expired tokens
 * 
 * **Validates: Requirements 15.1, 15.2, 15.3**
 * 
 * @param req - Express request object (extended with user property)
 * @param res - Express response object
 * @param next - Express next function
 * @returns 401 Unauthorized if authentication fails, otherwise calls next()
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      });
      return;
    }

    // Remove 'Bearer ' prefix (7 characters)
    const token = authHeader.substring(7);

    // 2. Verify token signature and expiry using token service
    const decoded: DecodedToken = verifyToken(token);

    // 3. Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email || '',
      role: decoded.role || ''
    };

    // Authentication successful, proceed to next middleware
    next();
  } catch (error) {
    // Handle specific token errors
    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        res.status(401).json({
          success: false,
          message: 'Token expired. Please refresh your token.',
          code: 'TOKEN_EXPIRED'
        });
        return;
      }
      
      if (error.message === 'Invalid token') {
        res.status(401).json({
          success: false,
          message: 'Invalid token. Authentication failed.'
        });
        return;
      }
    }

    // Generic error for unexpected failures
    res.status(401).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
}
