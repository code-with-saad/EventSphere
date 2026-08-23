import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import asyncHandler from '../utils/asyncHandler';
import UserModel from '../models/User.model';
import { hashPassword, validatePassword, comparePassword } from '../utils/password.utils';
import { createOTPService } from '../services/otp.service';
import { createEmailService } from '../services/email.service';
import { getDatabase } from '../config/database';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../services/token.service';
import { createRefreshToken, findRefreshTokenByHash, invalidateRefreshToken } from '../models/RefreshToken.model';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/auth/register
 * 
 * Register a new user account
 * 
 * Requirements:
 * - 5.1: Accept email, password, fullName, role
 * - 5.2: Validate email format
 * - 5.3: Validate password length (min 8 characters)
 * - 5.4: Hash password before storing
 * - 5.5: Reject SuperAdmin role registration (return 403)
 * - 5.6: Check for duplicate email (return 409)
 * - 5.7: Organizer: status='pending', no OTP
 * - 5.8: Exhibitor/Attendee: status='active', isEmailVerified=false, send OTP
 * - 5.9: Return appropriate success message based on role
 */
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, fullName, role } = req.body;

  // Validate required fields
  if (!email || !password || !fullName || !role) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: email, password, fullName, role'
    });
  }

  // Validate email format (basic validation, UserModel will do more thorough check)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  // Validate password length (Requirement 5.3)
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      message: passwordValidation.error || 'Invalid password'
    });
  }

  // Validate role (Requirement 5.5 - Reject SuperAdmin)
  const validRoles = ['organizer', 'exhibitor', 'attendee'];
  if (!validRoles.includes(role.toLowerCase())) {
    if (role.toLowerCase() === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'SuperAdmin role registration is not allowed'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Invalid role. Must be one of: organizer, exhibitor, attendee'
    });
  }

  // Normalize role to lowercase
  const normalizedRole = role.toLowerCase();

  // Check for duplicate email (Requirement 5.6)
  const existingUser = await UserModel.existsByEmail(email);
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Email already registered'
    });
  }

  // Hash password (Requirement 5.4)
  const passwordHash = await hashPassword(password);

  // Create user based on role (Requirements 5.7, 5.8)
  if (normalizedRole === 'organizer') {
    // Organizer: status = 'pending', no OTP verification needed
    const user = await UserModel.create({
      email,
      passwordHash,
      fullName,
      role: normalizedRole,
      status: 'pending',
      isEmailVerified: false
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Your account is awaiting SuperAdmin approval.',
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status
      }
    });
  } else {
    // Exhibitor/Attendee: status = 'active', isEmailVerified = false, send OTP
    const user = await UserModel.create({
      email,
      passwordHash,
      fullName,
      role: normalizedRole,
      status: 'active',
      isEmailVerified: false
    });

    // Generate and send OTP
    try {
      const db = getDatabase();
      const otpService = createOTPService(db);
      const emailService = createEmailService();

      const otp = await otpService.createOTPRecord(email, 'registration');
      await emailService.sendOTPEmail(email, otp, 'registration');

      return res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email for the verification code.',
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          isEmailVerified: user.isEmailVerified
        }
      });
    } catch (otpError: any) {
      // If OTP generation or email sending fails, we should still consider the user registered
      // but inform them to use the resend OTP functionality
      console.error('Failed to send OTP email:', otpError);
      
      return res.status(201).json({
        success: true,
        message: 'Registration successful, but failed to send verification email. Please use the resend OTP option.',
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          status: user.status,
          isEmailVerified: user.isEmailVerified
        }
      });
    }
  }
}));

/**
 * POST /api/auth/verify-otp
 * 
 * Verify OTP for Exhibitor or Attendee registration
 * 
 * Requirements:
 * - 7.1: Accept email, otp, purpose in request body
 * - 7.2: Set isEmailVerified to true and status to active
 * - 7.3: Return error for expired OTP
 * - 7.4: Return error for invalid OTP
 * - 7.5: Return error for already verified account
 * - 7.6: Delete OTP record after successful verification
 */
