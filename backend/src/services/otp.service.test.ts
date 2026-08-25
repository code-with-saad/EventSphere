import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Db } from 'mongodb';
import { OTPService } from './otp.service';
import * as OTPModelModule from '../models/OTP.model';
import bcrypt from 'bcrypt';

// Mock the OTPModel module
vi.mock('../models/OTP.model', () => {
  const mockModelInstance = {
    findByEmailAndPurpose: vi.fn(),
    create: vi.fn(),
    updateOTP: vi.fn(),
    deleteByEmailAndPurpose: vi.fn(),
    isExpired: vi.fn(),
    hasReachedResendLimit: vi.fn()
  };

  return {
    OTPModel: class MockOTPModel {
      constructor() {
        Object.assign(this, mockModelInstance);
      }
      
      static mockInstance = mockModelInstance;
    }
  };
});

describe('OTPService', () => {
  let otpService: OTPService;
  let mockDb: Db;
  let mockOTPModel: any;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    mockDb = {} as Db;
    otpService = new OTPService(mockDb);
    // Get the mock instance from the static property
    mockOTPModel = (OTPModelModule.OTPModel as any).mockInstance;
  });

  describe('generateOTP', () => {
    it('should generate a 6-digit OTP', () => {
      const otp = otpService.generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
      expect(otp.length).toBe(6);
    });

    it('should generate different OTPs on multiple calls', () => {
      const otp1 = otpService.generateOTP();
      const otp2 = otpService.generateOTP();
      const otp3 = otpService.generateOTP();
      
      // At least one should be different (very high probability)
      const allSame = otp1 === otp2 && otp2 === otp3;
      expect(allSame).toBe(false);
    });

    it('should generate OTPs within valid range (100000-999999)', () => {
      for (let i = 0; i < 100; i++) {
        const otp = otpService.generateOTP();
        const otpNum = parseInt(otp, 10);
        expect(otpNum).toBeGreaterThanOrEqual(100000);
        expect(otpNum).toBeLessThanOrEqual(999999);
      }
    });
  });

  describe('hashOTP', () => {
    it('should hash an OTP using bcrypt', async () => {
      const otp = '123456';
      const hash = await otpService.hashOTP(otp);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    });

    it('should generate different hashes for the same OTP', async () => {
      const otp = '123456';
      const hash1 = await otpService.hashOTP(otp);
      const hash2 = await otpService.hashOTP(otp);
      
      expect(hash1).not.toBe(hash2); // bcrypt uses salt
    });

    it('should throw error for empty OTP', async () => {
      await expect(otpService.hashOTP('')).rejects.toThrow('OTP cannot be empty');
    });
  });

  describe('verifyOTP', () => {
    it('should return true for matching OTP and hash', async () => {
      const otp = '123456';
      const hash = await bcrypt.hash(otp, 10);
      
      const result = await otpService.verifyOTP(otp, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching OTP and hash', async () => {
      const otp = '123456';
      const wrongOtp = '654321';
      const hash = await bcrypt.hash(otp, 10);
      
      const result = await otpService.verifyOTP(wrongOtp, hash);
      expect(result).toBe(false);
    });

    it('should return false for empty OTP', async () => {
      const hash = await bcrypt.hash('123456', 10);
      const result = await otpService.verifyOTP('', hash);
      expect(result).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const result = await otpService.verifyOTP('123456', '');
      expect(result).toBe(false);
    });
  });

  describe('createOTPRecord', () => {
    it('should create new OTP record when none exists', async () => {
      const email = 'test@example.com';
      const purpose = 'registration';
      
      mockOTPModel.findByEmailAndPurpose.mockResolvedValue(null);
      mockOTPModel.create.mockResolvedValue({});
      
      const otp = await otpService.createOTPRecord(email, purpose);
      
      expect(otp).toMatch(/^\d{6}$/);
      expect(mockOTPModel.findByEmailAndPurpose).toHaveBeenCalledWith(email, purpose);
      expect(mockOTPModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email,
          purpose,
          resendCount: 0,
          otpHash: expect.any(String),
          expiresAt: expect.any(Date)
        })
      );
    });

    it('should set expiresAt to 5 minutes from creation', async () => {
      const email = 'test@example.com';
      const purpose = 'registration';

      mockOTPModel.findByEmailAndPurpose.mockResolvedValue(null);

      let capturedExpiresAt: Date | undefined;
      mockOTPModel.create.mockImplementation(async (record: { expiresAt: Date }) => {
        capturedExpiresAt = record.expiresAt;
        return {};
      });

      const before = Date.now();
      await otpService.createOTPRecord(email, purpose);
      const after = Date.now();

      expect(capturedExpiresAt).toBeDefined();
      const expiresAtMs = capturedExpiresAt!.getTime();
      const fiveMinutes = 5 * 60 * 1000;

      // expiresAt should be ~5 minutes ahead of the call time
      expect(expiresAtMs).toBeGreaterThanOrEqual(before + fiveMinutes - 100);
      expect(expiresAtMs).toBeLessThanOrEqual(after + fiveMinutes + 100);
    });

    it('should update existing OTP record when one exists', async () => {
      const email = 'test@example.com';
      const purpose = 'registration';
      const existingOTP = {
        email,
        purpose,
        otpHash: 'oldhash',
        expiresAt: new Date(),
        resendCount: 1,
        createdAt: new Date()
      };
      
      mockOTPModel.findByEmailAndPurpose.mockResolvedValue(existingOTP);
      mockOTPModel.hasReachedResendLimit.mockReturnValue(false);
      mockOTPModel.updateOTP.mockResolvedValue(true);
      
      const otp = await otpService.createOTPRecord(email, purpose);
      
      expect(otp).toMatch(/^\d{6}$/);
      expect(mockOTPModel.updateOTP).toHaveBeenCalledWith(
        email,
        purpose,
        expect.any(String),
        expect.any(Date),
        2 // resendCount incremented
      );
    });

    it('should throw error when resend limit exceeded', async () => {
      const email = 'test@example.com';
      const purpose = 'registration';
      const existingOTP = {
        email,
        purpose,
        otpHash: 'hash',
        expiresAt: new Date(),
        resendCount: 3,
        createdAt: new Date()
      };
      
      mockOTPModel.findByEmailAndPurpose.mockResolvedValue(existingOTP);
      mockOTPModel.hasReachedResendLimit.mockReturnValue(true);
      
      await expect(otpService.createOTPRecord(email, purpose))
        .rejects.toThrow('Maximum OTP resend attempts exceeded');
    });
  });

  describe('verifyAndDeleteOTP', () => {
    it('should return true and delete OTP for valid OTP', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      const purpose = 'registration';
      const hash = await bcrypt.hash(otp, 10);
      
      const otpRecord = {
        email,
        purpose,
        otpHash: hash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        resendCount: 0,
        createdAt: new Date()
      };
      
      mockOTPModel.findByEmailAndPurpose.mockResolvedValue(otpRecord);
      mockOTPModel.isExpired.mockReturnValue(false);
      mockOTPModel.deleteByEmailAndPurpose.mockResolvedValue(true);
      
      const result = await otpService.verifyAndDeleteOTP(email, otp, purpose);
      
      expect(result).toBe(true);
      expect(mockOTPModel.deleteByEmailAndPurpose).toHaveBeenCalledWith(email, purpose);
    });

    it('should return false for invalid OTP', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      const wrongOtp = '654321';
      const purpose = 'registration';
      const hash = await bcrypt.hash(otp, 10);
      
      const otpRecord = {
        email,
        purpose,
        otpHash: hash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        resendCount: 0,
        createdAt: new Date()
      };
      
      mockOTPModel.findByEmailAndPurpose.mockResolvedValue(otpRecord);
      mockOTPModel.isExpired.mockReturnValue(false);
      
      const result = await otpService.verifyAndDeleteOTP(email, wrongOtp, purpose);
      
      expect(result).toBe(false);
      expect(mockOTPModel.deleteByEmailAndPurpose).not.toHaveBeenCalled();
    });

    it('should throw error for expired OTP', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      const purpose = 'registration';
      
      const otpRecord = {
        email,
        purpose,
        otpHash: 'hash',
        expiresAt: new Date(Date.now() - 1000), // expired
        resendCount: 0,
        createdAt: new Date()
      };
      
      mockOTPModel.findByEmailAndPurpose.mockResolvedValue(otpRecord);
      mockOTPModel.isExpired.mockReturnValue(true);
      mockOTPModel.deleteByEmailAndPurpose.mockResolvedValue(true);
      
      await expect(otpService.verifyAndDeleteOTP(email, otp, purpose))
        .rejects.toThrow('OTP has expired');
      
      expect(mockOTPModel.deleteByEmailAndPurpose).toHaveBeenCalledWith(email, purpose);
    });

    it('should return false when OTP record not found', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      const purpose = 'registration';
      
      mockOTPModel.findByEmailAndPurpose.mockResolvedValue(null);
      
      const result = await otpService.verifyAndDeleteOTP(email, otp, purpose);
      
      expect(result).toBe(false);
    });
  });

  describe('hasReachedResendLimit', () => {
    it('should return true when limit reached', async () => {
      const email = 'test@example.com';
      const purpose = 'registration';
      const otpRecord = {
        email,
        purpose,
        otpHash: 'hash',
        expiresAt: new Date(),
        resendCount: 3,
        createdAt: new Date()
      };
      
      mockOTPModel.findByEmailAndPurpose.mockResolvedValue(otpRecord);
      mockOTPModel.hasReachedResendLimit.mockReturnValue(true);
      
      const result = await otpService.hasReachedResendLimit(email, purpose);
      expect(result).toBe(true);
    });

    it('should return false when limit not reached', async () => {
      const email = 'test@example.com';
      const purpose = 'registration';
      const otpRecord = {
        email,
        purpose,
        otpHash: 'hash',
        expiresAt: new Date(),
        resendCount: 1,
        createdAt: new Date()
      };
      
      mockOTPModel.findByEmailAndPurpose.mockResolvedValue(otpRecord);
      mockOTPModel.hasReachedResendLimit.mockReturnValue(false);
      
      const result = await otpService.hasReachedResendLimit(email, purpose);
      expect(result).toBe(false);
    });

    it('should return false when no OTP record exists', async () => {
      const email = 'test@example.com';
      const purpose = 'registration';
      
      mockOTPModel.findByEmailAndPurpose.mockResolvedValue(null);
      
      const result = await otpService.hasReachedResendLimit(email, purpose);
      expect(result).toBe(false);
    });
  });

  describe('getRemainingAttempts', () => {
    it('should return remaining attempts correctly', async () => {
      const email = 'test@example.com';
      const purpose = 'registration';
      const otpRecord = {
        email,
        purpose,
        otpHash: 'hash',
        expiresAt: new Date(),
        resendCount: 1,
        createdAt: new Date()
      };
      
      mockOTPModel.findByEmailAndPurpose.mockResolvedValue(otpRecord);
      
      const remaining = await otpService.getRemainingAttempts(email, purpose);
      expect(remaining).toBe(2); // 3 - 1
    });

    it('should return max attempts when no OTP record exists', async () => {
      const email = 'test@example.com';
      const purpose = 'registration';
      
      mockOTPModel.findByEmailAndPurpose.mockResolvedValue(null);
      
      const remaining = await otpService.getRemainingAttempts(email, purpose);
      expect(remaining).toBe(3);
    });

    it('should return 0 when limit reached', async () => {
      const email = 'test@example.com';
      const purpose = 'registration';
      const otpRecord = {
        email,
        purpose,
        otpHash: 'hash',
        expiresAt: new Date(),
        resendCount: 3,
        createdAt: new Date()
      };
      
      mockOTPModel.findByEmailAndPurpose.mockResolvedValue(otpRecord);
      
      const remaining = await otpService.getRemainingAttempts(email, purpose);
      expect(remaining).toBe(0);
    });
  });

  describe('deleteOTP', () => {
    it('should delete OTP record', async () => {
      const email = 'test@example.com';
      const purpose = 'registration';
      
      mockOTPModel.deleteByEmailAndPurpose.mockResolvedValue(true);
      
      const result = await otpService.deleteOTP(email, purpose);
      expect(result).toBe(true);
      expect(mockOTPModel.deleteByEmailAndPurpose).toHaveBeenCalledWith(email, purpose);
    });
  });
});
