import { Router, Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import UserModel from '../models/User.model';
import { hashPassword, validatePassword } from '../utils/password.utils';
import { createOTPService } from '../services/otp.service';
import { createEmailService } from '../services/email.service';
import { getDatabase } from '../config/database';

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

export default router;