router.post('/verify-otp', asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, purpose } = req.body;

  // Validate required fields
  if (!email || !otp || !purpose) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: email, otp, purpose'
    });
  }

  // Validate purpose
  if (purpose !== 'registration' && purpose !== 'password_reset') {
    return res.status(400).json({
      success: false,
      message: 'Invalid purpose. Must be "registration" or "password_reset"'
    });
  }

  // Find user by email
  const user = await UserModel.findByEmail(email);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if account is already verified (Requirement 7.5)
  if (purpose === 'registration' && user.isEmailVerified) {
    return res.status(409).json({
      success: false,
      message: 'Account already verified'
    });
  }

  // Verify OTP using OTP service
  try {
    const db = getDatabase();
    const otpService = createOTPService(db);

    // This will throw if OTP is expired, return false if invalid
    const isValid = await otpService.verifyAndDeleteOTP(email, otp, purpose);

    if (!isValid) {
      // Invalid OTP (Requirement 7.4)
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // OTP is valid, update user (Requirements 7.2, 7.6)
    if (purpose === 'registration') {
      await UserModel.updateById(user._id, {
        isEmailVerified: true,
        status: 'active'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
      data: {
        userId: user._id,
        isEmailVerified: true
      }
    });

  } catch (error: any) {
    // Handle expired OTP error (Requirement 7.3)
    if (error.message === 'OTP has expired') {
      return res.status(401).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    // Check if OTP record doesn't exist
    console.error('OTP verification error:', error);
    return res.status(404).json({
      success: false,
      message: 'No pending OTP found'
    });
  }
}));

/**
 * POST /api/auth/resend-otp
 * 
 * Resend OTP for email verification or password reset
 * 
 * Requirements:
 * - 6.5: Accept email and purpose in request body
 * - 6.6: Check resend count (max 3 attempts, return 429 if exceeded)
 * - Generate new OTP and update existing OTP record (increment resendCount, new otpHash, new expiresAt)
 * - Send OTP email via Resend
 * - Return success with remaining attempts count
 */
router.post('/resend-otp', asyncHandler(async (req: Request, res: Response) => {
  const { email, purpose } = req.body;

  // Validate required fields
  if (!email || !purpose) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: email, purpose'
    });
  }

  // Validate purpose
  if (purpose !== 'registration' && purpose !== 'password_reset') {
    return res.status(400).json({
      success: false,
      message: 'Invalid purpose. Must be "registration" or "password_reset"'
    });
  }

  try {
    const db = getDatabase();
    const otpService = createOTPService(db);
    const emailService = createEmailService();

    // Check if an OTP record exists for this email and purpose
    const hasReachedLimit = await otpService.hasReachedResendLimit(email, purpose);
    
    if (hasReachedLimit) {
      // Requirement 6.6: Return 429 if max resend attempts exceeded
      return res.status(429).json({
        success: false,
        message: 'Maximum OTP resend attempts exceeded'
      });
    }

    // Check if user exists (for registration purpose)
    if (purpose === 'registration') {
      const user = await UserModel.findByEmail(email);
      
      // If no user found, return generic error (don't reveal if account exists)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No pending OTP found'
        });
      }

      // Check if account is already verified
      if (user.isEmailVerified) {
        return res.status(409).json({
          success: false,
          message: 'Account already verified'
        });
      }
    }

    // Generate new OTP (this will update existing record or throw if limit reached)
    const otp = await otpService.createOTPRecord(email, purpose);
    
    // Send OTP email
    await emailService.sendOTPEmail(email, otp, purpose);

    // Get remaining attempts
    const remainingAttempts = await otpService.getRemainingAttempts(email, purpose);
    
    // Calculate resend count (3 - remaining)
    const resendCount = 3 - remainingAttempts;

    return res.status(200).json({
      success: true,
      message: 'OTP resent successfully.',
      data: {
        otpExpiresIn: 300, // 5 minutes in seconds
        resendCount: resendCount,
        remainingAttempts: remainingAttempts
      }
    });

  } catch (error: any) {
    console.error('OTP resend error:', error);

    // Handle maximum attempts exceeded error
    if (error.message === 'Maximum OTP resend attempts exceeded') {
      return res.status(429).json({
        success: false,
        message: 'Maximum OTP resend attempts exceeded'
      });
    }

    // Handle email send failure
    if (error.message.includes('Failed to send OTP email')) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email. Please try again later.'
      });
    }

    // Generic server error
    return res.status(500).json({
      success: false,
      message: 'An error occurred while resending OTP. Please try again later.'
    });
  }
}));

