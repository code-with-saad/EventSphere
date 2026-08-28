import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

// API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Create Axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Not using cookies per design
});

// Type for token getters and setters (will be set by AuthContext)
interface TokenManager {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearTokens: () => void;
}

let tokenManager: TokenManager | null = null;

/**
 * Set the token manager for the API service
 * This should be called by AuthContext on initialization
 */
export function setTokenManager(manager: TokenManager): void {
  tokenManager = manager;
}

/**
 * Request Interceptor
 * Attaches Authorization header with access token for protected routes
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get access token from token manager
    const accessToken = tokenManager?.getAccessToken();

    // Attach Authorization header if token exists
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles 401 errors with automatic token refresh
 * Shows toast notifications for errors
 */
api.interceptors.response.use(
  // Success response - pass through
  (response) => response,
  
  // Error response - handle various error cases
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized errors with TOKEN_EXPIRED code
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      // Mark request as retried to prevent infinite loops
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const refreshToken = tokenManager?.getRefreshToken();
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh endpoint
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }
        );

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = 
          refreshResponse.data.data;

        // Update tokens via token manager
        if (tokenManager?.setTokens) {
          tokenManager.setTokens(newAccessToken, newRefreshToken);
        }

        // Update the Authorization header for the original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        // Retry the original request with new access token
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user and redirect to login
        console.error('Token refresh failed:', refreshError);
        
        // Clear tokens
        if (tokenManager?.clearTokens) {
          tokenManager.clearTokens();
        }

        // Show error toast
        toast.error('Session expired. Please log in again.');

        // Redirect to login page
        window.location.href = '/login';

        return Promise.reject(refreshError);
      }
    }

    // Re-throw so individual components can handle errors and show toasts
    return Promise.reject(error);
  }
);

// Export the configured Axios instance
export default api;
