import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ThemeProvider } from './contexts';
import { useAuth } from './contexts/AuthContext';
import { ToastContainer } from './components/common/ToastContainer';

// Auth pages
import { RegisterPage, VerifyOTPPage } from './pages/auth';
import { LoginPage } from './pages/auth/LoginPage';
import { RequestResetPage } from './pages/auth/ForgotPassword/RequestResetPage';
import { VerifyResetOTPPage } from './pages/auth/ForgotPassword/VerifyResetOTPPage';
import { ResetPasswordPage } from './pages/auth/ForgotPassword/ResetPasswordPage';

// Dashboard pages
import SuperAdminDashboard from './pages/dashboard/SuperAdminDashboard';
import OrganizerDashboard from './pages/dashboard/OrganizerDashboard';
import ExhibitorDashboard from './pages/dashboard/ExhibitorDashboard';
import AttendeeDashboard from './pages/dashboard/AttendeeDashboard';

// Route guard
import { ProtectedRoute } from './guards/ProtectedRoute';

// Role → dashboard path mapping (mirrors the mapping in ProtectedRoute)
const ROLE_DASHBOARD_ROUTES: Record<string, string> = {
  superadmin: '/dashboard/superadmin',
  organizer: '/dashboard/organizer',
  exhibitor: '/dashboard/exhibitor',
  attendee: '/dashboard/attendee',
};

/**
 * Redirects an authenticated user to their role-specific dashboard,
 * or to /login if they are not authenticated.
 * Falls back to /dashboard if the role is unrecognised.
 */
function DashboardRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Wait for auth state to settle before redirecting
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const destination = ROLE_DASHBOARD_ROUTES[user.role.toLowerCase()] ?? '/login';
  return <Navigate to={destination} replace />;
}

/**
 * Redirects the root path:
 *  - Authenticated → their role-specific dashboard
 *  - Not authenticated → /login
 */
function RootRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated && user) {
    const destination = ROLE_DASHBOARD_ROUTES[user.role.toLowerCase()] ?? '/dashboard';
    return <Navigate to={destination} replace />;
  }

  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <ToastContainer />
          <Routes>
            {/* ── Root ─────────────────────────────────────────────────────── */}
            <Route path="/" element={<RootRedirect />} />

            {/* ── Public auth routes ───────────────────────────────────────── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<VerifyOTPPage />} />
            <Route path="/forgot-password" element={<RequestResetPage />} />
            <Route path="/forgot-password/verify-otp" element={<VerifyResetOTPPage />} />
            <Route path="/forgot-password/reset" element={<ResetPasswordPage />} />

            {/* ── Smart /dashboard redirect (role-based) ───────────────────── */}
            <Route path="/dashboard" element={<DashboardRedirect />} />

            {/* ── Protected role-specific dashboards ──────────────────────── */}
            <Route
              path="/dashboard/superadmin"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/organizer"
              element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <OrganizerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/exhibitor"
              element={
                <ProtectedRoute allowedRoles={['exhibitor']}>
                  <ExhibitorDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/attendee"
              element={
                <ProtectedRoute allowedRoles={['attendee']}>
                  <AttendeeDashboard />
                </ProtectedRoute>
              }
            />

            {/* ── 404 fallback ─────────────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
