import bcrypt from 'bcrypt';
import { Db } from 'mongodb';
import { OTPModel } from '../models/OTP.model';

/**
 * Number of salt rounds for bcrypt hashing
 * Consistent with password.utils.ts pattern
 */
const SALT_ROUNDS = 10;

/**
 * OTP expiry duration in milliseconds (5 minutes)
 */
const OTP_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Maximum OTP resend attempts
 */
const MAX_RESEND_ATTEMPTS = 3;

/**
 * OTP Service Class
 * Handles OTP generation, verification, and management
 */

/**
 * DEV OTP BYPASS — development-only console logger.
 *
 * Rules:
 *  - Only activates when DEV_OTP_BYPASS=true AND NODE_ENV !== 'production'
 *  - If NODE_ENV === 'production', logs a warning and does nothing, regardless
 *    of DEV_OTP_BYPASS value.
 *  - Does NOT modify OTP generation, storage, or email sending logic.
 *  - MUST be removed or disabled before real production deployment.
 */
function logDevOTPBypass(email: string, otp: string): void {
  if (process.env.NODE_ENV === 'production') {
    // Hard safeguard: never expose OTPs in production, even if the flag is set.
    if (process.env.DEV_OTP_BYPASS === 'true') {
      console.warn(
        '[DEV OTP BYPASS] WARNING: DEV_OTP_BYPASS=true is set in a production ' +
        'environment. This flag has been ignored. Remove it before deploying.'
      );
    }
    return;
  }

  if (process.env.DEV_OTP_BYPASS === 'true') {
    console.log(`[DEV OTP BYPASS] OTP for ${email}: ${otp}`);
  }
}

export class OTPService {
  private otpModel: OTPModel;

  constructor(db: Db) {
    this.otpModel = new OTPModel(db);
  }

  /**
   * Generate a 6-digit random OTP
   * @returns A string containing 6 random digits
   */
  generateOTP(): string {
    // Generate random number between 100000 and 999999 (inclusive)
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp.toString();
  }

  /**
   * Hash an OTP using bcrypt
   * @param otp - The plaintext OTP to hash
   * @returns Promise resolving to the bcrypt hash
   */
  async hashOTP(otp: string): Promise<string> {
    if (!otp) {
      throw new Error('OTP cannot be empty');
    }
    const hash = await bcrypt.hash(otp, SALT_ROUNDS);
    return hash;
  }

  /**
   * Verify an OTP against its hash
   * Uses constant-time comparison to prevent timing attacks
   * @param otp - The plaintext OTP to verify
   * @param hash - The bcrypt hash to compare against
   * @returns Promise resolving to true if OTP matches, false otherwise
   */
  async verifyOTP(otp: string, hash: string): Promise<boolean> {
    if (!otp || !hash) {
      return false;
    }
    const isMatch = await bcrypt.compare(otp, hash);
    return isMatch;
  }

  /**
   * Create a new OTP record or update existing one
   * Generates OTP, hashes it, and stores in database
   * @param email - User's email address
   * @param purpose - Purpose of the OTP ('registration' or 'password_reset')
   * @returns Promise resolving to the plaintext OTP (to be sent via email)
   * @throws Error if resend limit exceeded or database operation fails
   */
  async createOTPRecord(
    email: string,
    purpose: 'registration' | 'password_reset'
  ): Promise<string> {
    // Check if an OTP already exists for this email and purpose
    const existingOTP = await this.otpModel.findByEmailAndPurpose(email, purpose);

    if (existingOTP) {
      // Check if resend limit has been reached
      if (this.otpModel.hasReachedResendLimit(existingOTP)) {
        throw new Error('Maximum OTP resend attempts exceeded');
      }

      // Generate new OTP
      const newOTP = this.generateOTP();
      logDevOTPBypass(email, newOTP); // DEV BYPASS
      const otpHash = await this.hashOTP(newOTP);
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
      const newResendCount = existingOTP.resendCount + 1;

      // Update existing OTP record
      const updated = await this.otpModel.updateOTP(
        email,
        purpose,
        otpHash,
        expiresAt,
        newResendCount
      );

      if (!updated) {
        throw new Error('Failed to update OTP record');
      }

      return newOTP;
    } else {
      // Create new OTP record
      const otp = this.generateOTP();
      logDevOTPBypass(email, otp); // DEV BYPASS
      const otpHash = await this.hashOTP(otp);
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

      await this.otpModel.create({
        email,
        otpHash,
        purpose,
        expiresAt,
        resendCount: 0
      });

      return otp;
    }
  }

  /**
   * Verify an OTP and delete the record if valid
   * @param email - User's email address
   * @param otp - The plaintext OTP to verify
   * @param purpose - Purpose of the OTP ('registration' or 'password_reset')
   * @returns Promise resolving to true if OTP is valid and not expired, false otherwise
   * @throws Error if OTP has expired
   */
  async verifyAndDeleteOTP(
    email: string,
    otp: string,
    purpose: 'registration' | 'password_reset'
  ): Promise<boolean> {
    // Find OTP record
    const otpRecord = await this.otpModel.findByEmailAndPurpose(email, purpose);

    if (!otpRecord) {
      return false;
    }

    // Check if OTP has expired
    if (this.otpModel.isExpired(otpRecord)) {
      // Delete expired OTP
      await this.otpModel.deleteByEmailAndPurpose(email, purpose);
      throw new Error('OTP has expired');
    }

    // Verify OTP
    const isValid = await this.verifyOTP(otp, otpRecord.otpHash);

    if (isValid) {
      // Delete OTP record after successful verification
      await this.otpModel.deleteByEmailAndPurpose(email, purpose);
      return true;
    }

    return false;
  }

  /**
   * Check if resend limit has been reached for an email and purpose
   * @param email - User's email address
   * @param purpose - Purpose of the OTP
   * @returns Promise resolving to true if limit reached, false otherwise
   */
  async hasReachedResendLimit(
    email: string,
    purpose: 'registration' | 'password_reset'
  ): Promise<boolean> {
    const otpRecord = await this.otpModel.findByEmailAndPurpose(email, purpose);
    if (!otpRecord) {
      return false;
    }
    return this.otpModel.hasReachedResendLimit(otpRecord);
  }

  /**
   * Get remaining resend attempts for an email and purpose
   * @param email - User's email address
   * @param purpose - Purpose of the OTP
   * @returns Promise resolving to number of remaining attempts
   */
  async getRemainingAttempts(
    email: string,
    purpose: 'registration' | 'password_reset'
  ): Promise<number> {
    const otpRecord = await this.otpModel.findByEmailAndPurpose(email, purpose);
    if (!otpRecord) {
      return MAX_RESEND_ATTEMPTS;
    }
    return Math.max(0, MAX_RESEND_ATTEMPTS - otpRecord.resendCount);
  }

  /**
   * Delete an OTP record by email and purpose
   * @param email - User's email address
   * @param purpose - Purpose of the OTP
   * @returns Promise resolving to true if deleted, false otherwise
   */
  async deleteOTP(
    email: string,
    purpose: 'registration' | 'password_reset'
  ): Promise<boolean> {
    return this.otpModel.deleteByEmailAndPurpose(email, purpose);
  }
}

/**
 * Factory function to create OTP service instance
 * @param db - MongoDB database instance
 * @returns OTPService instance
 */
export function createOTPService(db: Db): OTPService {
  return new OTPService(db);
}
