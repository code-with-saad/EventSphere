import { useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
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
  onRate?: () => void;
  isRated?: boolean;
}

export default function ExhibitorDetailModal({
  exhibitor,
  onClose,
  onRate,
  isRated,
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
        className={`relative z-10 w-full max-w-lg rounded-xl-token border p-lg-token backdrop-blur-md ${
          isDarkMode
            ? 'bg-glass-dark border-glass-border-dark'
            : 'bg-glass-light border-glass-border-light'
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

        {onRate && (
          <div className="mt-md-token pt-md-token border-t border-glass-border-dark/50 flex justify-end">
            <button
              type="button"
              disabled={isRated}
              onClick={onRate}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                isRated
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 cursor-default'
                  : 'bg-brand-primary-dark text-white hover:opacity-90 shadow-md shadow-brand-primary-dark/20'
              }`}
            >
              <Star className={`w-4 h-4 ${isRated ? 'fill-amber-500 text-amber-500' : 'fill-white text-white'}`} />
              <span>{isRated ? 'Exhibitor Rated ⭐' : 'Leave Rating & Feedback'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
