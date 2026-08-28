import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BentoCard } from '../../components/common';
import { showSuccess, showError } from '../../utils/toast';
import api from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * VerifyOTPPage component - OTP verification for Exhibitor/Attendee registration
 * 
 * Features:
 * - Accept email from navigation state (passed from RegisterPage)
 * - Single 6-digit OTP input field with validation
 * - Resend OTP button with attempt tracking (max 3 attempts)
 * - Countdown timer for OTP expiry (5 minutes = 300 seconds)
 * - API call to POST /api/auth/verify-otp on submit
 * - Success: toast "Email verified successfully", redirect to /login
 * - Error: toast with error message (invalid OTP, expired OTP)
 * - Resend OTP: POST /api/auth/resend-otp with attempt tracking
 * - Styled with Tailwind and BentoCard component
 * 
 * Validates Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export function VerifyOTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Extract email from navigation state (passed from RegisterPage)
  const email = location.state?.email as string | undefined;

  // OTP input state
  const [otp, setOtp] = useState('');
  
  // Validation error state
  const [error, setError] = useState('');
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Resend state — persisted in localStorage so the rate-limit is visible across all tabs

  const [resendCount, setResendCount] = useState<number>(() => {
    if (!email) return 0;
    const stored = localStorage.getItem(`otp_resend_count_${email}`);
    return stored ? parseInt(stored, 10) : 0;
  });
  const [isResending, setIsResending] = useState(false);
  
  // Countdown timer state (5 minutes = 300 seconds)
  const [timeRemaining, setTimeRemaining] = useState(300);

  // Redirect to register if no email in state
  useEffect(() => {
    if (!email) {
      showError('No email provided. Please register first.');
      navigate('/register');
    }
  }, [email, navigate]);

  // Countdown timer effect
  useEffect(() => {
    if (timeRemaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Format time remaining as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // OTP validation function
  const validateOtp = (value: string): string => {
    if (!value) {
      return 'OTP is required';
    }
    if (!/^\d{6}$/.test(value)) {
      return 'OTP must be exactly 6 digits';
    }
    return '';
  };

  // Handle OTP input change (only allow digits, max 6)
  const handleOtpChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
    setOtp(digitsOnly);
    
    // Clear error when user starts typing
    setError('');
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Prevent double submission
    if (isLoading) {
      return;
    }

    // Validate OTP
    const validationError = validateOtp(otp);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check if OTP expired
    if (timeRemaining <= 0) {
      setError('OTP has expired. Please request a new one.');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/api/auth/verify-otp', {
        email,
        otp,
        purpose: 'registration',
      });

      // Clear the persisted resend count now that verification succeeded
      if (email) {
        localStorage.removeItem(`otp_resend_count_${email}`);
      }

      // Success: show toast and redirect to login
      showSuccess('Email verified successfully. You can now log in.');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (error: any) {
      // Handle API errors
      const errorMessage = error.response?.data?.message || 'OTP verification failed. Please try again.';
      showError(errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOtp = async () => {
    // Prevent double submission
    if (isResending) {
      return;
    }

    // Check if max resend attempts reached
    if (resendCount >= 3) {
      showError('Maximum resend attempts exceeded. Please register again.');
      return;
    }

    setIsResending(true);

    try {
      const response = await api.post('/api/auth/resend-otp', {
        email,
        purpose: 'registration',
      });

      // Update resend count
      const newResendCount = response.data.data?.resendCount ?? resendCount + 1;
      setResendCount(newResendCount);
      // Persist so the rate-limit is visible across all tabs
      if (email) {
        localStorage.setItem(`otp_resend_count_${email}`, String(newResendCount));
      }

      // Reset countdown timer to 5 minutes
      setTimeRemaining(300);

      // Clear OTP input and error
      setOtp('');
      setError('');

      // Show success message
      const remainingAttempts = 3 - newResendCount;
      showSuccess(`OTP resent successfully. ${remainingAttempts} attempts remaining.`);
    } catch (error: any) {
      // Handle API errors
      const errorMessage = error.response?.data?.message || 'Failed to resend OTP. Please try again.';
      showError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  // Don't render if no email (will redirect)
  if (!email) {
    return null;
  }

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-8 ${isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'}`}>
      <div className="w-full max-w-md">
        <BentoCard>
          {/* Header */}
          <div className="mb-6">
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
              Verify Your Email
            </h1>
            <p className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>
              We've sent a 6-digit OTP to{' '}
              <span className={`font-medium ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`}>
                {email}
              </span>
            </p>
          </div>

          {/* Countdown Timer */}
          <div className={`mb-6 p-4 rounded-lg-token border ${isDarkMode ? 'bg-bg-surface-dark border-border-base-dark' : 'bg-bg-surface-light border-border-base-light'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                Time remaining:
              </span>
              <span className={`text-lg-token font-mono font-bold ${
                timeRemaining <= 60
                  ? (isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light')
                  : (isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light')
              }`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            {timeRemaining <= 0 && (
              <p className={`text-sm-token mt-2 ${isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}`}>
                OTP expired. Please request a new one.
              </p>
            )}
          </div>

          {/* OTP Verification Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* OTP Input Field */}
            <div>
              <label
                htmlFor="otp"
                className={`block text-sm-token font-medium mb-2 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}
              >
                Enter 6-Digit OTP
              </label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => handleOtpChange(e.target.value)}
                className={`
                  w-full px-4 py-3 rounded-lg-token border text-center text-2xl font-mono tracking-widest
                  focus:outline-none focus:ring-2 focus:border-transparent transition-colors
                  ${isDarkMode
                    ? `bg-bg-surface-dark text-text-primary-dark placeholder-text-secondary-dark
                       focus:ring-brand-primary-dark
                       ${error ? 'border-text-danger-dark' : 'border-border-base-dark'}`
                    : `bg-bg-surface-light text-text-primary-light placeholder-text-secondary-light
                       focus:ring-brand-primary-light
                       ${error ? 'border-text-danger-light' : 'border-border-base-light'}`
                  }
                `}
                placeholder="000000"
                maxLength={6}
                disabled={isLoading || timeRemaining <= 0}
                autoFocus
              />
              {error && (
                <p className={`mt-1.5 text-sm-token ${isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}`}>
                  {error}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || otp.length !== 6 || timeRemaining <= 0}
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
                  Verifying...
                </>
              ) : (
                'Verify OTP'
              )}
            </button>
          </form>

          {/* Resend OTP Section */}
          <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'}`}>
            <div className="text-center">
              <p className={`text-sm-token mb-3 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                Didn't receive the code?
              </p>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResending || resendCount >= 3}
                className={`
                  font-medium text-sm-token
                  transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${isDarkMode ? 'text-brand-primary-dark hover:text-brand-secondary-dark' : 'text-brand-primary-light hover:text-brand-secondary-light'}
                `}
              >
                {isResending ? 'Resending...' : 'Resend OTP'}
              </button>
              {resendCount > 0 && (
                <p className={`text-xs-token mt-2 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  {resendCount === 3 ? (
                    <span className={isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}>
                      Maximum attempts reached
                    </span>
                  ) : (
                    `${resendCount}/3 resend attempts used`
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Back to Login */}
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
