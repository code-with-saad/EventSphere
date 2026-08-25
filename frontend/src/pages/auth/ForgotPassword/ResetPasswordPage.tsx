import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BentoCard } from '../../../components/common';
import { showSuccess, showError } from '../../../utils/toast';
import api from '../../../services/api';
import { useTheme } from '../../../contexts/ThemeContext';

/**
 * ResetPasswordPage component - Reset password with reset token
 * 
 * Features:
 * - Accept reset token from navigation state (passed from VerifyResetOTPPage)
 * - Form with fields: newPassword, confirmPassword
 * - Client-side validation: passwords match, min 8 characters
 * - Inline error display below each field
 * - API call to POST /api/auth/forgot-password/reset with reset token
 * - Success: show toast "Password reset successfully", redirect to /login
 * - Error (expired token): show toast "Reset link expired, please request a new one"
 * - Error (other): show toast with error message
 * - Loading spinner on submit button during API call
 * - Styled with Tailwind and BentoCard component
 * 
 * Validates Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Extract reset token from navigation state or localStorage
  const navigationToken = location.state?.resetToken as string | undefined;
  const [resetToken, setResetToken] = useState<string | undefined>(navigationToken);

  // Form state
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Validation errors state
  const [errors, setErrors] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Show/hide password toggles
  const [showPasswords, setShowPasswords] = useState({
    newPassword: false,
    confirmPassword: false,
  });

  // Redirect to request page if no reset token
  useEffect(() => {
    // Try to get token from localStorage if not in state
    if (!navigationToken) {
      const storedToken = localStorage.getItem('resetToken');
      if (storedToken) {
        setResetToken(storedToken);
      } else {
        showError('No reset token provided. Please request a password reset.');
        navigate('/forgot-password');
      }
    }
  }, [navigationToken, navigate]);

  // Password validation function
  const validateNewPassword = (password: string): string => {
    if (!password) {
      return 'New password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    return '';
  };

  // Confirm password validation function
  const validateConfirmPassword = (password: string, newPassword: string): string => {
    if (!password) {
      return 'Please confirm your password';
    }
    if (password !== newPassword) {
      return 'Passwords do not match';
    }
    return '';
  };

  // Handle input change with validation
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const newErrors = {
      newPassword: validateNewPassword(formData.newPassword),
      confirmPassword: validateConfirmPassword(formData.confirmPassword, formData.newPassword),
    };

    setErrors(newErrors);

    // Return true if no errors
    return !Object.values(newErrors).some((error) => error !== '');
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    if (!resetToken) {
      showError('Reset token not found. Please request a password reset.');
      navigate('/forgot-password');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/api/auth/forgot-password/reset', {
        resetToken,
        newPassword: formData.newPassword,
      });

      // Success: show toast and redirect to login
      showSuccess('Password reset successfully. You can now log in with your new password.');

      // Clear reset token from localStorage
      localStorage.removeItem('resetToken');

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error: any) {
      // Handle API errors with specific messages
      const errorStatus = error.response?.status;
      const errorMessage = error.response?.data?.message || 'Password reset failed. Please try again.';

      // Check for specific error cases
      if (errorStatus === 400 || errorMessage.toLowerCase().includes('expired')) {
        showError('Reset link expired. Please request a new password reset.');
      } else {
        showError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if no reset token (will redirect)
  if (!resetToken) {
    return null;
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-8 ${isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'}`}>
      <div className="w-full max-w-md">
        <BentoCard>
          {/* Header */}
          <div className="mb-6">
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
              Create New Password
            </h1>
            <p className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>
              Enter your new password to reset your account
            </p>
          </div>

          {/* Reset Password Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password Field */}
            <div>
              <label
                htmlFor="newPassword"
                className={`block text-sm-token font-medium mb-2 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}
              >
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.newPassword ? 'text' : 'password'}
                  id="newPassword"
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  className={`
                    w-full px-4 py-3 rounded-lg-token border
                    focus:outline-none focus:ring-2 focus:border-transparent transition-colors
                    pr-12
                    ${isDarkMode
                      ? `bg-bg-surface-dark text-text-primary-dark placeholder-text-secondary-dark
                         focus:ring-brand-primary-dark
                         ${errors.newPassword ? 'border-text-danger-dark' : 'border-border-base-dark'}`
                      : `bg-bg-surface-light text-text-primary-light placeholder-text-secondary-light
                         focus:ring-brand-primary-light
                         ${errors.newPassword ? 'border-text-danger-light' : 'border-border-base-light'}`
                    }
                  `}
                  placeholder="Enter new password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      newPassword: !prev.newPassword,
                    }))
                  }
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors ${isDarkMode ? 'text-text-secondary-dark hover:text-text-primary-dark' : 'text-text-secondary-light hover:text-text-primary-light'}`}
                  disabled={isLoading}
                  aria-label={showPasswords.newPassword ? 'Hide password' : 'Show password'}
                >
                  {showPasswords.newPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className={`mt-1.5 text-sm-token ${isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}`}>
                  {errors.newPassword}
                </p>
              )}
              <p className={`mt-1.5 text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                Minimum 8 characters required
              </p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className={`block text-sm-token font-medium mb-2 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`
                    w-full px-4 py-3 rounded-lg-token border
                    focus:outline-none focus:ring-2 focus:border-transparent transition-colors
                    pr-12
                    ${isDarkMode
                      ? `bg-bg-surface-dark text-text-primary-dark placeholder-text-secondary-dark
                         focus:ring-brand-primary-dark
                         ${errors.confirmPassword ? 'border-text-danger-dark' : 'border-border-base-dark'}`
                      : `bg-bg-surface-light text-text-primary-light placeholder-text-secondary-light
                         focus:ring-brand-primary-light
                         ${errors.confirmPassword ? 'border-text-danger-light' : 'border-border-base-light'}`
                    }
                  `}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      confirmPassword: !prev.confirmPassword,
                    }))
                  }
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors ${isDarkMode ? 'text-text-secondary-dark hover:text-text-primary-dark' : 'text-text-secondary-light hover:text-text-primary-light'}`}
                  disabled={isLoading}
                  aria-label={showPasswords.confirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showPasswords.confirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className={`mt-1.5 text-sm-token ${isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}`}>
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`
                w-full px-4 py-3
                font-medium rounded-lg-token
                focus:outline-none focus:ring-2 focus:ring-offset-2
                text-text-on-primary-dark
                transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center
                ${isDarkMode
                  ? 'bg-brand-primary-dark hover:bg-brand-secondary-dark focus:ring-brand-primary-dark focus:ring-offset-bg-base-dark'
                  : 'bg-brand-primary-light hover:bg-brand-secondary-light focus:ring-brand-primary-light focus:ring-offset-bg-base-light'
                }
              `}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-text-on-primary-dark"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className={`text-sm-token transition-colors ${isDarkMode ? 'text-text-secondary-dark hover:text-text-primary-dark' : 'text-text-secondary-light hover:text-text-primary-light'}`}
              disabled={isLoading}
            >
              Back to Login
            </button>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
