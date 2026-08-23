import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import axios from 'axios';
import { setTokenManager } from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// localStorage key — only the refresh token is persisted to disk.
// The access token always lives in memory only.
const LS_REFRESH_TOKEN_KEY = 'es_refresh_token';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'superadmin' | 'organizer' | 'exhibitor' | 'attendee';
  status: 'pending' | 'active' | 'suspended';
  isEmailVerified: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role: 'organizer' | 'exhibitor' | 'attendee';
}

interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

interface RegisterResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    status: string;
    isEmailVerified: boolean;
  };
}

interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    user?: User;
  };
}

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isAuthenticated = !!user && !!accessToken;

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Persist refresh token to localStorage (only token stored on disk). */
  const persistRefreshToken = (token: string) => {
    localStorage.setItem(LS_REFRESH_TOKEN_KEY, token);
  };

  /** Remove refresh token from localStorage on logout or refresh failure. */
  const clearPersistedRefreshToken = () => {
    localStorage.removeItem(LS_REFRESH_TOKEN_KEY);
  };

  // ── Token manager wired into Axios interceptor ────────────────────────────

  useEffect(() => {
    setTokenManager({
      getAccessToken: () => accessToken,
      getRefreshToken: () => refreshToken,
      setTokens: (newAccessToken: string, newRefreshToken: string) => {
        setAccessToken(newAccessToken);
        setRefreshToken(newRefreshToken);
        // Keep localStorage in sync when the Axios interceptor rotates tokens
        persistRefreshToken(newRefreshToken);
      },
      clearTokens: () => {
        setUser(null);
        setAccessToken(null);
        setRefreshToken(null);
        clearPersistedRefreshToken();
      },
    });
  }, [accessToken, refreshToken]);

  // ── Login ─────────────────────────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    const response = await axios.post<LoginResponse>(
      `${API_BASE_URL}/api/auth/login`,
      { email, password }
    );

    const { user: userData, accessToken: token, refreshToken: refresh } = response.data.data;

    setUser(userData);
    setAccessToken(token);
    setRefreshToken(refresh);
    // Persist refresh token so session survives page reload
    persistRefreshToken(refresh);

    return response.data;
  };

  // ── Logout ────────────────────────────────────────────────────────────────

  const logout = async (): Promise<void> => {
    try {
      if (accessToken && refreshToken) {
        await axios.post(
          `${API_BASE_URL}/api/auth/logout`,
          { refreshToken },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Always wipe state and localStorage
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      clearPersistedRefreshToken();
    }
  };

  // ── Register ──────────────────────────────────────────────────────────────

  const register = async (data: RegisterData): Promise<RegisterResponse> => {
    const response = await axios.post<RegisterResponse>(
      `${API_BASE_URL}/api/auth/register`,
      data
    );
    return response.data;
  };

  // ── Refresh access token ──────────────────────────────────────────────────

  /**
   * Calls POST /api/auth/refresh with the current refresh token.
   * On success: updates in-memory access token + rotates refresh token in both
   *             state and localStorage.
   * On failure: clears all auth state (forces re-login).
   */
  const refreshAccessToken = useCallback(async (): Promise<void> => {
    // Prefer in-memory token; fall back to localStorage (e.g. right after mount)
    const tokenToUse = refreshToken ?? localStorage.getItem(LS_REFRESH_TOKEN_KEY);

    if (!tokenToUse) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post<RefreshTokenResponse>(
        `${API_BASE_URL}/api/auth/refresh`,
        {},
        { headers: { Authorization: `Bearer ${tokenToUse}` } }
      );

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;

      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      persistRefreshToken(newRefreshToken);
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear everything — user must log in again
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      clearPersistedRefreshToken();
      throw error;
    }
  }, [refreshToken]);

  // ── Restore session on mount ──────────────────────────────────────────────

  /**
   * On every app mount (including page reload):
   *  1. Check localStorage for a persisted refresh token.
   *  2. If found, silently call /api/auth/refresh to get a new access token
   *     and restore the user session — the user never sees a login redirect.
   *  3. If the refresh call fails (token expired / revoked), clear localStorage
   *     and proceed as unauthenticated — user will be sent to /login.
   *  4. Either way, set isLoading=false so protected routes can render.
   */
  const checkAuthStatus = useCallback(async () => {
    const storedRefreshToken = localStorage.getItem(LS_REFRESH_TOKEN_KEY);

    if (!storedRefreshToken) {
      // No persisted session — nothing to restore
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post<RefreshTokenResponse>(
        `${API_BASE_URL}/api/auth/refresh`,
        {},
        { headers: { Authorization: `Bearer ${storedRefreshToken}` } }
      );

      const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: userData } =
        response.data.data;

      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      persistRefreshToken(newRefreshToken);

      // Backend may return user in refresh response; if not, we'll need /me
      if (userData) {
        setUser(userData);
      } else {
        // Fetch current user profile with the fresh access token
        const meResponse = await axios.get<{ success: boolean; data: { user: User } }>(
          `${API_BASE_URL}/api/auth/me`,
          { headers: { Authorization: `Bearer ${newAccessToken}` } }
        );
        setUser(meResponse.data.data.user);
      }
    } catch (error) {
      console.error('Session restore failed — clearing stored token:', error);
      clearPersistedRefreshToken();
      // State is already null from initial useState — nothing else to clear
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Run once on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // ── Auto-refresh interval (14 min) ────────────────────────────────────────

  useEffect(() => {
    if (!accessToken || !refreshToken) return;

    const refreshInterval = setInterval(() => {
      refreshAccessToken().catch((error) => {
        console.error('Automatic token refresh failed:', error);
      });
    }, 14 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [accessToken, refreshToken, refreshAccessToken]);

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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}