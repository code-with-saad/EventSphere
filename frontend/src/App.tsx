import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ThemeProvider } from './contexts';
import { useAuth } from './contexts/AuthContext';
import { ToastContainer } from './components/common/ToastContainer';
import React from 'react';
import { RegisterPage, VerifyOTPPage } from './pages/auth';
import { LoginPage } from './pages/auth/LoginPage';
import { RequestResetPage } from './pages/auth/ForgotPassword/RequestResetPage';
import { VerifyResetOTPPage } from './pages/auth/ForgotPassword/VerifyResetOTPPage';
import { ResetPasswordPage } from './pages/auth/ForgotPassword/ResetPasswordPage';
import SuperAdminDashboard from './pages/dashboard/SuperAdminDashboard';
import OrganizerDashboard from './pages/dashboard/OrganizerDashboard';
import ExhibitorDashboard from './pages/dashboard/ExhibitorDashboard';
import AttendeeDashboard from './pages/dashboard/AttendeeDashboard';
import { ProtectedRoute } from './guards/ProtectedRoute';

const ROLE_DASHBOARD_ROUTES: Record<string, string> = {
  superadmin: '/dashboard/superadmin',
  organizer: '/dashboard/organizer',
  exhibitor: '/dashboard/exhibitor',
  attendee: '/dashboard/attendee',
};

function DashboardRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_DASHBOARD_ROUTES[user.role.toLowerCase()] ?? '/login'} replace />;
}

function RootRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated && user) {
    return <Navigate to={ROLE_DASHBOARD_ROUTES[user.role.toLowerCase()] ?? '/dashboard'} replace />;
  }
  return <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated && user) {
    return <Navigate to={ROLE_DASHBOARD_ROUTES[user.role.toLowerCase()] ?? '/dashboard'} replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <ToastContainer />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
            <Route path="/verify-otp" element={<VerifyOTPPage />} />
            <Route path="/forgot-password" element={<RequestResetPage />} />
            <Route path="/forgot-password/verify-otp" element={<VerifyResetOTPPage />} />
            <Route path="/forgot-password/reset" element={<ResetPasswordPage />} />
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/dashboard/superadmin" element={<ProtectedRoute allowedRoles={['superadmin']}><SuperAdminDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/organizer" element={<ProtectedRoute allowedRoles={['organizer']}><OrganizerDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/exhibitor" element={<ProtectedRoute allowedRoles={['exhibitor']}><ExhibitorDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/attendee" element={<ProtectedRoute allowedRoles={['attendee']}><AttendeeDashboard /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
