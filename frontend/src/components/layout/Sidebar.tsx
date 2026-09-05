import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  LayoutDashboard,
  CheckCircle,
  Users,
  BarChart3,
  CalendarDays,
  ScanLine,
  Store,
  FileText,
  Ticket,
  Compass,
  Sun,
  Moon,
  LogOut,
  X,
  MessageSquare,
  Bookmark,
} from 'lucide-react';

export interface NavLink {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ROLE_NAV_LINKS: Record<string, NavLink[]> = {
  superadmin: [
    { label: 'Dashboard',           path: '/dashboard/superadmin', icon: LayoutDashboard },
    { label: 'Organizer Approvals', path: '/admin/approvals',      icon: CheckCircle },
    { label: 'All Organizers',      path: '/admin/organizers',     icon: Users },
    { label: 'Feedback & Issues',   path: '/admin/feedback',       icon: MessageSquare },
  ],
  organizer: [
    { label: 'Dashboard',           path: '/dashboard/organizer', icon: LayoutDashboard },
    { label: 'My Expos',            path: '/organizer/expos',     icon: CalendarDays },
    { label: 'Messages',            path: '/organizer/messages',  icon: MessageSquare },
    { label: 'Reports & Analytics', path: '/organizer/analytics', icon: BarChart3 },
    { label: 'Scanner',             path: '/organizer/scanner',   icon: ScanLine },
    { label: 'Browse Expos',        path: '/expos',               icon: Compass },
  ],
  exhibitor: [
    { label: 'Dashboard',           path: '/dashboard/exhibitor',     icon: Store },
    { label: 'My Applications',     path: '/exhibitor/applications', icon: FileText },
    { label: 'Messages',            path: '/exhibitor/messages',     icon: MessageSquare },
    { label: 'Reports & Analytics', path: '/exhibitor/analytics',    icon: BarChart3 },
    { label: 'Browse Expos',        path: '/expos',                  icon: Compass },
  ],
  attendee: [
    { label: 'Dashboard',              path: '/dashboard/attendee', icon: LayoutDashboard },
    { label: 'My Tickets',             path: '/attendee/tickets',   icon: Ticket },
    { label: 'Bookmarks & Favorites',  path: '/attendee/bookmarks', icon: Bookmark },
    { label: 'Browse Expos',           path: '/expos',              icon: Compass },
  ],
};

interface SidebarProps {
  /** Optional page title — reserved for future use */
  pageTitle?: string;
  /** When true, renders in drawer mode (e.g. mobile/overlay) */
  isDrawer?: boolean;
  /** Callback to close the drawer */
  onClose?: () => void;
}

export function Sidebar({ pageTitle: _pageTitle, isDrawer = false, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isDarkMode = theme === 'dark';
  const navLinks = user ? (ROLE_NAV_LINKS[user.role] ?? []) : [];

  const handleLogout = async () => {
    await logout();
    if (onClose) onClose();
    navigate('/login', { replace: true });
  };

  const handleNavClick = (path: string) => {
    if (onClose) onClose();
    navigate(path);
  };

  const isActive = (path: string) => location.pathname === path;

  // Drawer modal/overlay rendering
  if (isDrawer) {
    return (
      <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navigation drawer">
        {/* Backdrop / scrim */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Drawer panel */}
        <aside
          className={`relative flex flex-col w-72 max-w-[85vw] h-full z-10 shadow-2xl backdrop-blur-xl border-r transition-transform duration-200 ease-out animate-in slide-in-from-left ${
            isDarkMode
              ? 'bg-glass-dark border-glass-border-dark text-text-primary-dark'
              : 'bg-glass-light border-glass-border-light text-text-primary-light'
          }`}
        >
          {/* Header row with Brand & Close button */}
          <div className="flex items-center justify-between px-lg-token py-md-token border-b border-border-base-dark/20">
            <span
              className={`text-lg-token font-bold ${
                isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
              }`}
            >
              EventSphere
            </span>
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-md-token transition-colors ${
                isDarkMode
                  ? 'text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
                  : 'text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light'
              }`}
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile snippet in drawer */}
          {user && (
            <button
              onClick={() => handleNavClick('/profile')}
              className={[
                'w-full text-left px-lg-token py-sm-token border-b flex items-center gap-3 transition-colors',
                isDarkMode 
                  ? 'border-border-base-dark/20 hover:bg-bg-hover-dark' 
                  : 'border-border-base-light/20 hover:bg-bg-hover-light'
              ].join(' ')}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName || user.email}
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-border-base-dark/20"
                />
              ) : (
                <span
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs-token font-bold shrink-0 ${
                    isDarkMode
                      ? 'bg-brand-primary-dark text-text-on-primary-dark'
                      : 'bg-brand-primary-light text-text-on-primary-light'
                  }`}
                >
                  {(user.fullName || user.email || 'U').charAt(0).toUpperCase()}
                </span>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-sm-token font-semibold truncate">
                  {user.fullName || user.email}
                </span>
                <span className={`text-[11px] capitalize ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  {user.role}
                </span>
              </div>
            </button>
          )}

          {/* Nav links */}
          <nav className="flex-1 flex flex-col gap-1 px-sm-token py-md-token overflow-y-auto">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <button
                  key={link.path}
                  onClick={() => handleNavClick(link.path)}
                  className={[
                    'flex items-center gap-3 w-full text-left px-md-token py-sm-token rounded-md-token',
                    'text-sm-token font-medium transition-colors duration-150',
                    active
                      ? isDarkMode
                        ? 'bg-bg-hover-dark text-brand-primary-dark font-semibold'
                        : 'bg-bg-hover-light text-brand-primary-light font-semibold'
                      : isDarkMode
                        ? 'text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
                        : 'text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light',
                  ].join(' ')}
                  aria-current={active ? 'page' : undefined}
                >
                  <link.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div
            className={`flex flex-col gap-2 px-sm-token py-md-token border-t ${
              isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'
            }`}
          >
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className={[
                'flex items-center gap-3 w-full text-left px-md-token py-sm-token rounded-md-token',
                'text-sm-token font-medium transition-colors duration-150',
                isDarkMode
                  ? 'text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
                  : 'text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light',
              ].join(' ')}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className={[
                'flex items-center gap-3 w-full text-left px-md-token py-sm-token rounded-md-token',
                'text-sm-token font-medium transition-colors duration-150',
                isDarkMode
                  ? 'text-text-danger-dark hover:bg-bg-danger-dark'
                  : 'text-text-danger-light hover:bg-bg-danger-light',
              ].join(' ')}
            >
              <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        </aside>
      </div>
    );
  }

  // Default desktop fixed sidebar
  return (
    <aside
      className={[
        // layout
        'hidden md:flex flex-col fixed inset-y-0 left-0 w-64 z-30',
        // glass effect
        isDarkMode
          ? 'bg-glass-dark border-glass-border-dark'
          : 'bg-glass-light border-glass-border-light',
        'border-r backdrop-blur-md',
      ].join(' ')}
    >
      {/* ── Brand ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-p-md-token px-lg-token py-lg-token">
        <span
          className={[
            'text-xl-token font-bold',
            isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light',
          ].join(' ')}
        >
          EventSphere
        </span>
      </div>

      {/* ── Nav links ─────────────────────────────────────────── */}
      <nav className="flex-1 flex flex-col gap-1 px-sm-token overflow-y-auto">
        {navLinks.map((link) => {
          const active = isActive(link.path);
          return (
            <button
              key={link.path}
              onClick={() => handleNavClick(link.path)}
              className={[
                'flex items-center gap-3 w-full text-left px-md-token py-sm-token rounded-md-token',
                'text-sm-token font-medium transition-colors duration-150',
                active
                  ? isDarkMode
                    ? 'bg-bg-hover-dark text-brand-primary-dark font-semibold'
                    : 'bg-bg-hover-light text-brand-primary-light font-semibold'
                  : isDarkMode
                    ? 'text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
                    : 'text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light',
              ].join(' ')}
              aria-current={active ? 'page' : undefined}
            >
              <link.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{link.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Bottom actions ────────────────────────────────────── */}
      <div
        className={[
          'flex flex-col gap-2 px-sm-token py-lg-token',
          'border-t',
          isDarkMode ? 'border-border-base-dark' : 'border-border-base-light',
        ].join(' ')}
      >
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={[
            'flex items-center gap-3 w-full text-left px-md-token py-sm-token rounded-md-token',
            'text-sm-token font-medium transition-colors duration-150',
            isDarkMode
              ? 'text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
              : 'text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light',
          ].join(' ')}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode
            ? <Sun  className="w-4 h-4" aria-hidden="true" />
            : <Moon className="w-4 h-4" aria-hidden="true" />
          }
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={[
            'flex items-center gap-3 w-full text-left px-md-token py-sm-token rounded-md-token',
            'text-sm-token font-medium transition-colors duration-150',
            isDarkMode
              ? 'text-text-danger-dark hover:bg-bg-danger-dark'
              : 'text-text-danger-light hover:bg-bg-danger-light',
          ].join(' ')}
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
