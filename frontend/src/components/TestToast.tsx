import { Link } from 'react-router-dom';
import { showSuccess, showError, showWarning, showInfo, dismissAllToasts } from '../utils/toast';

/**
 * Test page for Toast notification system
 * 
 * Demonstrates all four toast types and their behavior:
 * - Success (green)
 * - Error (red)
 * - Warning (amber)
 * - Info (blue)
 * 
 * Validates Requirements 18.1-18.9
 */
export const TestToast = () => {
  const handleSuccessToast = () => {
    showSuccess('✓ Operation completed successfully!');
  };

  const handleErrorToast = () => {
    showError('✖ An error occurred. Please try again.');
  };

  const handleWarningToast = () => {
    showWarning('⚠ Warning: This action cannot be undone.');
  };

  const handleInfoToast = () => {
    showInfo('ℹ️ New features are now available!');
  };

  const handleMultipleToasts = () => {
    showSuccess('First toast');
    setTimeout(() => showInfo('Second toast'), 300);
    setTimeout(() => showWarning('Third toast'), 600);
    setTimeout(() => showError('Fourth toast'), 900);
  };

  const handleDismissAll = () => {
    dismissAllToasts();
  };

  return (
    <div className="min-h-screen p-8 bg-bg-base-dark">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary-dark mb-2">Toast Notification Test</h1>
          <p className="text-text-secondary-dark mb-4">
            Test all toast notification types and their behavior
          </p>
          <Link to="/" className="text-brand-primary-dark hover:text-brand-secondary-dark transition-colors">
            ← Back to Home
          </Link>
        </div>

        {/* Test Controls */}
        <div 
          className="p-8 border bg-bg-surface-dark border-border-base-dark rounded-xl-token"
        >
          <h2 className="text-2xl font-semibold text-text-primary-dark mb-6">Test Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Success Toast Button */}
            <button
              onClick={handleSuccessToast}
              className="px-6 py-3 text-text-on-primary-dark rounded-lg-token font-medium hover:opacity-90 transition-opacity bg-text-success-dark"
            >
              Show Success Toast
            </button>

            {/* Error Toast Button */}
            <button
              onClick={handleErrorToast}
              className="px-6 py-3 text-text-on-primary-dark rounded-lg-token font-medium hover:opacity-90 transition-opacity bg-text-danger-dark"
            >
              Show Error Toast
            </button>

            {/* Warning Toast Button */}
            <button
              onClick={handleWarningToast}
              className="px-6 py-3 text-text-on-primary-dark rounded-lg-token font-medium hover:opacity-90 transition-opacity bg-text-warning-dark"
            >
              Show Warning Toast
            </button>

            {/* Info Toast Button */}
            <button
              onClick={handleInfoToast}
              className="px-6 py-3 text-text-on-primary-dark rounded-lg-token font-medium hover:opacity-90 transition-opacity bg-brand-primary-dark"
            >
              Show Info Toast
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Multiple Toasts Button */}
            <button
              onClick={handleMultipleToasts}
              className="px-6 py-3 text-text-on-primary-dark rounded-lg-token font-medium hover:opacity-90 transition-opacity bg-brand-secondary-dark"
            >
              Show Multiple Toasts (Stacking Test)
            </button>

            {/* Dismiss All Button */}
            <button
              onClick={handleDismissAll}
              className="px-6 py-3 bg-bg-surface-dark text-text-primary-dark border border-border-base-dark rounded-lg-token font-medium hover:bg-bg-hover-dark transition-colors"
            >
              Dismiss All Toasts
            </button>
          </div>
        </div>

        {/* Documentation */}
        <div 
          className="mt-6 p-8 border bg-bg-surface-dark border-border-base-dark rounded-xl-token"
        >
          <h2 className="text-2xl font-semibold text-text-primary-dark mb-4">Toast System Features</h2>
          <ul className="space-y-2 text-text-secondary-dark">
            <li className="flex items-start">
              <span className="text-text-success-dark mr-2">✓</span>
              <span><strong>Four toast types:</strong> Success (green), Error (red), Warning (amber), Info (blue)</span>
            </li>
            <li className="flex items-start">
              <span className="text-text-success-dark mr-2">✓</span>
              <span><strong>Auto-dismiss:</strong> Toasts automatically dismiss after 5 seconds</span>
            </li>
            <li className="flex items-start">
              <span className="text-text-success-dark mr-2">✓</span>
              <span><strong>Manual dismissal:</strong> Click the close button to dismiss manually</span>
            </li>
            <li className="flex items-start">
              <span className="text-text-success-dark mr-2">✓</span>
              <span><strong>Vertical stacking:</strong> Multiple toasts stack vertically with 8px spacing</span>
            </li>
            <li className="flex items-start">
              <span className="text-text-success-dark mr-2">✓</span>
              <span><strong>Responsive positioning:</strong> Top-right on desktop, bottom-center on mobile (&lt;768px)</span>
            </li>
            <li className="flex items-start">
              <span className="text-text-success-dark mr-2">✓</span>
              <span><strong>No window.alert:</strong> System never uses blocking alert dialogs</span>
            </li>
          </ul>
        </div>

        {/* Responsive Test Instructions */}
        <div 
          className="mt-6 p-6 border bg-bg-surface-dark border-border-base-dark rounded-xl-token"
        >
          <h3 className="text-xl font-semibold text-text-primary-dark mb-2">📱 Responsive Test</h3>
          <p className="text-text-secondary-dark">
            To test mobile positioning, resize your browser window to less than 768px width. 
            The toast position will automatically switch from top-right to bottom-center.
          </p>
        </div>
      </div>
    </div>
  );
};
