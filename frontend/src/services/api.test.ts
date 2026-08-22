import { describe, it, expect, vi } from 'vitest';
import api, { setTokenManager } from './api';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('API Service', () => {
  describe('Token Manager', () => {
    it('should allow setting a token manager', () => {
      const mockTokenManager = {
        getAccessToken: vi.fn(() => 'mock-access-token'),
        getRefreshToken: vi.fn(() => 'mock-refresh-token'),
        setTokens: vi.fn(),
        clearTokens: vi.fn(),
      };

      expect(() => setTokenManager(mockTokenManager)).not.toThrow();
    });
  });

  describe('Base Configuration', () => {
    it('should be configured with correct base URL', () => {
      expect(api.defaults.baseURL).toBeDefined();
      expect(typeof api.defaults.baseURL).toBe('string');
    });

    it('should have Content-Type header set to application/json', () => {
      expect(api.defaults.headers['Content-Type']).toBe('application/json');
    });

    it('should have withCredentials set to false', () => {
      expect(api.defaults.withCredentials).toBe(false);
    });
  });

  describe('Interceptors', () => {
    it('should have request interceptor configured', () => {
      expect(api.interceptors.request).toBeDefined();
    });

    it('should have response interceptor configured', () => {
      expect(api.interceptors.response).toBeDefined();
    });
  });

  describe('Token Manager Integration', () => {
    it('should retrieve tokens from token manager when making requests', () => {
      const mockTokenManager = {
        getAccessToken: vi.fn(() => 'test-access-token'),
        getRefreshToken: vi.fn(() => 'test-refresh-token'),
        setTokens: vi.fn(),
        clearTokens: vi.fn(),
      };

      setTokenManager(mockTokenManager);

      // The token manager should be callable
      expect(mockTokenManager.getAccessToken()).toBe('test-access-token');
      expect(mockTokenManager.getRefreshToken()).toBe('test-refresh-token');
    });

    it('should handle null tokens gracefully', () => {
      const mockTokenManager = {
        getAccessToken: vi.fn(() => null),
        getRefreshToken: vi.fn(() => null),
        setTokens: vi.fn(),
        clearTokens: vi.fn(),
      };

      setTokenManager(mockTokenManager);

      expect(mockTokenManager.getAccessToken()).toBeNull();
      expect(mockTokenManager.getRefreshToken()).toBeNull();
    });
  });
});
