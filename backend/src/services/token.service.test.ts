import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  AccessTokenPayload,
  RefreshTokenPayload,
  DecodedToken,
} from './token.service';

describe('Token Service', () => {
  const mockAccessPayload: AccessTokenPayload = {
    userId: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    role: 'organizer',
  };

  const mockRefreshPayload: RefreshTokenPayload = {
    userId: '507f1f77bcf86cd799439011',
    type: 'refresh',
  };

  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', () => {
      const token = generateAccessToken(mockAccessPayload);
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts: header.payload.signature
    });

    it('should include userId, email, and role in token payload', () => {
      const token = generateAccessToken(mockAccessPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeTruthy();
      expect(decoded?.userId).toBe(mockAccessPayload.userId);
      expect(decoded?.email).toBe(mockAccessPayload.email);
      expect(decoded?.role).toBe(mockAccessPayload.role);
    });

    it('should have iat (issued at) and exp (expiry) claims', () => {
      const token = generateAccessToken(mockAccessPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeTruthy();
      expect(decoded?.iat).toBeDefined();
      expect(decoded?.exp).toBeDefined();
    });

    it('should expire in approximately 15 minutes', () => {
      const token = generateAccessToken(mockAccessPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeTruthy();
      if (decoded?.iat && decoded?.exp) {
        const expiryDuration = decoded.exp - decoded.iat;
        // 15 minutes = 900 seconds
        expect(expiryDuration).toBe(900);
      }
    });

    it('should generate different tokens for same payload (due to different iat)', async () => {
      const token1 = generateAccessToken(mockAccessPayload);
      
      // Wait 1 second to ensure different issued-at times
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const token2 = generateAccessToken(mockAccessPayload);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT refresh token', () => {
      const token = generateRefreshToken(mockRefreshPayload);
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include userId and type in token payload', () => {
      const token = generateRefreshToken(mockRefreshPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeTruthy();
      expect(decoded?.userId).toBe(mockRefreshPayload.userId);
      expect(decoded?.type).toBe('refresh');
    });

    it('should expire in approximately 7 days', () => {
      const token = generateRefreshToken(mockRefreshPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeTruthy();
      if (decoded?.iat && decoded?.exp) {
        const expiryDuration = decoded.exp - decoded.iat;
        // 7 days = 604800 seconds
        expect(expiryDuration).toBe(604800);
      }
    });
  });

  describe('verifyToken', () => {
    it('should successfully verify a valid access token', () => {
      const token = generateAccessToken(mockAccessPayload);
      
      const decoded = verifyToken(token);
      
      expect(decoded).toBeTruthy();
      expect(decoded.userId).toBe(mockAccessPayload.userId);
      expect(decoded.email).toBe(mockAccessPayload.email);
      expect(decoded.role).toBe(mockAccessPayload.role);
    });

    it('should successfully verify a valid refresh token', () => {
      const token = generateRefreshToken(mockRefreshPayload);
      
      const decoded = verifyToken(token);
      
      expect(decoded).toBeTruthy();
      expect(decoded.userId).toBe(mockRefreshPayload.userId);
      expect(decoded.type).toBe('refresh');
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.string';
      
      expect(() => verifyToken(invalidToken)).toThrow('Invalid token');
    });

    it('should throw error for malformed token', () => {
      const malformedToken = 'not-a-jwt-token';
      
      expect(() => verifyToken(malformedToken)).toThrow('Invalid token');
    });

    it('should throw error for token with wrong signature', () => {
      // Generate a token, then modify it
      const token = generateAccessToken(mockAccessPayload);
      const parts = token.split('.');
      // Modify the signature part
      const tamperedToken = `${parts[0]}.${parts[1]}.wrongsignature`;
      
      expect(() => verifyToken(tamperedToken)).toThrow('Invalid token');
    });

    it('should return decoded token with all standard JWT claims', () => {
      const token = generateAccessToken(mockAccessPayload);
      
      const decoded = verifyToken(token);
      
      expect(decoded.iat).toBeDefined(); // issued at
      expect(decoded.exp).toBeDefined(); // expiry
      expect(typeof decoded.iat).toBe('number');
      expect(typeof decoded.exp).toBe('number');
    });
  });

  describe('decodeToken', () => {
    it('should decode a valid token without verification', () => {
      const token = generateAccessToken(mockAccessPayload);
      
      const decoded = decodeToken(token);
      
      expect(decoded).toBeTruthy();
      expect(decoded?.userId).toBe(mockAccessPayload.userId);
      expect(decoded?.email).toBe(mockAccessPayload.email);
      expect(decoded?.role).toBe(mockAccessPayload.role);
    });

    it('should decode token even with wrong signature', () => {
      const token = generateAccessToken(mockAccessPayload);
      const parts = token.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.wrongsignature`;
      
      const decoded = decodeToken(tamperedToken);
      
      // Should still decode the payload without verifying signature
      expect(decoded).toBeTruthy();
      expect(decoded?.userId).toBe(mockAccessPayload.userId);
    });

    it('should return null for completely invalid token', () => {
      const invalidToken = 'not-a-jwt-token';
      
      const decoded = decodeToken(invalidToken);
      
      expect(decoded).toBeNull();
    });

    it('should decode refresh token without verification', () => {
      const token = generateRefreshToken(mockRefreshPayload);
      
      const decoded = decodeToken(token);
      
      expect(decoded).toBeTruthy();
      expect(decoded?.userId).toBe(mockRefreshPayload.userId);
      expect(decoded?.type).toBe('refresh');
    });
  });

  describe('Token Expiry Behavior', () => {
    it('access token should have expiry approximately 15 minutes from now', () => {
      const now = Math.floor(Date.now() / 1000);
      const token = generateAccessToken(mockAccessPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeTruthy();
      if (decoded?.exp) {
        const expiryFromNow = decoded.exp - now;
        // Should be approximately 900 seconds (15 minutes)
        // Allow 5 second tolerance for test execution time
        expect(expiryFromNow).toBeGreaterThanOrEqual(895);
        expect(expiryFromNow).toBeLessThanOrEqual(900);
      }
    });

    it('refresh token should have expiry approximately 7 days from now', () => {
      const now = Math.floor(Date.now() / 1000);
      const token = generateRefreshToken(mockRefreshPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeTruthy();
      if (decoded?.exp) {
        const expiryFromNow = decoded.exp - now;
        // Should be approximately 604800 seconds (7 days)
        // Allow 5 second tolerance
        expect(expiryFromNow).toBeGreaterThanOrEqual(604795);
        expect(expiryFromNow).toBeLessThanOrEqual(604800);
      }
    });
  });

  describe('Different Payload Types', () => {
    it('should handle different user roles correctly', () => {
      const roles = ['superadmin', 'organizer', 'exhibitor', 'attendee'];
      
      roles.forEach(role => {
        const payload: AccessTokenPayload = {
          userId: '507f1f77bcf86cd799439011',
          email: `user@example.com`,
          role,
        };
        
        const token = generateAccessToken(payload);
        const decoded = verifyToken(token);
        
        expect(decoded.role).toBe(role);
      });
    });

    it('should handle different userId formats', () => {
      const userIds = [
        '507f1f77bcf86cd799439011',
        'user123',
        'uuid-v4-format-here',
      ];
      
      userIds.forEach(userId => {
        const payload: AccessTokenPayload = {
          userId,
          email: 'test@example.com',
          role: 'organizer',
        };
        
        const token = generateAccessToken(payload);
        const decoded = verifyToken(token);
        
        expect(decoded.userId).toBe(userId);
      });
    });
  });
});
