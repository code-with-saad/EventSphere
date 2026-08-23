import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

interface NavLink {
  label: string;
  path: string;
  icon: string;
}

const NAV_LINKS: Record<string, NavLink[]> = {
  superadmin: [
    { label: 'Dashboard', path: '/dashboard/superadmin', icon: '⚡' },
    { label: 'Approvals', path: '/admin/approvals', icon: '✅' },
    { label: 'Organizers', path: '/admin/organizers', icon: '👥' },
  ],
  organizer: [
    { label: 'Dashboard', path: '/dashboard/organizer', icon: '📊' },
  ],
  exhibitor: [
    { label: 'Dashboard', path: '/dashboard/exhibitor', icon: '🏪' },
  ],
  attendee: [
    { label: 'Dashboard', path: '/dashboard/attendee', icon: '🎫' },
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
          ? 'bg-bg-surface-dark/80 border-border-base-dark'
          : 'bg-bg-surface-light/90 border-border-base-light',
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
            <span
              className={[
                'text-base-token leading-none',
                active
                  ? isDarkMode
                    ? 'text-brand-primary-dark'
                    : 'text-brand-primary-light'
                  : '',
              ].join(' ')}
              aria-hidden="true"
            >
              {link.icon}
            </span>
            <span className="truncate max-w-full">{link.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
