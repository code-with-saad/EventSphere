import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import axios from 'axios';
import api, { setTokenManager } from '../services/api';

// API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// User interface matching backend User model
interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'superadmin' | 'organizer' | 'exhibitor' | 'attendee';
  status: 'pending' | 'active' | 'suspended';
  isEmailVerified: boolean;
}

// Registration data interface
interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role: 'organizer' | 'exhibitor' | 'attendee';
}

// Login response interface
interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

// Registration response interface
interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    email: string;
    role: string;
    status?: string;
    otpExpiresIn?: number;
  };
}

// Refresh token response interface
interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

// AuthContext interface
interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<RegisterResponse>;
  refreshAccessToken: () => Promise<void>;
  checkAuthStatus: () => void;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider props
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Computed property for authentication status
  const isAuthenticated = !!user && !!accessToken;

  // Set up token manager for API service on mount
  useEffect(() => {
    setTokenManager({
      getAccessToken: () => accessToken,
      getRefreshToken: () => refreshToken,
      setTokens: (newAccessToken: string, newRefreshToken: string) => {
        setAccessToken(newAccessToken);
        setRefreshToken(newRefreshToken);
      },
      clearTokens: () => {
        setUser(null);
        setAccessToken(null);
        setRefreshToken(null);
      },
    });
  }, [accessToken, refreshToken]);

  // Login function
  const login = async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await axios.post<LoginResponse>(
        `${API_BASE_URL}/api/auth/login`,
        { email, password }
      );

      const { user: userData, accessToken: token, refreshToken: refresh } = response.data.data;

      // Store tokens and user in state (memory only)
      setUser(userData);
      setAccessToken(token);
      setRefreshToken(refresh);

      return response.data;
    } catch (error: any) {
      // Re-throw error for handling in UI
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Optionally call logout API to invalidate refresh token
      if (accessToken && refreshToken) {
        await axios.post(
          `${API_BASE_URL}/api/auth/logout`,
          { refreshToken },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
      }
    } catch (error) {
      // Ignore errors during logout API call
      console.error('Logout API error:', error);
    } finally {
      // Always clear state regardless of API success
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
    }
  };

  // Register function
  const register = async (data: RegisterData): Promise<RegisterResponse> => {
    try {
      const response = await axios.post<RegisterResponse>(
        `${API_BASE_URL}/api/auth/register`,
        data
      );

      return response.data;
    } catch (error: any) {
      // Re-throw error for handling in UI
      throw error;
    }
  };

  // Refresh access token function
  const refreshAccessToken = useCallback(async (): Promise<void> => {
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post<RefreshTokenResponse>(
        `${API_BASE_URL}/api/auth/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        }
      );

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;

      // Update tokens in state
      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
    } catch (error: any) {
      // If refresh fails, logout user
      console.error('Token refresh failed:', error);
      await logout();
      throw error;
    }
  }, [refreshToken]);

  // Check auth status on mount
  const checkAuthStatus = useCallback(() => {
    // On mount, check if tokens exist in state
    // Since we store in memory only, tokens will be lost on page refresh
    // This is intentional per the design (no localStorage/sessionStorage)
    setIsLoading(false);
  }, []);

  // Set up automatic token refresh (14 minutes = 840000ms)
  useEffect(() => {
    if (!accessToken || !refreshToken) {
      return;
    }

    // Set up interval to refresh token every 14 minutes (before 15-min expiry)
    const refreshInterval = setInterval(() => {
      refreshAccessToken().catch((error) => {
        console.error('Automatic token refresh failed:', error);
      });
    }, 14 * 60 * 1000); // 14 minutes in milliseconds

    // Cleanup interval on unmount or when tokens change
    return () => {
      clearInterval(refreshInterval);
    };
  }, [accessToken, refreshToken, refreshAccessToken]);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isAuthenticated,
        isLoading,
        login,
        logout,
        register,
        refreshAccessToken,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the AuthContext
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
