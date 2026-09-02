import { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface WithdrawConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function WithdrawConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false,
}: WithdrawConfirmDialogProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) cancelBtnRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdraw-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-md-token"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div className={`relative z-10 w-full max-w-sm rounded-xl-token border p-lg-token backdrop-blur-md ${
        isDarkMode
          ? 'bg-glass-dark border-glass-border-dark'
          : 'bg-glass-light border-glass-border-light'
      }`}>
        <h2
          id="withdraw-dialog-title"
          className={`text-base-token font-semibold mb-sm-token ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}
        >
          Withdraw Application
        </h2>
        <p className={`text-sm-token leading-normal-token mb-lg-token ${
          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
        }`}>
          Are you sure you want to withdraw this application? This cannot be undone, but you can reapply later.
        </p>
        <div className="flex gap-sm-token justify-end">
          <button
            ref={cancelBtnRef}
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
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-md-token py-xs-token rounded-md-token text-sm-token font-semibold transition-colors disabled:opacity-60 ${
              isDarkMode
                ? 'bg-bg-danger-dark text-text-danger-dark border border-text-danger-dark hover:opacity-80'
                : 'bg-bg-danger-light text-text-danger-light border border-text-danger-light hover:opacity-80'
            }`}
          >
            {isLoading ? 'Withdrawing…' : 'Yes, Withdraw'}
          </button>
        </div>
      </div>
    </div>
  );
}
