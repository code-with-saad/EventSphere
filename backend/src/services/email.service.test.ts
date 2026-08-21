import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailService } from './email.service';

// Create a mock send function
const mockSend = vi.fn().mockResolvedValue({
  data: { id: 'mock-email-id' },
  error: null,
});

// Mock the Resend module
vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = {
        send: mockSend,
      };
    },
  };
});

// Mock the env config
vi.mock('../config/env', () => ({
  default: {
    RESEND_API_KEY: 'test-api-key',
  },
}));

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService();
    vi.clearAllMocks();
  });

  describe('sendOTPEmail', () => {
    it('should send registration OTP email successfully', async () => {
      const result = await emailService.sendOTPEmail(
        'test@example.com',
        '123456',
        'registration'
      );

      expect(result).toBe(true);
    });

    it('should send password reset OTP email successfully', async () => {
      const result = await emailService.sendOTPEmail(
        'test@example.com',
        '654321',
        'password_reset'
      );

      expect(result).toBe(true);
    });

    it('should throw error when email send fails', async () => {
      // Mock Resend to throw an error
      const mockError = new Error('API Error');
      mockSend.mockRejectedValueOnce(mockError);

      await expect(
        emailService.sendOTPEmail('test@example.com', '123456', 'registration')
      ).rejects.toThrow('Failed to send OTP email. Please try again later.');
      
      // Reset the mock to its default behavior
      mockSend.mockResolvedValue({
        data: { id: 'mock-email-id' },
        error: null,
      });
    });

    it('should generate correct email content for registration', async () => {
      const otp = '123456';
      const content = emailService['generateEmailContent'](otp, 'registration');

      expect(content.subject).toBe('Verify your EventSphere account');
      expect(content.html).toContain(otp);
      expect(content.html).toContain('5 minutes');
      expect(content.text).toContain(otp);
    });

    it('should generate correct email content for password reset', async () => {
      const otp = '654321';
      const content = emailService['generateEmailContent'](otp, 'password_reset');

      expect(content.subject).toBe('Reset your EventSphere password');
      expect(content.html).toContain(otp);
      expect(content.html).toContain('5 minutes');
      expect(content.html).toContain('Security Notice');
      expect(content.text).toContain(otp);
    });

    it('should include OTP code in HTML template for registration', () => {
      const otp = '123456';
      const html = emailService['getRegistrationEmailHTML'](otp);

      expect(html).toContain(otp);
      expect(html).toContain('EventSphere');
      expect(html).toContain('5 minutes');
      expect(html).toContain('verification code');
    });

    it('should include OTP code in text template for registration', () => {
      const otp = '123456';
      const text = emailService['getRegistrationEmailText'](otp);

      expect(text).toContain(otp);
      expect(text).toContain('EventSphere');
      expect(text).toContain('5 minutes');
    });

    it('should include OTP code in HTML template for password reset', () => {
      const otp = '654321';
      const html = emailService['getPasswordResetEmailHTML'](otp);

      expect(html).toContain(otp);
      expect(html).toContain('EventSphere');
      expect(html).toContain('5 minutes');
      expect(html).toContain('password reset');
      expect(html).toContain('Security Notice');
    });

    it('should include OTP code in text template for password reset', () => {
      const otp = '654321';
      const text = emailService['getPasswordResetEmailText'](otp);

      expect(text).toContain(otp);
      expect(text).toContain('EventSphere');
      expect(text).toContain('5 minutes');
      expect(text).toContain('SECURITY NOTICE');
    });
  });
});
