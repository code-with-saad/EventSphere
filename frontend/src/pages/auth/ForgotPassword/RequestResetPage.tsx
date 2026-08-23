import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BentoCard } from '../../../components/common';
import { showSuccess } from '../../../utils/toast';
import api from '../../../services/api';

/**
 * RequestResetPage component - Request password reset via email
 * 
 * Features:
 * - Email input field with client-side validation
 * - Validates email format before submission
 * - API call to POST /api/auth/forgot-password/request
 * - Always shows success message (prevent email enumeration): "If an account exists, an OTP has been sent"
 * - Redirect to VerifyResetOTPPage with email in state after success
 * - Error handling via toast notifications
 * - Loading spinner on submit button during API call
 * - Styled with Tailwind and BentoCard component
 * 
 * Validates Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */
export function RequestResetPage() {
  const navigate = useNavigate();

  // Form state
  const [email, setEmail] = useState('');

  // Validation error state
  const [error, setError] = useState('');

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Email validation function
  const validateEmail = (emailValue: string): string => {
    if (!emailValue) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue)) {
      return 'Invalid email format';
    }
    return '';
  };

  // Handle input change with validation
  const handleInputChange = (value: string) => {
    setEmail(value);

    // Clear error when user starts typing
    setError('');
  };

  // Validate form
  const validateForm = (): boolean => {
    const newError = validateEmail(email);
    setError(newError);
    return !newError;
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/api/auth/forgot-password/request', {
        email,
      });

      // Always show success message to prevent email enumeration
      showSuccess('If an account exists, an OTP has been sent to your email');

      // Redirect to verify OTP page with email in state
      setTimeout(() => {
        navigate('/forgot-password/verify-otp', {
          state: { email },
        });
      }, 1500);
    } catch (error: any) {
      // Still show the generic success message to prevent email enumeration
      showSuccess('If an account exists, an OTP has been sent to your email');

      // Log the error for debugging purposes (in production this would go to error tracking)
      console.error('Password reset request error:', error);

      // Still redirect after a delay to maintain UX consistency
      setTimeout(() => {
        navigate('/forgot-password/verify-otp', {
          state: { email },
        });
      }, 1500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base-dark flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <BentoCard>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-text-primary-dark mb-2">
              Reset Your Password
            </h1>
            <p className="text-text-secondary-dark">
              Enter your email address and we'll send you an OTP to reset your password
            </p>
          </div>

          {/* Reset Request Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm-token font-medium text-text-secondary-dark mb-2"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => handleInputChange(e.target.value)}
                className={`
                  w-full px-4 py-2.5 
                  bg-bg-surface-dark 
                  border ${error ? 'border-text-danger-dark' : 'border-border-base-dark'} 
                  rounded-lg-token 
                  text-text-primary-dark 
                  placeholder-text-secondary-dark
                  focus:outline-none focus:ring-2 focus:ring-brand-primary-dark focus:border-transparent
                  transition-colors
                `}
                placeholder="you@example.com"
                disabled={isLoading}
              />
              {error && (
                <p className="mt-1.5 text-sm-token text-text-danger-dark">{error}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`
                w-full px-4 py-3 
                bg-brand-primary-dark hover:bg-brand-secondary-dark 
                text-text-on-primary-dark font-medium 
                rounded-lg-token 
                focus:outline-none focus:ring-2 focus:ring-brand-primary-dark focus:ring-offset-2 focus:ring-offset-bg-base-dark
                transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center
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
                  Sending OTP...
                </>
              ) : (
                'Send OTP'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center space-y-3">
            <p className="text-text-secondary-dark text-sm-token">
              Remember your password?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-brand-primary-dark hover:text-brand-secondary-dark font-medium transition-colors"
                disabled={isLoading}
              >
                Back to Login
              </button>
            </p>
            <p className="text-text-secondary-dark text-sm-token">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-brand-primary-dark hover:text-brand-secondary-dark font-medium transition-colors"
                disabled={isLoading}
              >
                Create one
              </button>
            </p>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
