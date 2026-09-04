import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Middleware Suite for EventSphere
 *
 * Configures distinct limiters for high-value and sensitive endpoints:
 * 1. Auth limiter (login, register, forgot-password, OTP verification)
 * 2. OTP Resend limiter (stricter limit on resending OTP emails)
 * 3. Ticket registration limiter (prevents automated bot scalping / spam registrations)
 * 4. Application submission limiter (protects expo applications from spam)
 */

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many authentication requests from this IP. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

export const otpResendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Max 5 resend requests per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait 10 minutes before requesting another code.',
    code: 'OTP_RATE_LIMIT_EXCEEDED',
  },
});

export const ticketRegistrationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Max 10 ticket creation requests per 5 minutes per user/IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many ticket registration attempts. Please wait a few moments before trying again.',
    code: 'TICKET_RATE_LIMIT_EXCEEDED',
  },
});

export const applicationSubmissionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15, // Max 15 application submissions per 10 minutes per IP/user
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many application submissions. Please try again later.',
    code: 'APPLICATION_RATE_LIMIT_EXCEEDED',
  },
});
