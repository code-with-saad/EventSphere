import { useAuth, useTheme } from '../contexts';

export function TestContexts() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isDarkMode = theme === 'dark';

  return (
    <div className={`p-8 min-h-screen ${isDarkMode ? 'bg-bg-base-dark text-text-primary-dark' : 'bg-bg-base-light text-text-primary-light'}`}>
      <h1 className="text-xl-token font-bold mb-lg-token">Context Test Page</h1>
      
      <div className={`mt-8 p-6 border rounded-lg-token ${isDarkMode ? 'bg-bg-surface-dark border-border-base-dark' : 'bg-bg-surface-light border-border-base-light'}`}>
        <h2 className="text-lg-token font-semibold mb-4">Theme Context</h2>
        <p className="mb-4">Current theme: <strong className={isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}>{theme}</strong></p>
        <button 
          onClick={toggleTheme}
          className={`px-4 py-2 rounded-md-token font-medium transition-colors ${
            isDarkMode 
              ? 'bg-brand-primary-dark text-text-on-primary-dark hover:bg-brand-secondary-dark' 
              : 'bg-brand-primary-light text-text-on-primary-light hover:bg-brand-secondary-light'
          }`}
        >
          Toggle Theme
        </button>
        <p className={`mt-4 text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
          Check the document root element - it should have the theme class applied.
        </p>
      </div>

      <div className={`mt-8 p-6 border rounded-lg-token ${isDarkMode ? 'bg-bg-surface-dark border-border-base-dark' : 'bg-bg-surface-light border-border-base-light'}`}>
        <h2 className="text-lg-token font-semibold mb-4">Auth Context</h2>
        <p className="mb-2">Is Loading: <strong className={isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}>{isLoading ? 'Yes' : 'No'}</strong></p>
        <p className="mb-2">Is Authenticated: <strong className={isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}>{isAuthenticated ? 'Yes' : 'No'}</strong></p>
        <p className="mb-2">User: <strong className="font-mono text-sm-token">{user ? JSON.stringify(user, null, 2) : 'null'}</strong></p>
        <p className={`mt-4 text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
          Note: User will be null until login is implemented and called.
        </p>
      </div>
    </div>
  );
}
