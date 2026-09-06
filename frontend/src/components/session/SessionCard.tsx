import React from 'react';
import { Bookmark, BookmarkCheck, Clock, MapPin, Star } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface SessionCardProps {
  session: {
    _id: string;
    title: string;
    speakerName: string;
    startTime: string | Date;
    endTime: string | Date;
    room: string;
    track?: string;
    description?: string;
  };
  isBookmarked?: boolean;
  onBookmarkToggle?: (sessionId: string) => void;
  showBookmark?: boolean;
  onRate?: (sessionId: string) => void;
  isRated?: boolean;
}

function formatTime(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SessionCard({
  session,
  isBookmarked = false,
  onBookmarkToggle,
  showBookmark = false,
  onRate,
  isRated = false,
}: SessionCardProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmarkToggle?.(session._id);
  };

  return (
    <div
      className={`rounded-lg-token border p-md-token transition-colors ${
        isDarkMode
          ? 'bg-bg-surface-dark border-border-base-dark'
          : 'bg-bg-surface-light border-border-base-light'
      }`}
    >
      {/* Top row: track badge + actions */}
      <div className="flex items-start justify-between gap-sm-token mb-xs-token">
        <div className="flex flex-wrap gap-xs-token">
          {session.track && (
            <span
              className={`inline-flex items-center px-sm-token py-xs-token rounded-sm-token text-xs-token font-medium ${
                isDarkMode
                  ? 'bg-bg-hover-dark text-brand-primary-dark'
                  : 'bg-bg-hover-light text-brand-primary-light'
              }`}
            >
              {session.track}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {onRate && (
            <button
              type="button"
              disabled={isRated}
              onClick={(e) => {
                e.stopPropagation();
                onRate(session._id);
              }}
              title={isRated ? 'Already rated' : 'Rate this session'}
              className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
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

          {showBookmark && onBookmarkToggle && (
            <button
              onClick={handleBookmark}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this session'}
              aria-pressed={isBookmarked}
              className={`p-xs-token rounded-md-token transition-colors flex-shrink-0 ${
                isBookmarked
                  ? isDarkMode
                    ? 'text-brand-primary-dark'
                    : 'text-brand-primary-light'
                  : isDarkMode
                    ? 'text-text-secondary-dark hover:text-text-primary-dark hover:bg-bg-hover-dark'
                    : 'text-text-secondary-light hover:text-text-primary-light hover:bg-bg-hover-light'
              }`}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <h3
        className={`text-base-token font-semibold leading-tight-token mb-xs-token ${
          isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
        }`}
      >
        {session.title}
      </h3>

      {/* Speaker */}
      <p
        className={`text-sm-token mb-sm-token ${
          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
        }`}
      >
        {session.speakerName}
      </p>

      {/* Time + room */}
      <div
        className={`flex flex-wrap gap-md-token text-xs-token ${
          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
        }`}
      >
        <span className="flex items-center gap-xs-token">
          <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
          {formatTime(session.startTime)} – {formatTime(session.endTime)}
        </span>
        <span className="flex items-center gap-xs-token">
          <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
          {session.room}
        </span>
      </div>

      {/* Description (optional) */}
      {session.description && (
        <p
          className={`mt-sm-token text-xs-token leading-normal-token ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}
        >
          {session.description}
        </p>
      )}
    </div>
  );
}
