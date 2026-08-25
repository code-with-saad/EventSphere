import { Link } from 'react-router-dom';
import { Check, Smartphone } from 'lucide-react';
import { showSuccess, showError, showWarning, showInfo, dismissAllToasts } from '../utils/toast';

export const TestToast = () => {
  const handleSuccessToast  = () => showSuccess('Operation completed successfully!');
  const handleErrorToast    = () => showError('An error occurred. Please try again.');
  const handleWarningToast  = () => showWarning('Warning: This action cannot be undone.');
  const handleInfoToast     = () => showInfo('New features are now available!');

  const handleMultipleToasts = () => {
    showSuccess('First toast');
    setTimeout(() => showInfo('Second toast'),    300);
    setTimeout(() => showWarning('Third toast'),  600);
    setTimeout(() => showError('Fourth toast'),   900);
  };

  return (
    <div className="min-h-screen p-8 bg-bg-base-dark">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary-dark mb-2">Toast Notification Test</h1>
          <p className="text-text-secondary-dark mb-4">Test all toast notification types and their behavior</p>
          <Link to="/" className="text-brand-primary-dark hover:text-brand-secondary-dark transition-colors">
            Back to Home
          </Link>
        </div>

        <div className="p-8 border bg-bg-surface-dark border-border-base-dark rounded-xl-token">
          <h2 className="text-2xl font-semibold text-text-primary-dark mb-6">Test Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button onClick={handleSuccessToast}  className="px-6 py-3 text-text-on-primary-dark rounded-lg-token font-medium hover:opacity-90 transition-opacity bg-text-success-dark">Show Success Toast</button>
            <button onClick={handleErrorToast}    className="px-6 py-3 text-text-on-primary-dark rounded-lg-token font-medium hover:opacity-90 transition-opacity bg-text-danger-dark">Show Error Toast</button>
            <button onClick={handleWarningToast}  className="px-6 py-3 text-text-on-primary-dark rounded-lg-token font-medium hover:opacity-90 transition-opacity bg-text-warning-dark">Show Warning Toast</button>
            <button onClick={handleInfoToast}     className="px-6 py-3 text-text-on-primary-dark rounded-lg-token font-medium hover:opacity-90 transition-opacity bg-brand-primary-dark">Show Info Toast</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={handleMultipleToasts} className="px-6 py-3 text-text-on-primary-dark rounded-lg-token font-medium hover:opacity-90 transition-opacity bg-brand-secondary-dark">Show Multiple Toasts</button>
            <button onClick={dismissAllToasts}     className="px-6 py-3 bg-bg-surface-dark text-text-primary-dark border border-border-base-dark rounded-lg-token font-medium hover:bg-bg-hover-dark transition-colors">Dismiss All Toasts</button>
          </div>
        </div>

        <div className="mt-6 p-8 border bg-bg-surface-dark border-border-base-dark rounded-xl-token">
          <h2 className="text-2xl font-semibold text-text-primary-dark mb-4">Toast System Features</h2>
          <ul className="space-y-2 text-text-secondary-dark">
            {[
              'Four toast types: Success (green), Error (red), Warning (amber), Info (blue)',
              'Auto-dismiss: Toasts automatically dismiss after 5 seconds',
              'Manual dismissal: Click the close button to dismiss manually',
              'Vertical stacking: Multiple toasts stack vertically with 8px spacing',
              'Responsive positioning: Top-right on desktop, bottom-center on mobile (<768px)',
              'No window.alert: System never uses blocking alert dialogs',
            ].map((text) => (
              <li key={text} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-text-success-dark mt-0.5 shrink-0" aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 p-6 border bg-bg-surface-dark border-border-base-dark rounded-xl-token">
          <h3 className="text-xl font-semibold text-text-primary-dark mb-2 flex items-center gap-2">
            <Smartphone className="w-5 h-5" aria-hidden="true" />
            Responsive Test
          </h3>
          <p className="text-text-secondary-dark">
            Resize your browser to less than 768px. Toast position switches from top-right to bottom-center.
          </p>
        </div>
      </div>
    </div>
  );
};
