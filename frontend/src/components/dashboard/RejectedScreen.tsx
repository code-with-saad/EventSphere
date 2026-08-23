import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { BentoCard } from '../common/BentoCard';

/**
 * RejectedScreen
 *
 * Shown to Organizers whose account status is 'rejected'.
 * No polling — status won't change automatically.
 *
 * Requirements: 10.4
 */
export default function RejectedScreen() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { logout, user } = useAuth();
  const navigate = useNavigate();

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
        {/* X-circle / rejection icon */}
        <div className="flex justify-center mb-lg-token">
          <div
            className={`w-20 h-20 rounded-xl-token flex items-center justify-center ${
              isDarkMode ? 'bg-bg-danger-dark' : 'bg-bg-danger-light'
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
                isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
              }`}
              aria-hidden="true"
            >
              {/* X-circle */}
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6" />
              <path d="M9 9l6 6" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1
          className={`text-xl-token font-semibold mb-sm-token ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}
        >
          Application Not Approved
        </h1>

        {/* Primary message */}
        <p
          className={`text-base-token font-medium mb-md-token ${
            isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
          }`}
        >
          Your organizer application was not approved
        </p>

        {/* Explanatory text */}
        <p
          className={`text-sm-token leading-normal-token mb-md-token ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}
        >
          Unfortunately, your organizer registration was not approved. If you believe
          this is an error or would like to appeal, please contact our support team.
        </p>

        {/* Support contact line */}
        <p
          className={`text-sm-token leading-normal-token mb-lg-token ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}
        >
          Need help? Contact us at{' '}
          <a
            href="mailto:support@eventsphere.com"
            className={`underline ${
              isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
            }`}
          >
            support@eventsphere.com
          </a>
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

        {/* Divider */}
        <div
          className={`border-t mb-lg-token ${
            isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'
          }`}
        />

        {/* Sign out */}
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
