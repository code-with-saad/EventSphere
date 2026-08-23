import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { BentoCard } from '../common/BentoCard';
import api from '../../services/api';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

interface MeResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      fullName: string;
      role: string;
      status: 'pending' | 'active' | 'suspended';
      isEmailVerified: boolean;
    };
  };
}

/**
 * PendingApprovalScreen
 *
 * Shown to Organizers whose account status is 'pending'.
 * Polls GET /api/auth/me every 30 seconds; once status becomes 'active',
 * navigates to the full Organizer dashboard.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.5
 */
export default function PendingApprovalScreen() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [isChecking, setIsChecking] = useState(false);

  // ── Status poll ───────────────────────────────────────────────────────────

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const response = await api.get<MeResponse>('/api/auth/me');
      const status = response.data.data.user.status;
      if (status === 'active') {
        navigate('/dashboard/organizer', { replace: true });
      }
    } catch {
      // Silent — network errors are non-fatal; the user stays on this screen.
    } finally {
      setIsChecking(false);
    }
  };

  // Store the interval id in a ref so the cleanup always cancels the latest id.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Immediate check on mount
    checkStatus();

    // Then poll every 30 seconds
    intervalRef.current = setInterval(checkStatus, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Logout handler ────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-lg-token ${
        isDarkMode
          ? 'bg-bg-base-dark text-text-primary-dark'
          : 'bg-bg-base-light text-text-primary-light'
      }`}
    >
      <BentoCard
        className={`w-full max-w-lg text-center ${
          isDarkMode
            ? 'bg-bg-surface-dark border-border-base-dark'
            : 'bg-bg-surface-light border-border-base-light'
        }`}
      >
        {/* Hourglass / pending icon */}
        <div className="flex justify-center mb-lg-token">
          <div
            className={`w-20 h-20 rounded-xl-token flex items-center justify-center ${
              isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`w-10 h-10 ${
                isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
              }`}
              aria-hidden="true"
            >
              {/* Hourglass outline */}
              <path d="M5 22h14" />
              <path d="M5 2h14" />
              <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
              <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1
          className={`text-xl-token font-semibold mb-sm-token ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}
        >
          Account Pending Approval
        </h1>

        {/* Primary message */}
        <p
          className={`text-base-token font-medium mb-md-token ${
            isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
          }`}
        >
          Your account is awaiting SuperAdmin approval
        </p>

        {/* Explanatory text */}
        <p
          className={`text-sm-token leading-normal-token mb-lg-token ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}
        >
          Once approved, you will be able to access the full Organizer dashboard. A
          SuperAdmin will review your registration shortly. This page refreshes
          automatically every 30 seconds.
        </p>

        {/* User info badge */}
        {user && (
          <div
            className={`rounded-md-token p-sm-token mb-lg-token text-sm-token ${
              isDarkMode
                ? 'bg-bg-hover-dark text-text-secondary-dark'
                : 'bg-bg-hover-light text-text-secondary-light'
            }`}
          >
            Logged in as{' '}
            <span
              className={`font-medium ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}
            >
              {user.fullName}
            </span>{' '}
            ({user.email})
          </div>
        )}

        {/* Polling status indicator */}
        <div
          className={`flex items-center justify-center gap-xs-token mb-lg-token text-xs-token ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}
          aria-live="polite"
          aria-atomic="true"
        >
          {isChecking ? (
            <>
              {/* Spinner */}
              <span
                className={`
                  inline-block w-3 h-3 rounded-full border-2 border-t-transparent animate-spin
                  ${isDarkMode ? 'border-brand-primary-dark' : 'border-brand-primary-light'}
                `}
                role="status"
                aria-label="Checking account status"
              />
              <span>Checking status...</span>
            </>
          ) : (
            <span>Next check in ~30 seconds</span>
          )}
        </div>

        {/* Divider */}
        <div
          className={`border-t mb-lg-token ${
            isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'
          }`}
        />

        {/* Logout — the only navigation action available */}
        <button
          type="button"
          onClick={handleLogout}
          className={`
            w-full rounded-md-token px-md-token py-sm-token
            text-sm-token font-medium
            border transition-colors duration-150
            ${
              isDarkMode
                ? 'border-border-base-dark text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
                : 'border-border-base-light text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light'
            }
          `}
        >
          Sign out
        </button>
      </BentoCard>
    </div>
  );
}
