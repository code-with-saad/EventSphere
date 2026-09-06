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
} from 'lucide-react';

interface NavLink {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_LINKS: Record<string, NavLink[]> = {
  superadmin: [
    { label: 'Dashboard',  path: '/dashboard/superadmin', icon: LayoutDashboard },
    { label: 'Approvals',  path: '/admin/approvals',      icon: CheckCircle },
    { label: 'Organizers', path: '/admin/organizers',     icon: Users },
    { label: 'Reports',    path: '/admin/reports',        icon: BarChart3 },
  ],
  organizer: [
    { label: 'Dashboard', path: '/dashboard/organizer', icon: BarChart3 },
    { label: 'My Expos',  path: '/organizer/expos',      icon: CalendarDays },
    { label: 'Scanner',   path: '/organizer/scanner',   icon: ScanLine },
    { label: 'Expos',     path: '/expos',               icon: Compass },
  ],
  exhibitor: [
    { label: 'Dashboard',    path: '/dashboard/exhibitor',     icon: Store },
    { label: 'Applications', path: '/exhibitor/applications', icon: FileText },
    { label: 'Expos',        path: '/expos',                  icon: Compass },
  ],
  attendee: [
    { label: 'Dashboard', path: '/dashboard/attendee', icon: Ticket },
    { label: 'Tickets',   path: '/attendee/tickets',   icon: Ticket },
    { label: 'Expos',     path: '/expos',              icon: Compass },
  ],
};

export function BottomNav() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isDarkMode = theme === 'dark';
  const navLinks = user ? (NAV_LINKS[user.role] ?? []) : [];

  if (navLinks.length === 0) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav
      className={[
        // layout — mobile only, fixed at bottom
        'md:hidden fixed bottom-0 inset-x-0 z-30',
        'flex items-stretch',
        // glass effect
        isDarkMode
          ? 'bg-glass-dark border-glass-border-dark'
          : 'bg-glass-light border-glass-border-light',
        'border-t backdrop-blur-md',
      ].join(' ')}
      aria-label="Mobile navigation"
    >
      {navLinks.map((link) => {
        const active = isActive(link.path);
        return (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            // min 44 px height for touch targets
            className={[
              'flex flex-1 flex-col items-center justify-center gap-1',
              'min-h-[44px] py-xs-token px-xs-token',
              'text-xs-token font-medium transition-colors duration-150',
              active
                ? isDarkMode
                  ? 'text-brand-primary-dark'
                  : 'text-brand-primary-light'
                : isDarkMode
                  ? 'text-text-secondary-dark'
                  : 'text-text-secondary-light',
            ].join(' ')}
            aria-current={active ? 'page' : undefined}
            aria-label={link.label}
          >
            <link.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="truncate max-w-full">{link.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
