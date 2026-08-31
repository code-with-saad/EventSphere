import { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ExhibitorDetailModalProps {
  exhibitor: {
    _id: string;
    companyName: string;
    companyDescription: string;
    category: string;
    logoUrl?: string;
    websiteUrl?: string;
    phoneNumber?: string;
    boothLabel?: string;
  } | null;
  onClose: () => void;
}

export default function ExhibitorDetailModal({
  exhibitor,
  onClose,
}: ExhibitorDetailModalProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap: focus close button on open
  useEffect(() => {
    if (exhibitor) {
      closeButtonRef.current?.focus();
    }
  }, [exhibitor]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!exhibitor) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${exhibitor.companyName} details`}
      className="fixed inset-0 z-50 flex items-center justify-center p-md-token"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Panel */}
      <div
        className={`relative z-10 w-full max-w-lg rounded-xl-token border p-lg-token shadow-xl ${
          isDarkMode
            ? 'bg-bg-surface-dark border-border-base-dark'
            : 'bg-bg-surface-light border-border-base-light'
        }`}
      >
        {/* Close button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close exhibitor details"
          className={`absolute top-md-token right-md-token text-xl-token leading-none ${
            isDarkMode
              ? 'text-text-secondary-dark hover:text-text-primary-dark'
              : 'text-text-secondary-light hover:text-text-primary-light'
          }`}
        >
          ×
        </button>

        {/* Logo + name */}
        <div className="flex items-center gap-md-token mb-md-token">
          {exhibitor.logoUrl ? (
            <img
              src={exhibitor.logoUrl}
              alt={`${exhibitor.companyName} logo`}
              className="w-16 h-16 rounded-md-token object-contain"
            />
          ) : (
            <div
              className={`w-16 h-16 rounded-md-token flex items-center justify-center text-xl-token font-bold ${
                isDarkMode
                  ? 'bg-bg-hover-dark text-text-secondary-dark'
                  : 'bg-bg-hover-light text-text-secondary-light'
              }`}
            >
              {exhibitor.companyName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2
              className={`text-lg-token font-semibold ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}
            >
              {exhibitor.companyName}
            </h2>
            <div
              className={`text-sm-token ${
                isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
              }`}
            >
              {exhibitor.category}
            </div>
          </div>
        </div>

        {/* Description */}
        <p
          className={`text-sm-token leading-normal-token mb-md-token ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}
        >
          {exhibitor.companyDescription}
        </p>

        {/* Meta info */}
        <div
          className={`flex flex-col gap-xs-token text-sm-token ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}
        >
          {exhibitor.boothLabel && (
            <div>
              <span className="font-medium">Booth:</span> {exhibitor.boothLabel}
            </div>
          )}
          {exhibitor.phoneNumber && (
            <div>
              <span className="font-medium">Phone:</span> {exhibitor.phoneNumber}
            </div>
          )}
          {exhibitor.websiteUrl && (
            <div>
              <span className="font-medium">Website:</span>{' '}
              <a
                href={exhibitor.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  isDarkMode
                    ? 'text-brand-primary-dark underline'
                    : 'text-brand-primary-light underline'
                }
              >
                {exhibitor.websiteUrl}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
