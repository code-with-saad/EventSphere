import toast from 'react-hot-toast';

/**
 * Toast notification utility functions
 * 
 * Provides simple interfaces for displaying toast notifications
 * across the application. All toasts auto-dismiss after 5 seconds
 * and can be manually dismissed via the close button.
 * 
 * Validates Requirements 18.7, 18.8, 18.9
 */

/**
 * Display a success toast notification (green)
 * Use for successful API responses and completed operations
 * 
 * @param message - Success message to display
 * @returns Toast ID for programmatic control if needed
 * 
 * @example
 * showSuccess('Registration successful!');
 */
export const showSuccess = (message: string) => {
  return toast.success(message);
};

/**
 * Display an error toast notification (red)
 * Use for API errors, validation failures, and error conditions
 * 
 * @param message - Error message to display
 * @returns Toast ID for programmatic control if needed
 * 
 * @example
 * showError('Failed to register. Email already exists.');
 */
export const showError = (message: string) => {
  return toast.error(message);
};

/**
 * Display a warning toast notification (amber/yellow)
 * Use for warnings, cautionary messages, and pending states
 * 
 * @param message - Warning message to display
 * @returns Toast ID for programmatic control if needed
 * 
 * @example
 * showWarning('Your session is about to expire.');
 */
export const showWarning = (message: string) => {
  return toast(message, {
    icon: '⚠️',
    style: {
      background: '#FBBF24', // text-warning-dark token
      color: '#FFFFFF',
      borderRadius: '12px',
      padding: '1rem',
      fontWeight: '500',
    },
  });
};

/**
 * Display an info toast notification (blue)
 * Use for informational messages and system notifications
 * 
 * @param message - Info message to display
 * @returns Toast ID for programmatic control if needed
 * 
 * @example
 * showInfo('New features are now available!');
 */
export const showInfo = (message: string) => {
  return toast(message, {
    icon: 'ℹ️',
    style: {
      background: '#818CF8', // brand-primary-dark token
      color: '#FFFFFF',
      borderRadius: '12px',
      padding: '1rem',
      fontWeight: '500',
    },
  });
};

/**
 * Dismiss a specific toast by ID
 * 
 * @param toastId - ID of the toast to dismiss
 * 
 * @example
 * const id = showSuccess('Processing...');
 * // Later:
 * dismissToast(id);
 */
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

/**
 * Dismiss all active toasts
 * 
 * @example
 * dismissAllToasts();
 */
export const dismissAllToasts = () => {
  toast.dismiss();
};
