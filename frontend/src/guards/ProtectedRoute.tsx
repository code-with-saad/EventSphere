import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getHomeRoute } from '../App';

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: ReactNode;
}

/**
 * ProtectedRoute — frontend Route_Guard
 *
 * Behaviour (satisfies Requirements 16.1 – 16.8):
 *  • While auth state is loading → shows a centred loading spinner
 *  • Not authenticated           → redirects to /login  (16.2)
 *  • Authenticated, wrong role   → redirects to the user's correct home (16.3)
 *    (uses getHomeRoute so a pending organizer is sent to /dashboard/pending-approval
 *     rather than /dashboard/organizer)
 *  • Authenticated, correct role → renders children  (16.1)
 */
export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className={`
          min-h-screen flex items-center justify-center
          ${isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'}
        `}
      >
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

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // ── Role check ─────────────────────────────────────────────────────────────
  const userRole = user.role.toLowerCase();
  const isAuthorised = allowedRoles.map((r) => r.toLowerCase()).includes(userRole);

  if (!isAuthorised) {
    return <Navigate to={getHomeRoute(user)} replace />;
  }

  // ── Authorised ─────────────────────────────────────────────────────────────
  return <>{children}</>;
}
