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
} from 'lucide-react';

interface NavLink {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_LINKS: Record<string, NavLink[]> = {
  superadmin: [
    { label: 'Dashboard',           path: '/dashboard/superadmin', icon: LayoutDashboard },
    { label: 'Organizer Approvals', path: '/admin/approvals',      icon: CheckCircle },
    { label: 'All Organizers',      path: '/admin/organizers',     icon: Users },
  ],
  organizer: [
    { label: 'Dashboard', path: '/dashboard/organizer', icon: BarChart3 },
    { label: 'My Expos',  path: '/organizer/expos',      icon: CalendarDays },
    { label: 'Scanner',   path: '/organizer/scanner',   icon: ScanLine },
  ],
  exhibitor: [
    { label: 'Dashboard',       path: '/dashboard/exhibitor',      icon: Store },
    { label: 'My Applications', path: '/exhibitor/applications',  icon: FileText },
  ],
  attendee: [
    { label: 'Dashboard',    path: '/dashboard/attendee', icon: Ticket },
    { label: 'My Tickets',   path: '/attendee/tickets',   icon: Ticket },
    { label: 'Browse Expos', path: '/expos',              icon: Compass },
  ],
};

interface SidebarProps {
  /** Optional page title — reserved for future use */
  pageTitle?: string;
}

export function Sidebar({ pageTitle: _pageTitle }: SidebarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isDarkMode = theme === 'dark';
  const navLinks = user ? (NAV_LINKS[user.role] ?? []) : [];

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path: string) => location.pathname === path;

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
              onClick={() => navigate(link.path)}
              className={[
                'flex items-center gap-3 w-full text-left px-md-token py-sm-token rounded-md-token',
                'text-sm-token font-medium transition-colors duration-150',
                active
                  ? isDarkMode
                    ? 'bg-bg-hover-dark text-brand-primary-dark'
                    : 'bg-bg-hover-light text-brand-primary-light'
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
