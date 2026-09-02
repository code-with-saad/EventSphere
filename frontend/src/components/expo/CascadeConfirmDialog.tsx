import { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface CascadePreview {
  activeTickets: number;
  pendingApplications: number;
  approvedApplications: number;
  requiresConfirmation: boolean;
}

interface CascadeConfirmDialogProps {
  isOpen: boolean;
  action: 'archive' | 'delete';
  preview: CascadePreview;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function CascadeConfirmDialog({
  isOpen,
  action,
  preview,
  onConfirm,
  onCancel,
  isLoading = false,
}: CascadeConfirmDialogProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Focus confirm button when dialog opens
  useEffect(() => {
    if (isOpen) confirmBtnRef.current?.focus();
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const actionLabel = action === 'delete' ? 'Delete' : 'Archive';

  const consequences: string[] = [];
  if (preview.activeTickets > 0)
    consequences.push(
      `${preview.activeTickets} active ticket${preview.activeTickets !== 1 ? 's' : ''} will be cancelled`
    );
  if (preview.pendingApplications > 0)
    consequences.push(
      `${preview.pendingApplications} pending application${preview.pendingApplications !== 1 ? 's' : ''} will be rejected`
    );
  if (preview.approvedApplications > 0)
    consequences.push(
      `${preview.approvedApplications} approved application${preview.approvedApplications !== 1 ? 's' : ''} will be rejected`
    );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cascade-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-md-token"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Panel */}
      <div
        className={`relative z-10 w-full max-w-md rounded-xl-token border p-lg-token backdrop-blur-md ${
          isDarkMode
            ? 'bg-glass-dark border-glass-border-dark'
            : 'bg-glass-light border-glass-border-light'
        }`}
      >
        {/* Icon + Title */}
        <div className="flex items-center gap-sm-token mb-md-token">
          <span
            className={`text-xl-token ${
              isDarkMode ? 'text-text-warning-dark' : 'text-text-warning-light'
            }`}
            aria-hidden="true"
          >
            ⚠️
          </span>
          <h2
            id="cascade-dialog-title"
            className={`text-base-token font-semibold ${
              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
            }`}
          >
            {actionLabel} Expo — Confirm Cascade
          </h2>
        </div>

        {/* Description */}
        <p
          className={`text-sm-token leading-normal-token mb-md-token ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}
        >
          This action will permanently affect the following:
        </p>

        {/* Consequence list */}
        <ul
          className={`mb-lg-token space-y-xs-token text-sm-token ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}
        >
          {consequences.length > 0 ? (
            consequences.map((c, i) => (
              <li key={i} className="flex items-start gap-xs-token">
                <span
                  className={
                    isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
                  }
                  aria-hidden="true"
                >
                  •
                </span>
                {c}
              </li>
            ))
          ) : (
            <li
              className={`flex items-start gap-xs-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              <span aria-hidden="true">•</span> No active tickets or pending applications
              affected
            </li>
          )}
        </ul>

        <p
          className={`text-sm-token font-medium mb-lg-token ${
            isDarkMode ? 'text-text-warning-dark' : 'text-text-warning-light'
          }`}
        >
          This cannot be undone. Are you sure you want to {actionLabel.toLowerCase()} this
          expo?
        </p>

        {/* Actions */}
        <div className="flex gap-sm-token justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className={`px-md-token py-xs-token rounded-md-token text-sm-token font-medium border transition-colors disabled:opacity-60 ${
              isDarkMode
                ? 'border-border-base-dark text-text-primary-dark hover:bg-bg-hover-dark'
                : 'border-border-base-light text-text-primary-light hover:bg-bg-hover-light'
            }`}
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-md-token py-xs-token rounded-md-token text-sm-token font-semibold transition-colors disabled:opacity-60 ${
              isDarkMode
                ? 'bg-bg-danger-dark text-text-danger-dark border border-text-danger-dark hover:opacity-80'
                : 'bg-bg-danger-light text-text-danger-light border border-text-danger-light hover:opacity-80'
            }`}
          >
            {isLoading ? `${actionLabel}ing…` : `Yes, ${actionLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}
