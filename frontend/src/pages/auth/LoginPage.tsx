import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BentoCard } from '../../components/common';
import { showSuccess, showError } from '../../utils/toast';

/**
 * LoginPage component - User authentication form for all roles
 * 
 * Features:
 * - Login form with email and password fields
 * - Client-side validation: email format, password presence
 * - Inline error display below each field
 * - Loading spinner on submit button during API call
 * - Success: redirect to /dashboard (role-based routing handled by backend/ProtectedRoute)
 * - Error handling:
 *   - "Account pending approval" for Organizer with pending status
 *   - "Please verify your email" for Exhibitor/Attendee with unverified email
 *   - Generic error toast for other errors
 * - "Forgot Password?" link below password field
 * - "Create Account" link at footer to navigate to register page
 * - Styled with Tailwind and BentoCard component
 * 
 * Validates Requirements: 8.1, 8.2, 8.3, 8.4
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Validation errors state
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Show password toggle
  const [showPassword, setShowPassword] = useState(false);

  // Email validation function
  const validateEmail = (email: string): string => {
    if (!email) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Invalid email format';
    }
    return '';
  };

  // Password validation function
  const validatePassword = (password: string): string => {
    if (!password) {
      return 'Password is required';
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
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
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

    setIsLoading(true);

    try {
      await login(formData.email, formData.password);

      // Success: show toast and redirect to dashboard
      showSuccess('Login successful. Redirecting to your dashboard...');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error: any) {
      // Handle API errors with specific messages
      const errorStatus = error.response?.status;
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';

      // Check for specific error cases
      if (errorStatus === 403) {
        // Check if it's a pending approval or email verification issue
        if (errorMessage.includes('pending approval') || errorMessage.includes('Pending')) {
          showError('Account pending approval');
        } else if (errorMessage.includes('email') || errorMessage.includes('verified')) {
          showError('Please verify your email');
        } else {
          showError(errorMessage);
        }
      } else {
        // Generic error handling
        showError(errorMessage);
      }
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
            <h1 className="text-3xl font-bold text-text-primary-dark mb-2">Welcome Back</h1>
            <p className="text-text-secondary-dark">
              Sign in to your EventSphere account
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm-token font-medium text-text-secondary-dark mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-4 py-2.5 bg-bg-surface-dark text-text-primary-dark 
                  border ${errors.email ? 'border-text-danger-dark' : 'border-border-base-dark'} 
                  rounded-lg-token 
                  placeholder-text-secondary-dark
                  focus:outline-none focus:ring-2 focus:ring-brand-primary-dark focus:border-transparent
                  transition-colors`}
                placeholder="you@example.com"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1.5 text-sm-token text-text-danger-dark">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm-token font-medium text-text-secondary-dark mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full px-4 py-2.5 bg-bg-surface-dark text-text-primary-dark 
                  border ${errors.password ? 'border-text-danger-dark' : 'border-border-base-dark'} 
                  rounded-lg-token 
                  placeholder-text-secondary-dark
                  focus:outline-none focus:ring-2 focus:ring-brand-primary-dark focus:border-transparent
                  transition-colors`}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary-dark hover:text-text-primary-dark transition-colors disabled:opacity-50"
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
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
              {errors.password && (
                <p className="mt-1.5 text-sm-token text-text-danger-dark">{errors.password}</p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => navigate('/forgot-password/request')}
                className="text-brand-primary-dark hover:text-brand-secondary-dark text-sm-token font-medium transition-colors"
                disabled={isLoading}
              >
                Forgot Password?
              </button>
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
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-text-secondary-dark">
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



