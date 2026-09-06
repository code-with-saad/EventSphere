import { describe, it, expect, vi, beforeEach } from 'vitest';
import toast from 'react-hot-toast';
import { showSuccess, showError, showWarning, showInfo, dismissToast, dismissAllToasts } from './toast';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => {
  const mockToastFn = vi.fn((message: string, _options?: any) => `toast-${message}`);
  return {
    default: Object.assign(mockToastFn, {
      success: vi.fn((message: string) => `toast-success-${message}`),
      error: vi.fn((message: string) => `toast-error-${message}`),
      dismiss: vi.fn(),
    }),
    __esModule: true,
  };
});

describe('Toast Utility Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('showSuccess', () => {
    it('should call toast.success with the provided message', () => {
      const message = 'Operation successful!';
      showSuccess(message);
      
      expect(toast.success).toHaveBeenCalledWith(message, expect.any(Object));
      expect(toast.success).toHaveBeenCalledTimes(1);
    });

    it('should return a toast ID', () => {
      const result = showSuccess('Test message');
      expect(result).toBeDefined();
    });
  });

  describe('showError', () => {
    it('should call toast.error with the provided message', () => {
      const message = 'An error occurred!';
      showError(message);
      
      expect(toast.error).toHaveBeenCalledWith(message, expect.any(Object));
      expect(toast.error).toHaveBeenCalledTimes(1);
    });

    it('should return a toast ID', () => {
      const result = showError('Test error');
      expect(result).toBeDefined();
    });
  });

  describe('showWarning', () => {
    it('should call toast with warning styling', () => {
      const message = 'Warning message!';
      showWarning(message);
      
    });
  });

  describe('showInfo', () => {
    it('should call toast with info styling', () => {
      const message = 'Info message!';
      showInfo(message);
      
    });
  });

  describe('dismissToast', () => {
    it('should call toast.dismiss with the provided toast ID', () => {
      const toastId = 'test-toast-id';
      dismissToast(toastId);
      
      expect(toast.dismiss).toHaveBeenCalledWith(toastId);
      expect(toast.dismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('dismissAllToasts', () => {
    it('should call toast.dismiss without arguments', () => {
      dismissAllToasts();
      
      expect(toast.dismiss).toHaveBeenCalledWith();
      expect(toast.dismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Message content validation', () => {
    it('should handle empty strings', () => {
      expect(() => showSuccess('')).not.toThrow();
      expect(() => showError('')).not.toThrow();
    });

    it('should handle long messages', () => {
      const longMessage = 'A'.repeat(1000);
      expect(() => showSuccess(longMessage)).not.toThrow();
      expect(() => showError(longMessage)).not.toThrow();
    });

    it('should handle special characters', () => {
      const specialMessage = 'Success! <script>alert("test")</script>';
      expect(() => showSuccess(specialMessage)).not.toThrow();
    });
  });
});
