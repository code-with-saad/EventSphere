import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { BentoCard } from '../../components/common';
import { showSuccess, showError } from '../../utils/toast';

/**
 * RegisterPage component - User registration form for all roles
 * 
 * Features:
 * - Registration form with email, password, fullName, and role fields
 * - Client-side validation: email format, password minimum 8 characters
 * - Inline error display below each field
 * - Loading spinner on submit button during API call
 * - Role-specific success handling:
 *   - Organizer: Show toast "Registration successful. Awaiting approval."
 *   - Exhibitor/Attendee: Redirect to /verify-otp with email in state
 * - API error handling with toast notifications
 * - Styled with Tailwind and BentoCard component
 * - Show/hide password toggle with SVG icons
 * - Supports dark/light mode via design tokens
 * 
 * Validates Requirements: 5.1, 5.2, 5.3
 */
export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: '' as 'organizer' | 'exhibitor' | 'attendee' | '',
  });

  // Validation errors state
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    fullName: '',
    role: '',
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
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    return '';
  };

  // Full name validation function
  const validateFullName = (fullName: string): string => {
    if (!fullName) {
      return 'Full name is required';
    }
    if (fullName.trim().length < 2) {
      return 'Full name must be at least 2 characters';
    }
    return '';
  };

  // Role validation function
  const validateRole = (role: string): string => {
    if (!role) {
      return 'Please select a role';
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
      fullName: validateFullName(formData.fullName),
      role: validateRole(formData.role),
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
      const response = await register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role as 'organizer' | 'exhibitor' | 'attendee',
      });

      // Handle success based on role
      if (response.user.role === 'organizer') {
        // Organizer: Show success toast with approval message
        showSuccess('Registration successful. Awaiting approval.');
        // Optionally redirect to login or stay on page
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        // Exhibitor/Attendee: Redirect to OTP verification page
        showSuccess('OTP sent to your email. Please verify to activate your account.');
        navigate('/verify-otp', { 
          state: { 
            email: formData.email,
            role: formData.role 
          } 
        });
      }
    } catch (error: any) {
      // Handle API errors
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Shared input class builder
  const inputClass = (hasError: boolean) =>
    `w-full px-4 py-3 rounded-lg-token border transition-colors
     focus:outline-none focus:ring-2 focus:border-transparent
     ${isDarkMode
       ? `bg-bg-surface-dark text-text-primary-dark placeholder-text-secondary-dark
          focus:ring-brand-primary-dark focus:ring-offset-bg-base-dark
          ${hasError ? 'border-text-danger-dark' : 'border-border-base-dark'}`
       : `bg-bg-surface-light text-text-primary-light placeholder-text-secondary-light
          focus:ring-brand-primary-light focus:ring-offset-bg-base-light
          ${hasError ? 'border-text-danger-light' : 'border-border-base-light'}`
     }`;

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 py-8 md:py-12 ${
        isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'
      }`}
    >
      <div className="w-full max-w-md">
        <BentoCard>
          {/* Header */}
          <div className="mb-6">
            <h1
              className={`text-3xl font-bold mb-2 ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}
            >
              Create Account
            </h1>
            <p
              className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}
            >
              Register for EventSphere to get started
            </p>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className={`block text-sm-token font-medium mb-2 ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={inputClass(!!errors.email)}
                placeholder="you@example.com"
                disabled={isLoading}
              />
              {errors.email && (
                <p
                  className={`mt-1.5 text-sm-token ${
                    isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
                  }`}
                >
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className={`block text-sm-token font-medium mb-2 ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={inputClass(!!errors.password)}
                  placeholder="Minimum 8 characters"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors disabled:opacity-50 ${
                    isDarkMode
                      ? 'text-text-secondary-dark hover:text-text-primary-dark'
                      : 'text-text-secondary-light hover:text-text-primary-light'
                  }`}
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
                <p
                  className={`mt-1.5 text-sm-token ${
                    isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
                  }`}
                >
                  {errors.password}
                </p>
              )}
            </div>

            {/* Full Name Field */}
            <div>
              <label
                htmlFor="fullName"
                className={`block text-sm-token font-medium mb-2 ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                className={inputClass(!!errors.fullName)}
                placeholder="John Doe"
                disabled={isLoading}
              />
              {errors.fullName && (
                <p
                  className={`mt-1.5 text-sm-token ${
                    isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
                  }`}
                >
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Role Selection Field */}
            <div>
              <label
                htmlFor="role"
                className={`block text-sm-token font-medium mb-2 ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                I am registering as
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className={`${inputClass(!!errors.role)} cursor-pointer`}
                disabled={isLoading}
              >
                <option
                  value="default"
                  className={isDarkMode ? 'bg-bg-surface-dark' : 'bg-bg-surface-light'}
                >
                  Select your role
                </option>
                <option
                  value="organizer"
                  className={isDarkMode ? 'bg-bg-surface-dark' : 'bg-bg-surface-light'}
                >
                  Event Organizer
                </option>
                <option
                  value="exhibitor"
                  className={isDarkMode ? 'bg-bg-surface-dark' : 'bg-bg-surface-light'}
                >
                  Exhibitor
                </option>
                <option
                  value="attendee"
                  className={isDarkMode ? 'bg-bg-surface-dark' : 'bg-bg-surface-light'}
                >
                  Attendee
                </option>
              </select>
              {errors.role && (
                <p
                  className={`mt-1.5 text-sm-token ${
                    isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
                  }`}
                >
                  {errors.role}
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
                transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center
                text-text-on-primary-dark
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
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p
              className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}
            >
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className={`font-medium transition-colors ${
                  isDarkMode
                    ? 'text-brand-primary-dark hover:text-brand-secondary-dark'
                    : 'text-brand-primary-light hover:text-brand-secondary-light'
                }`}
                disabled={isLoading}
              >
                Sign in
              </button>
            </p>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
