import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Sun, Moon, Menu, LayoutDashboard } from 'lucide-react';
import { Sidebar } from './Sidebar';

export default function PublicNavBar() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDarkMode = theme === 'dark';

  const [drawerOpen, setDrawerOpen] = useState(false);

  const isExposActive = location.pathname.startsWith('/expos');

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
          isDarkMode
            ? 'bg-glass-dark border-glass-border-dark text-text-primary-dark'
            : 'bg-glass-light border-glass-border-light text-text-primary-light'
        }`}
      >
        <div className="max-w-6xl mx-auto px-md-token md:px-lg-token h-14 flex items-center justify-between gap-md-token">
          {/* Left group: Hamburger (if logged in) + Brand Logo */}
          <div className="flex items-center gap-sm-token md:gap-md-token">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className={`flex items-center justify-center w-9 h-9 rounded-md-token transition-colors ${
                  isDarkMode
                    ? 'text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
                    : 'text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light'
                }`}
                aria-label="Open navigation menu"
                title="Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <Link
              to="/"
              className={`text-base-token md:text-lg-token font-bold tracking-tight transition-colors ${
                isDarkMode ? 'text-brand-primary-dark hover:opacity-90' : 'text-brand-primary-light hover:opacity-90'
              }`}
            >
              EventSphere
            </Link>
          </div>

          {/* Center nav links */}
          <nav className="flex items-center gap-md-token">
            <Link
              to="/expos"
              className={`text-sm-token font-medium transition-colors px-sm-token py-1 rounded-md-token ${
                isExposActive
                  ? isDarkMode
                    ? 'text-brand-primary-dark font-semibold'
                    : 'text-brand-primary-light font-semibold'
                  : isDarkMode
                  ? 'text-text-secondary-dark hover:text-text-primary-dark'
                  : 'text-text-secondary-light hover:text-text-primary-light'
              }`}
            >
              Browse Expos
            </Link>
          </nav>

          {/* Right actions: Theme toggle + Dashboard / Auth buttons */}
          <div className="flex items-center gap-xs-token sm:gap-sm-token">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className={`w-9 h-9 flex items-center justify-center rounded-md-token transition-colors ${
                isDarkMode
                  ? 'text-text-secondary-dark hover:text-text-primary-dark hover:bg-bg-hover-dark'
                  : 'text-text-secondary-light hover:text-text-primary-light hover:bg-bg-hover-light'
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {isAuthenticated && user ? (
              <button
                type="button"
                onClick={() => navigate('/')}
                className={`inline-flex items-center gap-1.5 px-sm-token md:px-md-token py-xs-token rounded-md-token text-xs-token md:text-sm-token font-medium border transition-colors ${
                  isDarkMode
                    ? 'border-border-base-dark text-text-primary-dark hover:bg-bg-hover-dark'
                    : 'border-border-base-light text-text-primary-light hover:bg-bg-hover-light'
                }`}
                title="Go to Dashboard"
              >
                <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                <span>Dashboard</span>
              </button>
            ) : (
              <div className="flex items-center gap-xs-token sm:gap-sm-token">
                <Link
                  to="/login"
                  className={`px-sm-token py-xs-token text-sm-token font-medium transition-colors ${
                    isDarkMode
                      ? 'text-text-secondary-dark hover:text-text-primary-dark'
                      : 'text-text-secondary-light hover:text-text-primary-light'
                  }`}
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className={`px-sm-token md:px-md-token py-xs-token rounded-md-token text-xs-token md:text-sm-token font-semibold transition-colors ${
                    isDarkMode
                      ? 'bg-brand-primary-dark text-text-on-primary-dark hover:bg-accent-hover-dark'
                      : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light'
                  }`}
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Role-based Sidebar Drawer overlay when opened on public pages */}
      {drawerOpen && isAuthenticated && (
        <Sidebar isDrawer onClose={() => setDrawerOpen(false)} />
      )}
    </>
  );
}
