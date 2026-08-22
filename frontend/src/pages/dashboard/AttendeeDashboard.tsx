import { useTheme } from '../../contexts/ThemeContext';

export default function AttendeeDashboard() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

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
        <h1 className="text-xl-token font-semibold mb-sm-token">Attendee Dashboard</h1>
        <p className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
          Coming soon — event browsing and ticketing will be available in a future phase.
        </p>
      </div>
    </div>
  );
}