/**
 * POST /api/auth/login
 * 
 * Authenticate user and issue tokens
 * 
 * Requirements:
 * - 8.1: Accept email and password in request body
 * - 8.2: Verify password with bcrypt compare
 * - 8.3: Return 401 for invalid credentials
 * - 8.4: Return 403 for pending status (Organizer awaiting approval)
 * - 8.4: Return 403 for unverified email (Exhibitor/Attendee)
 * - 8.5: Generate access token (15-minute expiry)
 * - 8.6: Generate refresh token (7-day expiry)
 * - 8.7: Return both tokens in response body
 * - 8.8: Access token includes userId, email, and role in payload
 * - 8.9: Store refresh token hash in database with userId and creation timestamp
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: email, password'
    });
  }

  // Find user by email (Requirement 8.1)
  const user = await UserModel.findByEmail(email);
  
  // Return 401 if user not found (Requirement 8.3)
  // Generic message to prevent email enumeration
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Verify password with bcrypt compare (Requirement 8.2)
  const isPasswordValid = await comparePassword(password, user.passwordHash);
  
  // Return 401 if password invalid (Requirement 8.3)
  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Check user status: return 403 if pending (Requirement 8.4)
  // Organizer awaiting SuperAdmin approval
  if (user.status === 'pending') {
    return res.status(403).json({
      success: false,
      message: 'Account pending approval',
      code: 'PENDING_APPROVAL'
    });
  }

  // Check user status: return 403 if suspended
  if (user.status === 'suspended') {
    return res.status(403).json({
      success: false,
      message: 'Account has been suspended',
      code: 'ACCOUNT_SUSPENDED'
    });
  }

  // Check email verification: return 403 if not verified (Requirement 8.4)
  // Applies to Exhibitor/Attendee roles
  if (!user.isEmailVerified && (user.role === 'exhibitor' || user.role === 'attendee')) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email before logging in',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }

  // Generate access token with 15-minute expiry (Requirements 8.5, 8.8)
  const accessToken = generateAccessToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role
  });

  // Generate refresh token with 7-day expiry (Requirement 8.6)
  const refreshToken = generateRefreshToken({
    userId: user._id.toString(),
    type: 'refresh'
  });

  // Hash the refresh token for storage (Requirement 8.9)
  const refreshTokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  // Store refresh token hash in database (Requirement 8.9)
  // Calculate expiry: 7 days from now
  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

  try {
    await createRefreshToken(
      new ObjectId(user._id),
      refreshTokenHash,
      refreshTokenExpiry
    );
  } catch (error) {
    console.error('Failed to store refresh token:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete login. Please try again.'
    });
  }

  // Return user object (without passwordHash) and both tokens (Requirement 8.7)
  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified
      },
      accessToken,
      refreshToken
    }
  });
}));


/**
 * POST /api/auth/refresh
 * 
 * Refresh access token using refresh token
 * 
 * Requirements:
 * - 9.3: Automatically call token refresh endpoint when Access_Token expires
 * - 9.4: Accept Refresh_Token via Authorization header
 * - 9.5: Generate new Access_Token when valid Refresh_Token submitted
 * - 9.6: Generate new Refresh_Token when valid Refresh_Token submitted
 * - 9.7: Invalidate old Refresh_Token when new tokens issued
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  // Extract refresh token from Authorization header (Requirement 9.4)
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token is required',
      code: 'MISSING_REFRESH_TOKEN'
    });
  }

  const refreshToken = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verify refresh token signature and expiry (Requirement 9.4)
    const decoded = verifyToken(refreshToken);
    
    // Ensure this is a refresh token (not an access token)
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    // Hash the refresh token to look it up in database
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Find refresh token in database by hash (Requirement 9.4)
    const tokenRecord = await findRefreshTokenByHash(refreshTokenHash);

    if (!tokenRecord) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Check if token is valid (return 401 if already rotated) (Requirement 9.7)
    if (!tokenRecord.isValid) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }

    // Get user details for new access token
    const user = await UserModel.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user account is still active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'User account is not active',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Mark old refresh token as invalid (Requirement 9.7)
    await invalidateRefreshToken(refreshTokenHash);

    // Generate new access token with 15-minute expiry (Requirement 9.5)
    const newAccessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    });

    // Generate new refresh token with 7-day expiry (Requirement 9.6)
    const newRefreshToken = generateRefreshToken({
      userId: user._id.toString(),
      type: 'refresh'
    });

    // Hash the new refresh token for storage
    const newRefreshTokenHash = crypto
      .createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');

    // Store new refresh token hash in database (Requirement 9.6)
    const newRefreshTokenExpiry = new Date();
    newRefreshTokenExpiry.setDate(newRefreshTokenExpiry.getDate() + 7);

    try {
      await createRefreshToken(
        new ObjectId(user._id),
        newRefreshTokenHash,
        newRefreshTokenExpiry
      );
    } catch (error) {
      console.error('Failed to store new refresh token:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to refresh token. Please login again.'
      });
    }

    // Return both new tokens (Requirement 9.6)
    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error: any) {
    console.error('Token refresh error:', error);

    // Handle token expiry
    if (error.message === 'Token expired') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Handle invalid token
    if (error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        code: 'INVALID_TOKEN'
      });
    }

    // Generic server error
    return res.status(500).json({
      success: false,
      message: 'An error occurred while refreshing token. Please login again.'
    });
  }
}));

/**
 * POST /api/auth/logout
 * 
 * Invalidate refresh token (logout)
 * 
 * Requirements:
 * - Require authentication middleware
 * - Accept refreshToken in request body
 * - Mark refresh token as invalid in database: { isValid: false }
 * - Return success message
 */
