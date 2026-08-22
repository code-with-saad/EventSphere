import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { TestDesignTokens } from "./components/TestDesignTokens";
import { TestContexts } from "./components/TestContexts";
import { TestToast } from "./components/TestToast";
import { AuthProvider, ThemeProvider } from "./contexts";
import { useAuth } from "./contexts/AuthContext";
import { ToastContainer } from "./components/common/ToastContainer";
import { RegisterPage, VerifyOTPPage } from "./pages/auth";
import { LoginPage } from "./pages/auth/LoginPage";
import { RequestResetPage } from "./pages/auth/ForgotPassword/RequestResetPage";
import { VerifyResetOTPPage } from "./pages/auth/ForgotPassword/VerifyResetOTPPage";
import { ResetPasswordPage } from "./pages/auth/ForgotPassword/ResetPasswordPage";

function Home() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>EventSphere - Home</h1>
      <p>Welcome to EventSphere Frontend</p>
      <nav>
        <Link to="/about">Go to About</Link> | <Link to="/design-test">Design Tokens Test</Link> | <Link to="/context-test">Context Test</Link> | <Link to="/toast-test">Toast Test</Link> | <Link to="/register">Register</Link>
      </nav>
    </div>
  );
}

function About() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>About EventSphere</h1>
      <p>This is the about page</p>
      <nav>
        <Link to="/">Go to Home</Link>
      </nav>
    </div>
  );
}

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    return <Navigate to="/dashboard" replace />;
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
            <Route path="/" element={<RootRedirect />} />
            <Route path="/about" element={<About />} />
            <Route path="/design-test" element={<TestDesignTokens />} />
            <Route path="/context-test" element={<TestContexts />} />
            <Route path="/toast-test" element={<TestToast />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<VerifyOTPPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password/request" element={<RequestResetPage />} />
            <Route path="/forgot-password/verify-otp" element={<VerifyResetOTPPage />} />
            <Route path="/forgot-password/reset" element={<ResetPasswordPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
