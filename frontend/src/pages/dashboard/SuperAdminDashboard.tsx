import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

export default function SuperAdminDashboard() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const navigate = useNavigate();

  return (
    <div
      className={`min-h-screen p-lg-token ${
        isDarkMode ? 'bg-bg-base-dark text-text-primary-dark' : 'bg-bg-base-light text-text-primary-light'
      }`}
    >
      <div
        className={`rounded-lg-token border p-lg-token ${
          isDarkMode
            ? 'bg-bg-surface-dark border-border-base-dark'
            : 'bg-bg-surface-light border-border-base-light'
        }`}
      >
        <h1 className="text-xl-token font-semibold mb-sm-token">SuperAdmin Dashboard</h1>
        <p
          className={`text-sm-token mb-lg-token ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}
        >
          Coming soon — full admin capabilities will be available in a future phase.
        </p>

        {/* Action buttons */}
        <div className="flex gap-sm-token flex-wrap">
          {/* Primary action: navigate to organizer approvals */}
          <button
            onClick={() => navigate('/admin/approvals')}
            className={`
              px-md-token py-sm-token
              rounded-lg-token
              text-sm-token font-semibold
              text-text-on-primary-dark
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-offset-2
              ${
                isDarkMode
                  ? 'bg-brand-primary-dark hover:bg-brand-secondary-dark focus:ring-brand-primary-dark focus:ring-offset-bg-base-dark'
                  : 'bg-brand-primary-light hover:bg-brand-secondary-light focus:ring-brand-primary-light focus:ring-offset-bg-base-light'
              }
            `}
            aria-label="Navigate to organizer approvals page"
          >
            Manage Organizer Approvals
          </button>

          {/* Secondary action: view all organizers */}
          <button
            onClick={() => navigate('/admin/organizers')}
            className={`
              px-md-token py-sm-token
              rounded-lg-token
              text-sm-token font-semibold
              border transition-colors
              focus:outline-none focus:ring-2 focus:ring-offset-2
              ${isDarkMode
                ? 'border-border-base-dark text-text-primary-dark hover:bg-bg-hover-dark focus:ring-brand-primary-dark focus:ring-offset-bg-base-dark'
                : 'border-border-base-light text-text-primary-light hover:bg-bg-hover-light focus:ring-brand-primary-light focus:ring-offset-bg-base-light'
              }
            `}
            aria-label="View all organizers"
          >
            View All Organizers
          </button>
        </div>
      </div>
    </div>
  );
}
