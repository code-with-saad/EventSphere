import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Maps each user role to its designated dashboard path
const ROLE_DASHBOARD_ROUTES: Record<string, string> = {
  superadmin: '/dashboard/superadmin',
  organizer: '/dashboard/organizer',
  exhibitor: '/dashboard/exhibitor',
  attendee: '/dashboard/attendee',
};

/**
 * Returns the role-specific dashboard route for a given role.
 * Falls back to '/dashboard' if the role is unrecognised.
 */
function getRoleDashboard(role: string): string {
  return ROLE_DASHBOARD_ROUTES[role] ?? '/dashboard';
}

interface ProtectedRouteProps {
  /** Roles that are permitted to access this route */
  allowedRoles: string[];
  /** Content to render when the user is authenticated and authorised */
  children: ReactNode;
}

/**
 * ProtectedRoute — frontend Route_Guard
 *
 * Behaviour (satisfies Requirements 16.1 – 16.8):
 *  • While auth state is loading → shows a centred loading spinner
 *  • Not authenticated           → redirects to /login  (16.2)
 *  • Authenticated, wrong role   → redirects to the user's own dashboard  (16.3)
 *  • Authenticated, correct role → renders children  (16.1)
 */
export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // ── Loading state ────────────────────────────────────────────────────────────
  // Show a spinner while the auth context determines the current session state.
  if (isLoading) {
    return (
      <div
        className={`
          min-h-screen flex items-center justify-center
          ${isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'}
        `}
      >
        {/* Spinner ring */}
        <div
          className={`
            w-12 h-12 rounded-full border-4
            border-t-transparent animate-spin
            ${isDarkMode
              ? 'border-brand-primary-dark'
              : 'border-brand-primary-light'}
          `}
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  // ── Not authenticated ─────────────────────────────────────────────────────
  // Requirement 16.2: redirect unauthenticated visitors to /login.
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // ── Role check ────────────────────────────────────────────────────────────
  // Requirement 16.3: users whose role is not in allowedRoles are sent to their
  // own dashboard rather than seeing a 403 page.
  const userRole = user.role.toLowerCase();
  const isAuthorised = allowedRoles
    .map((r) => r.toLowerCase())
    .includes(userRole);

  if (!isAuthorised) {
    return <Navigate to={getRoleDashboard(userRole)} replace />;
  }

  // ── Authorised ────────────────────────────────────────────────────────────
  return <>{children}</>;
}
