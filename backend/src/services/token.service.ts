import jwt, { JwtPayload } from 'jsonwebtoken';
import env from '../config/env';

/**
 * Token payload interface for access tokens
 */
export interface AccessTokenPayload {
  userId: string;
  email?: string;
  role?: string;
  purpose?: 'password_reset' | 'email_verification';
}

/**
 * Token payload interface for refresh tokens
 */
export interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
}

/**
 * Decoded token interface (extends JWT standard payload)
 */
export interface DecodedToken extends JwtPayload {
  userId: string;
  email?: string;
  role?: string;
  type?: string;
}

/**
 * Generate an access token with 15-minute expiry
 * @param payload - Token payload containing userId, email, and role
 * @returns Signed JWT token string
 */
export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(
    payload,
    env.JWT_SECRET,
    { expiresIn: '15m' } // 15 minutes
  );
}

/**
 * Generate a refresh token with 7-day expiry
 * @param payload - Token payload containing userId and type
 * @returns Signed JWT token string
 */
export function generateRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(
    payload,
    env.JWT_SECRET,
    { expiresIn: '7d' } // 7 days
  );
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token string to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as DecodedToken;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Reset token payload interface
 */
export interface ResetTokenPayload {
  userId: string;
  purpose: 'password_reset';
}

/**
 * Generate a short-lived reset token with 10-minute expiry
 * Used exclusively in the forgot-password flow after OTP verification.
 * @param payload - Token payload containing userId and purpose
 * @returns Signed JWT token string
 */
export function generateResetToken(payload: ResetTokenPayload): string {
  return jwt.sign(
    payload,
    env.JWT_SECRET,
    { expiresIn: '10m' } // 10 minutes
  );
}

/**
 * Decode a JWT token without verifying its signature
 * Useful for extracting information without validation
 * @param token - JWT token string to decode
 * @returns Decoded token payload or null if decoding fails
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.decode(token) as DecodedToken;
    return decoded;
  } catch (error) {
    return null;
  }
}