router.post('/logout', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;

  // Validate refresh token is provided
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  try {
    // Hash the refresh token to look it up in database
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Mark refresh token as invalid in database
    const invalidated = await invalidateRefreshToken(refreshTokenHash);

    if (!invalidated) {
      // Token not found in database, but still consider logout successful
      // (client can clear tokens on their side)
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    }

    // Return success message
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error: any) {
    console.error('Logout error:', error);
    
    // Even if there's an error, return success since client should clear tokens
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
}));


/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's profile.
 * Used by the frontend on page reload to restore session state after
 * a successful silent token refresh.
 *
 * Requires: valid access token in Authorization header.
 */
router.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated',
      code: 'NOT_AUTHENTICATED'
    });
  }

  const user = await UserModel.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'User profile retrieved successfully',
    data: {
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified
      }
    }
  });
}));

/**
 * POST /api/auth/forgot-password/request
 * Request password reset via email
 * Requirements: 12.1-12.7
 */
router.post('/forgot-password/request', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }

  try {
    const user = await UserModel.findByEmail(email);
    
    const successResponse = {
      success: true,
      message: 'If an account exists, a password reset OTP has been sent to your email'
    };

    if (!user) {
      return res.status(200).json(successResponse);
    }

    const db = getDatabase();
    const otpService = createOTPService(db);
    const emailService = createEmailService();

    const otp = await otpService.createOTPRecord(email, 'password_reset');
    await emailService.sendOTPEmail(email, otp, 'password_reset');

    return res.status(200).json(successResponse);

  } catch (error: any) {
    console.error('Password reset request error:', error);
    return res.status(200).json({
      success: true,
      message: 'If an account exists, a password reset OTP has been sent to your email'
    });
  }
}));

/**
 * POST /api/auth/forgot-password/verify-otp
 * Verify OTP for password reset
 * Requirements: 13.1-13.8
 */
router.post('/forgot-password/verify-otp', asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Email and OTP are required'
    });
  }

  try {
    const user = await UserModel.findByEmail(email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const db = getDatabase();
    const otpService = createOTPService(db);

    const isValid = await otpService.verifyAndDeleteOTP(email, otp, 'password_reset');

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    const resetToken = generateAccessToken({
      userId: user._id.toString(),
      purpose: 'password_reset'
    });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        resetToken,
        expiresIn: 600
      }
    });

  } catch (error: any) {
    if (error.message === 'OTP has expired') {
      return res.status(401).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    console.error('OTP verification error:', error);
    return res.status(404).json({
      success: false,
      message: 'No pending OTP found'
    });
  }
}));

/**
 * POST /api/auth/forgot-password/reset
 * Reset password with reset token
 * Requirements: 14.1-14.8
 */
router.post('/forgot-password/reset', asyncHandler(async (req: Request, res: Response) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Reset token and new password are required'
    });
  }

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      message: passwordValidation.error || 'Invalid password'
    });
  }

  try {
    const decoded = verifyToken(resetToken);
    
    if (decoded.purpose !== 'password_reset') {
      return res.status(401).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    const user = await UserModel.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await UserModel.updateById(user._id, {
      passwordHash: newPasswordHash
    });

    const db = getDatabase();
    await db.collection('refresh_tokens').updateMany(
      { userId: new ObjectId(user._id) },
      { $set: { isValid: false } }
    );

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });

  } catch (error: any) {
    if (error.message === 'Token expired') {
      return res.status(401).json({
        success: false,
        message: 'Reset token has expired. Please request a new password reset.'
      });
    }

    console.error('Password reset error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired reset token'
    });
  }
}));

router.post('/forgot-password/resend-otp', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }

  try {
    const user = await UserModel.findByEmail(email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const db = getDatabase();
    const otpService = createOTPService(db);
    const emailService = createEmailService();

    const hasReachedLimit = await otpService.hasReachedResendLimit(email, 'password_reset');
    
    if (hasReachedLimit) {
      return res.status(429).json({
        success: false,
        message: 'Maximum OTP resend attempts exceeded'
      });
    }

    const otp = await otpService.createOTPRecord(email, 'password_reset');
    await emailService.sendOTPEmail(email, otp, 'password_reset');

    const remainingAttempts = await otpService.getRemainingAttempts(email, 'password_reset');
    
    return res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        otpExpiresIn: 300,
        remainingAttempts
      }
    });

  } catch (error: any) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend OTP'
    });
  }
}));

export default router;

