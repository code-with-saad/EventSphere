import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Sun, Moon, Menu, X, LayoutDashboard } from 'lucide-react';
import { Sidebar } from './Sidebar';

const NAV_LINKS = [
  { label: 'Home',         to: '/',        exact: true  },
  { label: 'About',        to: '/about',   exact: false },
  { label: 'Gallery',      to: '/gallery', exact: false },
  { label: 'Browse Expos', to: '/expos',   exact: false },
];

export default function PublicNavBar() {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDarkMode = theme === 'dark';

  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isActive = (to: string, exact: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

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
          {/* Left: Authenticated drawer toggle + Brand */}
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

          {/* Center: Desktop nav links */}
          <nav className="hidden md:flex items-center gap-xs-token" aria-label="Public navigation">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.to, link.exact);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm-token font-medium transition-colors px-sm-token py-1 rounded-md-token ${
                    active
                      ? isDarkMode
                        ? 'text-brand-primary-dark font-semibold'
                        : 'text-brand-primary-light font-semibold'
                      : isDarkMode
                      ? 'text-text-secondary-dark hover:text-text-primary-dark'
                      : 'text-text-secondary-light hover:text-text-primary-light'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Theme toggle + Dashboard/Auth + Mobile hamburger */}
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
                onClick={() => navigate('/dashboard')}
                className={`hidden sm:inline-flex items-center gap-1.5 px-sm-token md:px-md-token py-xs-token rounded-md-token text-xs-token md:text-sm-token font-medium border transition-colors ${
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
              <div className="hidden sm:flex items-center gap-xs-token sm:gap-sm-token">
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

            {/* Mobile hamburger — public (unauthenticated) visitors only */}
            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => setMobileNavOpen((v) => !v)}
                className={`md:hidden flex items-center justify-center w-9 h-9 rounded-md-token transition-colors ${
                  isDarkMode
                    ? 'text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
                    : 'text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light'
                }`}
                aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile dropdown nav (public visitors only) */}
        {mobileNavOpen && !isAuthenticated && (
          <div
            className={`md:hidden border-t px-md-token py-sm-token flex flex-col gap-1 ${
              isDarkMode
                ? 'bg-glass-dark border-glass-border-dark'
                : 'bg-glass-light border-glass-border-light'
            }`}
          >
            {NAV_LINKS.map((link) => {
              const active = isActive(link.to, link.exact);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileNavOpen(false)}
                  className={`block px-sm-token py-sm-token rounded-md-token text-sm-token font-medium transition-colors ${
                    active
                      ? isDarkMode
                        ? 'bg-bg-hover-dark text-brand-primary-dark font-semibold'
                        : 'bg-bg-hover-light text-brand-primary-light font-semibold'
                      : isDarkMode
                      ? 'text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
                      : 'text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="border-t mt-1 pt-sm-token flex gap-sm-token">
              <Link
                to="/login"
                onClick={() => setMobileNavOpen(false)}
                className={`flex-1 text-center px-sm-token py-xs-token text-sm-token font-medium rounded-md-token border transition-colors ${
                  isDarkMode
                    ? 'border-border-base-dark text-text-primary-dark hover:bg-bg-hover-dark'
                    : 'border-border-base-light text-text-primary-light hover:bg-bg-hover-light'
                }`}
              >
                Sign in
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileNavOpen(false)}
                className={`flex-1 text-center px-sm-token py-xs-token rounded-md-token text-sm-token font-semibold transition-colors ${
                  isDarkMode
                    ? 'bg-brand-primary-dark text-text-on-primary-dark hover:bg-accent-hover-dark'
                    : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light'
                }`}
              >
                Get started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Role-based Sidebar Drawer overlay when opened on public pages */}
      {drawerOpen && isAuthenticated && (
        <Sidebar isDrawer onClose={() => setDrawerOpen(false)} />
      )}
    </>
  );
}
