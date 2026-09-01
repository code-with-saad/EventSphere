import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Sun, Moon } from 'lucide-react';

export default function PublicNavBar() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const isDarkMode = theme === 'dark';

  return (
    <nav className={`sticky top-0 z-40 border-b backdrop-blur-md ${
      isDarkMode
        ? 'bg-glass-dark border-glass-border-dark'
        : 'bg-glass-light border-glass-border-light'
    }`}>
      <div className="max-w-6xl mx-auto px-md-token md:px-lg-token h-14 flex items-center justify-between gap-md-token">
        {/* Brand */}
        <Link
          to={isAuthenticated ? '/' : '/expos'}
          className={`text-base-token font-bold tracking-tight ${
            isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
          }`}
        >
          EventSphere
        </Link>

        {/* Center nav */}
        <Link
          to="/expos"
          className={`text-sm-token font-medium transition-colors ${
            isDarkMode
              ? 'text-text-secondary-dark hover:text-text-primary-dark'
              : 'text-text-secondary-light hover:text-text-primary-light'
          }`}
        >
          Browse Expos
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-sm-token">
          <button
            onClick={toggleTheme}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`w-8 h-8 flex items-center justify-center rounded-md-token transition-colors ${
              isDarkMode
                ? 'text-text-secondary-dark hover:text-text-primary-dark hover:bg-bg-hover-dark'
                : 'text-text-secondary-light hover:text-text-primary-light hover:bg-bg-hover-light'
            }`}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {isAuthenticated && user ? (
            <button
              onClick={() => navigate('/')}
              className={`px-sm-token py-xs-token rounded-md-token text-sm-token font-medium border transition-colors ${
                isDarkMode
                  ? 'border-border-base-dark text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
                  : 'border-border-base-light text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light'
              }`}
            >
              Dashboard
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className={`text-sm-token font-medium transition-colors ${
                  isDarkMode
                    ? 'text-text-secondary-dark hover:text-text-primary-dark'
                    : 'text-text-secondary-light hover:text-text-primary-light'
                }`}
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className={`px-sm-token py-xs-token rounded-md-token text-sm-token font-semibold transition-colors ${
                  isDarkMode
                    ? 'bg-brand-primary-dark text-text-on-primary-dark hover:bg-accent-hover-dark'
                    : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light'
                }`}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
