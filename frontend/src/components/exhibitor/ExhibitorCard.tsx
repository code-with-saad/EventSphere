import React from 'react';
import { Star } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ExhibitorCardProps {
  exhibitor: {
    _id: string;
    companyName: string;
    companyDescription: string;
    category: string;
    logoUrl?: string;
    boothLabel?: string;
    averageRating?: number;
    reviewCount?: number;
  };
  onClick?: () => void;
  onRate?: (e: React.MouseEvent) => void;
  isRated?: boolean;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + '…';
}

export default function ExhibitorCard({ exhibitor, onClick, onRate, isRated }: ExhibitorCardProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const hasRating = typeof exhibitor.reviewCount === 'number' && exhibitor.reviewCount > 0;

  return (
    <div
      onClick={onClick}
      className={`group relative w-full text-left rounded-lg-token border p-md-token transition-colors backdrop-blur-sm cursor-pointer ${
        isDarkMode
          ? 'bg-glass-dark border-glass-border-dark hover:bg-bg-hover-dark'
          : 'bg-glass-light border-glass-border-light hover:bg-bg-hover-light'
      }`}
    >
      <div className="flex items-start justify-between gap-sm-token mb-xs-token">
        <div className="flex items-center gap-sm-token min-w-0">
          {exhibitor.logoUrl ? (
            <img
              src={exhibitor.logoUrl}
              alt={`${exhibitor.companyName} logo`}
              className="w-10 h-10 rounded-md-token object-contain flex-shrink-0"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-md-token flex items-center justify-center text-sm-token font-semibold flex-shrink-0 ${
                isDarkMode
                  ? 'bg-bg-hover-dark text-text-secondary-dark'
                  : 'bg-bg-hover-light text-text-secondary-light'
              }`}
            >
              {exhibitor.companyName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div
              className={`text-sm-token font-semibold truncate ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}
            >
              {exhibitor.companyName}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs-token ${
                  isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
                }`}
              >
                {exhibitor.category}
              </span>

              {/* Rating aggregate summary */}
              {hasRating ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>{exhibitor.averageRating}</span>
                  <span className={`text-[10px] font-normal ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                    ({exhibitor.reviewCount})
                  </span>
                </span>
              ) : (
                <span className={`text-[10px] ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'} opacity-50`}>
                  No ratings yet
                </span>
              )}
            </div>
          </div>
        </div>

        {onRate && (
          <button
            type="button"
            disabled={isRated}
            onClick={(e) => {
              e.stopPropagation();
              onRate(e);
            }}
            title={isRated ? 'Already rated' : 'Rate this exhibitor'}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all flex-shrink-0 ${
              isRated
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 cursor-default'
                : isDarkMode
                  ? 'bg-white/5 hover:bg-amber-500/20 text-[#a1a1aa] hover:text-amber-400 border border-white/10 hover:border-amber-500/30'
                  : 'bg-gray-100 hover:bg-amber-50 text-gray-600 hover:text-amber-600 border border-gray-200 hover:border-amber-400'
            }`}
          >
            <Star className={`w-3 h-3 ${isRated ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span>{isRated ? 'Rated' : 'Rate'}</span>
          </button>
        )}
      </div>

      <p
        className={`text-xs-token leading-normal-token ${
          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
        }`}
      >
        {truncate(exhibitor.companyDescription, 120)}
      </p>

      {exhibitor.boothLabel && (
        <div
          className={`mt-xs-token text-xs-token font-medium ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}
        >
          Booth: {exhibitor.boothLabel}
        </div>
      )}
    </div>
  );
}
