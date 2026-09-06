import { useTheme } from '../../contexts/ThemeContext';
import SessionCard from './SessionCard';

interface Session {
  _id: string;
  title: string;
  speakerName: string;
  startTime: string | Date;
  endTime: string | Date;
  room: string;
  track?: string;
  description?: string;
}

interface ScheduleGridProps {
  sessions: Session[];
  bookmarkedSessionIds?: Set<string>;
  onBookmarkToggle?: (sessionId: string) => void;
  showBookmarks?: boolean;
  onEditSession?: (session: Session) => void;
  onDeleteSession?: (sessionId: string) => void;
  isOrganizer?: boolean;
  onRate?: (sessionId: string) => void;
  isRatedIds?: Set<string>;
}

function formatTime(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ScheduleGrid({
  sessions,
  bookmarkedSessionIds = new Set(),
  onBookmarkToggle,
  showBookmarks = false,
  onEditSession,
  onDeleteSession,
  isOrganizer = false,
  onRate,
  isRatedIds = new Set(),
}: ScheduleGridProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Sort by startTime ascending
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className={`text-center py-xl-token text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
        No sessions scheduled for this day.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-sm-token">
      {sorted.map((session) => (
        <div key={session._id} className="flex gap-md-token items-start">
          {/* Time label column */}
          <div className={`w-[72px] shrink-0 pt-md-token text-xs-token font-medium text-right ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}>
            {formatTime(session.startTime)}
          </div>

          {/* Timeline connector */}
          <div className="flex flex-col items-center pt-md-token">
            <div
              className={`w-2 h-2 rounded-full mt-xs-token ${isDarkMode ? 'bg-brand-primary-dark' : 'bg-brand-primary-light'}`}
              aria-hidden="true"
            />
            <div
              className={`w-px flex-1 mt-xs-token ${isDarkMode ? 'bg-border-base-dark' : 'bg-border-base-light'}`}
              aria-hidden="true"
            />
          </div>

          {/* Session card */}
          <div className="flex-1 pb-sm-token">
            <SessionCard
              session={session}
              isBookmarked={bookmarkedSessionIds.has(session._id)}
              onBookmarkToggle={showBookmarks ? onBookmarkToggle : undefined}
              showBookmark={showBookmarks}
              onRate={onRate}
              isRated={isRatedIds.has(session._id)}
            />

            {/* Organizer quick actions */}
            {isOrganizer && (
              <div className="flex gap-xs-token mt-xs-token">
                {onEditSession && (
                  <button
                    onClick={() => onEditSession(session)}
                    className={`px-sm-token py-xs-token rounded-md-token text-xs-token font-medium border transition-colors ${
                      isDarkMode
                        ? 'border-border-base-dark text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
                        : 'border-border-base-light text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light'
                    }`}
                  >
                    Edit
                  </button>
                )}
                {onDeleteSession && (
                  <button
                    onClick={() => onDeleteSession(session._id)}
                    className={`px-sm-token py-xs-token rounded-md-token text-xs-token font-medium border transition-colors ${
                      isDarkMode
                        ? 'border-text-danger-dark text-text-danger-dark hover:bg-bg-danger-dark'
                        : 'border-text-danger-light text-text-danger-light hover:bg-bg-danger-light'
                    }`}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
