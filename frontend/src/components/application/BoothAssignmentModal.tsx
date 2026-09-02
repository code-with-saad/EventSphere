import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface BoothAssignmentModalProps {
  isOpen: boolean;
  applicationId: string;
  expoId: string;
  totalBooths: number;
  assignedBooths: number;
  onConfirm: (boothLabel: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function BoothAssignmentModal({
  isOpen,
  totalBooths,
  assignedBooths,
  onConfirm,
  onCancel,
  isLoading = false,
}: BoothAssignmentModalProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const inputRef = useRef<HTMLInputElement>(null);

  const [boothLabel, setBoothLabel] = useState('');
  const [error, setError] = useState('');

  const fillRate = totalBooths > 0 ? Math.round((assignedBooths / totalBooths) * 100) : 0;
  const isFull = assignedBooths >= totalBooths;

  useEffect(() => {
    if (isOpen) {
      setBoothLabel('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const trimmed = boothLabel.trim();
    if (!trimmed) { setError('Booth label is required'); return; }
    if (trimmed.length > 20) { setError('Booth label must be 20 characters or fewer'); return; }
    setError('');
    onConfirm(trimmed);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="booth-modal-title"
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
          id="booth-modal-title"
          className={`text-base-token font-semibold mb-md-token ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}
        >
          Assign Booth
        </h2>

        {/* Fill rate bar */}
        <div className="mb-md-token">
          <div className={`flex justify-between text-xs-token mb-xs-token ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}>
            <span>Booth fill rate</span>
            <span>{assignedBooths} / {totalBooths} ({fillRate}%)</span>
          </div>
          <div className={`w-full h-2 rounded-full overflow-hidden ${
            isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'
          }`}>
            <div
              className={`h-full rounded-full transition-all ${
                isFull
                  ? isDarkMode ? 'bg-text-danger-dark' : 'bg-text-danger-light'
                  : fillRate >= 80
                    ? isDarkMode ? 'bg-text-warning-dark' : 'bg-text-warning-light'
                    : isDarkMode ? 'bg-text-success-dark' : 'bg-text-success-light'
              }`}
              style={{ width: `${Math.min(fillRate, 100)}%` }}
              role="progressbar"
              aria-valuenow={fillRate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Booth fill rate: ${fillRate}%`}
            />
          </div>
        </div>

        {/* Overfill warning */}
        {isFull && (
          <div className={`mb-md-token px-sm-token py-xs-token rounded-md-token text-xs-token ${
            isDarkMode ? 'bg-bg-warning-dark text-text-warning-dark' : 'bg-bg-warning-light text-text-warning-light'
          }`}>
            ⚠️ All booths are filled. Approving will exceed capacity.
          </div>
        )}

        {/* Booth label input */}
        <div className="mb-md-token">
          <label
            htmlFor="booth-label"
            className={`block text-sm-token font-medium mb-xs-token ${
              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
            }`}
          >
            Booth Label{' '}
            <span aria-hidden="true" className={isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}>
              *
            </span>
          </label>
          <input
            ref={inputRef}
            id="booth-label"
            type="text"
            value={boothLabel}
            onChange={(e) => { setBoothLabel(e.target.value); setError(''); }}
            placeholder="e.g. A-12, Hall B Row 3"
            maxLength={20}
            className={`w-full rounded-md-token border px-sm-token py-xs-token text-sm-token outline-none transition-colors ${
              error
                ? isDarkMode ? 'border-text-danger-dark' : 'border-text-danger-light'
                : isDarkMode
                  ? 'border-border-base-dark focus:border-brand-primary-dark'
                  : 'border-border-base-light focus:border-brand-primary-light'
            } ${
              isDarkMode
                ? 'bg-bg-surface-dark text-text-primary-dark placeholder:text-text-secondary-dark'
                : 'bg-bg-surface-light text-text-primary-light placeholder:text-text-secondary-light'
            }`}
            aria-describedby={error ? 'booth-label-error' : undefined}
            aria-invalid={!!error}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); } }}
          />
          {error && (
            <p
              id="booth-label-error"
              role="alert"
              className={`mt-xs-token text-xs-token ${
                isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
              }`}
            >
              {error}
            </p>
          )}
          <p className={`mt-xs-token text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
            {20 - boothLabel.length} characters remaining
          </p>
        </div>

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
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-md-token py-xs-token rounded-md-token text-sm-token font-semibold transition-colors disabled:opacity-60 ${
              isDarkMode
                ? 'bg-brand-primary-dark text-text-on-primary-dark hover:opacity-90'
                : 'bg-brand-primary-light text-text-on-primary-light hover:opacity-90'
            }`}
          >
            {isLoading ? 'Approving…' : 'Confirm Approval'}
          </button>
        </div>
      </div>
    </div>
  );
}
