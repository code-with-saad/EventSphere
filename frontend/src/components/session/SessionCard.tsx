import React from 'react';
import { Bookmark, BookmarkCheck, Clock, MapPin, Star, UserCheck, Users, Radio } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface SessionCardProps {
  session: {
    _id: string;
    title: string;
    speakerName: string;
    startTime: string | Date;
    endTime: string | Date;
    room: string;
    capacity?: number;
    registrationCount?: number;
    isRegistered?: boolean;
    isFull?: boolean;
    track?: string;
    description?: string;
  };
  isBookmarked?: boolean;
  onBookmarkToggle?: (sessionId: string) => void;
  showBookmark?: boolean;
  onRegisterToggle?: (sessionId: string, isRegistered: boolean) => void;
  showRegister?: boolean;
  registerPending?: boolean;
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
  onRegisterToggle,
  showRegister = false,
  registerPending = false,
  onRate,
  isRated = false,
}: SessionCardProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const now = new Date();
  const start = new Date(session.startTime);
  const end = new Date(session.endTime);
  const isLive = now >= start && now < end;

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmarkToggle?.(session._id);
  };

  const handleRegister = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRegisterToggle?.(session._id, !!session.isRegistered);
  };

  return (
    <div
      className={`rounded-lg-token border p-md-token transition-all relative ${
        isLive
          ? isDarkMode
            ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
            : 'bg-emerald-50/50 border-emerald-400 shadow-sm shadow-emerald-500/10'
          : isDarkMode
            ? 'bg-bg-surface-dark border-border-base-dark'
            : 'bg-bg-surface-light border-border-base-light'
      }`}
    >
      {/* Top row: track badge + Live indicator + actions */}
      <div className="flex items-start justify-between gap-sm-token mb-xs-token">
        <div className="flex flex-wrap items-center gap-xs-token">
          {isLive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 animate-pulse">
              <Radio className="w-3 h-3" />
              Live Now
            </span>
          )}

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

          {session.capacity && session.capacity > 0 && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                session.isFull && !session.isRegistered
                  ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                  : isDarkMode
                    ? 'bg-white/5 text-text-secondary-dark border border-white/10'
                    : 'bg-gray-100 text-text-secondary-light border border-gray-200'
              }`}
            >
              <Users className="w-3 h-3" />
              {session.registrationCount ?? 0}/{session.capacity} spots
              {session.isFull && !session.isRegistered && ' (Full)'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {showRegister && onRegisterToggle && (
            <button
              type="button"
              disabled={registerPending || (session.isFull && !session.isRegistered)}
              onClick={handleRegister}
              className={`px-2.5 py-1 rounded-md-token text-xs font-semibold flex items-center gap-1 transition-all ${
                session.isRegistered
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                  : session.isFull
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 border border-transparent cursor-not-allowed'
                    : isDarkMode
                      ? 'bg-brand-primary-dark/20 text-brand-primary-dark hover:bg-brand-primary-dark/30 border border-brand-primary-dark/40'
                      : 'bg-brand-primary-light/15 text-brand-primary-light hover:bg-brand-primary-light/25 border border-brand-primary-light/30'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{session.isRegistered ? 'Registered' : session.isFull ? 'Full' : 'RSVP / Register'}</span>
            </button>
          )}

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
