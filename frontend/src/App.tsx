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
import AdminApprovalsPage from './pages/admin/AdminApprovalsPage';
import AllOrganizersPage from './pages/admin/AllOrganizersPage';
import OrganizerDashboard from './pages/dashboard/OrganizerDashboard';
import ExhibitorDashboard from './pages/dashboard/ExhibitorDashboard';
import AttendeeDashboard from './pages/dashboard/AttendeeDashboard';
import PendingApprovalScreen from './components/dashboard/PendingApprovalScreen';
import RejectedScreen from './components/dashboard/RejectedScreen';
import { ProtectedRoute } from './guards/ProtectedRoute';
import ExpoListingPage from './pages/expos/ExpoListingPage';
import ExpoDetailPage from './pages/expos/ExpoDetailPage';
import MyExposPage from './pages/organizer/MyExposPage';
import CreateExpoPage from './pages/organizer/CreateExpoPage';
import EditExpoPage from './pages/organizer/EditExpoPage';
import ApplicationsPage from './pages/organizer/ApplicationsPage';
import ApplicationFormPage from './pages/exhibitor/ApplicationFormPage';
import MyApplicationsPage from './pages/exhibitor/MyApplicationsPage';
import MyTicketsPage from './pages/attendee/MyTicketsPage';
import ScheduleBuilderPage from './pages/organizer/ScheduleBuilderPage';
import TicketDetailPage from './pages/attendee/TicketDetailPage';
import ScheduleBrowsePage from './pages/attendee/ScheduleBrowsePage';

/**
 * Single source of truth for where an authenticated user should land.
 *
 * Rules:
 *  - Organizer with status 'pending'  ? /dashboard/pending-approval
 *  - All other roles / active users   ? role-specific dashboard
 */
export function getHomeRoute(user: { role: string; status: string }): string {
  if (user.role === 'organizer' && user.status === 'pending') {
    return '/dashboard/pending-approval';
  }
  if (user.role === 'organizer' && user.status === 'rejected') {
    return '/dashboard/rejected';
  }
  const routes: Record<string, string> = {
    superadmin: '/dashboard/superadmin',
    organizer:  '/dashboard/organizer',
    exhibitor:  '/dashboard/exhibitor',
    attendee:   '/dashboard/attendee',
  };
  return routes[user.role.toLowerCase()] ?? '/dashboard';
}

function DashboardRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={getHomeRoute(user)} replace />;
}

function RootRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated && user) {
    return <Navigate to={getHomeRoute(user)} replace />;
  }
  return <Navigate to="/login" replace />;
}

/**
 * Wraps public-only pages (login, register).
 * If the user is already authenticated, redirect them to their correct home
 * using getHomeRoute � which handles the pending-organizer case too.
 * This is what makes the post-login redirect work without any navigate() call
 * inside LoginPage: as soon as login() sets auth state, this re-renders and
 * sends the user to the right place.
 */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated && user) {
    return <Navigate to={getHomeRoute(user)} replace />;
  }
  return <>{children}</>;
}

// -- Phase 2 page placeholders (replaced by real imports as pages are built) --
const BoothLayoutPage = () => <div>BoothLayoutPage</div>;
const ScannerPage = () => <div>ScannerPage</div>;


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
            <Route path="/admin/approvals" element={<ProtectedRoute allowedRoles={['superadmin']}><AdminApprovalsPage /></ProtectedRoute>} />
            <Route path="/admin/organizers" element={<ProtectedRoute allowedRoles={['superadmin']}><AllOrganizersPage /></ProtectedRoute>} />
            <Route path="/dashboard/organizer" element={<ProtectedRoute allowedRoles={['organizer']}><OrganizerDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/pending-approval" element={<ProtectedRoute allowedRoles={['organizer']}><PendingApprovalScreen /></ProtectedRoute>} />
            <Route path="/dashboard/rejected" element={<ProtectedRoute allowedRoles={['organizer']}><RejectedScreen /></ProtectedRoute>} />
            <Route path="/dashboard/exhibitor" element={<ProtectedRoute allowedRoles={['exhibitor']}><ExhibitorDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/attendee" element={<ProtectedRoute allowedRoles={['attendee']}><AttendeeDashboard /></ProtectedRoute>} />
            {/* -- Phase 2: Public Expo Routes -- */}
            <Route path="/expos" element={<ExpoListingPage />} />
            <Route path="/expos/:id" element={<ExpoDetailPage />} />
            <Route path="/expos/:id/schedule" element={<ScheduleBrowsePage />} />

            {/* -- Phase 2: Organizer Routes -- */}
            <Route path="/organizer/expos" element={<ProtectedRoute allowedRoles={['organizer']}><MyExposPage /></ProtectedRoute>} />
            <Route path="/organizer/expos/new" element={<ProtectedRoute allowedRoles={['organizer']}><CreateExpoPage /></ProtectedRoute>} />
            <Route path="/organizer/expos/:id/edit" element={<ProtectedRoute allowedRoles={['organizer']}><EditExpoPage /></ProtectedRoute>} />
            <Route path="/organizer/expos/:id/applications" element={<ProtectedRoute allowedRoles={['organizer']}><ApplicationsPage /></ProtectedRoute>} />
            <Route path="/organizer/expos/:id/schedule" element={<ProtectedRoute allowedRoles={['organizer']}><ScheduleBuilderPage /></ProtectedRoute>} />
            <Route path="/organizer/expos/:id/booths" element={<ProtectedRoute allowedRoles={['organizer']}><BoothLayoutPage /></ProtectedRoute>} />
            <Route path="/organizer/scanner" element={<ProtectedRoute allowedRoles={['organizer']}><ScannerPage /></ProtectedRoute>} />

            {/* -- Phase 2: Exhibitor Routes -- */}
            <Route path="/exhibitor/applications" element={<ProtectedRoute allowedRoles={['exhibitor']}><MyApplicationsPage /></ProtectedRoute>} />
            <Route path="/expos/:id/apply" element={<ProtectedRoute allowedRoles={['exhibitor']}><ApplicationFormPage /></ProtectedRoute>} />

            {/* -- Phase 2: Attendee Routes -- */}
            <Route path="/attendee/tickets" element={<ProtectedRoute allowedRoles={['attendee']}><MyTicketsPage /></ProtectedRoute>} />
            <Route path="/attendee/tickets/:ticketId" element={<ProtectedRoute allowedRoles={['attendee']}><TicketDetailPage /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;



