import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Bookmark } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { sessionService } from '../../services/sessionService';
import { bookmarkService } from '../../services/bookmarkService';
import { useTickets } from '../../hooks/useTickets';
import PublicNavBar from '../../components/layout/PublicNavBar';
import DayTabs from '../../components/session/DayTabs';
import ScheduleGrid from '../../components/session/ScheduleGrid';

// ── Types ────────────────────────────────────────────────────────────────────

type Session = {
  _id: string;
  title: string;
  speakerName: string;
  startTime: string;
  endTime: string;
  room: string;
  track?: string;
  description?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Return a "YYYY-MM-DD" key for grouping sessions by calendar day (local time).
 */
function dayKey(iso: string | Date): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Build a sorted array of unique calendar days from a list of sessions.
 */
function extractDays(sessions: Session[]): Date[] {
  const seen = new Set<string>();
  sessions.forEach((s) => seen.add(dayKey(s.startTime)));
  return Array.from(seen)
    .sort()
    .map((k) => new Date(k + 'T00:00:00'));
}

/**
 * Filter sessions to those whose startTime falls on the given calendar day.
 */
function sessionsForDay(sessions: Session[], day: Date): Session[] {
  const key = dayKey(day);
  return sessions.filter((s) => dayKey(s.startTime) === key);
}

/**
 * Extract unique non-empty track values from a list of sessions.
 */
function extractTracks(sessions: Session[]): string[] {
  const seen = new Set<string>();
  sessions.forEach((s) => { if (s.track) seen.add(s.track); });
  return Array.from(seen).sort();
}

// ── View filter type ─────────────────────────────────────────────────────────

type ViewMode = 'all' | 'bookmarks';

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ScheduleBrowsePage() {
  const { id: expoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { isAuthenticated } = useAuth();

  // ── Sessions ───────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // ── Day navigation ─────────────────────────────────────────────────────────
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedTrack, setSelectedTrack] = useState('');

  // ── Bookmarks ──────────────────────────────────────────────────────────────
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarkPending, setBookmarkPending] = useState<Set<string>>(new Set());

  // ── Ticket check ──────────────────────────────────────────────────────────
  const { tickets, loading: ticketsLoading } = useTickets();

  // True if the user holds an active/checked_in ticket for THIS expo
  const hasQualifyingTicket = useMemo(() => {
    if (!isAuthenticated || ticketsLoading) return false;
    return tickets.some(
      (t: any) =>
        (t.status === 'active' || t.status === 'checked_in') &&
        // expoId stored as a string or ObjectId on the ticket
        (t.expoId === expoId ||
          t.expoId?._id === expoId ||
          t.expo === expoId ||
          t.expo?._id === expoId),
    );
  }, [isAuthenticated, ticketsLoading, tickets, expoId]);

  // ── Fetch sessions ─────────────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    if (!expoId) return;
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const data = await sessionService.list(expoId);
      const list: Session[] = Array.isArray(data) ? data : [];
      list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      setSessions(list);
    } catch (err: any) {
      setSessionsError(
        err?.response?.data?.message || err?.message || 'Failed to load sessions',
      );
    } finally {
      setSessionsLoading(false);
    }
  }, [expoId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ── Fetch bookmarks (only when user has a qualifying ticket) ───────────────
  useEffect(() => {
    if (!expoId || !isAuthenticated || !hasQualifyingTicket) return;
    let cancelled = false;

    bookmarkService
      .getMine(expoId)
      .then((data: any) => {
        if (cancelled) return;
        // Backend returns an array of session objects or bookmark objects
        // Shape: ISession[] or { sessionId: string }[] — handle both
        const ids = new Set<string>(
          (Array.isArray(data) ? data : []).map((item: any) =>
            item._id ?? item.sessionId ?? item,
          ),
        );
        setBookmarkedIds(ids);
      })
      .catch(() => {
        // Non-fatal — bookmarks simply remain empty
      });

    return () => {
      cancelled = true;
    };
  }, [expoId, isAuthenticated, hasQualifyingTicket]);

  // ── Derived day data ───────────────────────────────────────────────────────
  const days = extractDays(sessions);
  const safeDayIndex = Math.min(selectedDayIndex, Math.max(0, days.length - 1));
  const daySessions = days.length > 1 ? sessionsForDay(sessions, days[safeDayIndex]) : sessions;

  // Tracks available for the currently visible day
  const availableTracks = useMemo(() => extractTracks(daySessions), [daySessions]);

  // Reset track filter when the day changes
  useEffect(() => {
    setSelectedTrack('');
  }, [safeDayIndex]);

  // ── Filtered sessions for display ─────────────────────────────────────────
  const displaySessions = useMemo(() => {
    let list = daySessions;

    // Track filter
    if (selectedTrack) {
      list = list.filter((s) => s.track === selectedTrack);
    }

    // View mode filter
    if (viewMode === 'bookmarks') {
      list = list.filter((s) => bookmarkedIds.has(s._id));
    }

    return list;
  }, [daySessions, selectedTrack, viewMode, bookmarkedIds]);

  // ── Bookmark toggle ────────────────────────────────────────────────────────
  const handleBookmarkToggle = useCallback(
    async (sessionId: string) => {
      if (!expoId || bookmarkPending.has(sessionId)) return;

      const isCurrentlyBookmarked = bookmarkedIds.has(sessionId);

      // Optimistic update
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyBookmarked) {
          next.delete(sessionId);
        } else {
          next.add(sessionId);
        }
        return next;
      });

      setBookmarkPending((prev) => new Set(prev).add(sessionId));

      try {
        if (isCurrentlyBookmarked) {
          await bookmarkService.remove(expoId, sessionId);
        } else {
          await bookmarkService.add(expoId, sessionId);
        }
      } catch {
        // Revert optimistic update on failure
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          if (isCurrentlyBookmarked) {
            next.add(sessionId);
          } else {
            next.delete(sessionId);
          }
          return next;
        });
      } finally {
        setBookmarkPending((prev) => {
          const next = new Set(prev);
          next.delete(sessionId);
          return next;
        });
      }
    },
    [expoId, bookmarkedIds, bookmarkPending],
  );

  // ── Styling helpers ────────────────────────────────────────────────────────
  const textPrimary = isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light';
  const textSecondary = isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light';

  const borderBase = isDarkMode ? 'border-border-base-dark' : 'border-border-base-light';
  const borderStrong = isDarkMode ? 'border-[#3A3A3F]' : 'border-[#3A3A3F]';

  // Filter toggle button style
  const filterBtnActive = `border ${borderStrong} text-[#FF4D2E] bg-[#2C0B03]`;
  const filterBtnInactive = `border ${borderBase} ${textSecondary} bg-transparent ${
    isDarkMode ? 'hover:bg-bg-hover-dark hover:text-text-primary-dark' : 'hover:bg-bg-hover-light hover:text-text-primary-light'
  }`;

  const isLoading = sessionsLoading || ticketsLoading;

  return (
    <div className="min-h-screen">
      <PublicNavBar />

      <div className="max-w-4xl mx-auto px-md-token md:px-lg-token py-lg-token md:py-xl-token">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="mb-xl-token">
          <h1 className={`text-xl-token font-semibold leading-tight-token mb-xs-token ${textPrimary}`}>
            Session schedule
          </h1>
          <p className={`text-sm-token ${textSecondary}`}>
            Browse sessions and plan your visit
          </p>
        </div>

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {isLoading && (
          <div className={`text-center py-xl-token text-sm-token ${textSecondary}`}>
            Loading schedule…
          </div>
        )}

        {/* ── Fetch error ───────────────────────────────────────────────────── */}
        {!isLoading && sessionsError && (
          <div
            className={`text-center py-xl-token text-sm-token ${
              isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
            }`}
          >
            {sessionsError}
          </div>
        )}

        {/* ── Content ───────────────────────────────────────────────────────── */}
        {!isLoading && !sessionsError && (
          <>
            {/* ── "Register to access bookmarks" prompt (REQ-7.7) ──────────── */}
            {(!isAuthenticated || !hasQualifyingTicket) && sessions.length > 0 && (
              <div
                className={`flex flex-wrap items-center justify-between gap-sm-token mb-lg-token px-md-token py-sm-token rounded-lg-token border ${
                  isDarkMode
                    ? 'bg-[#1C1200] border-[#3D2E00] text-[#EF9F27]'
                    : 'bg-[#FEF9EC] border-[#F5D87C] text-[#92600A]'
                }`}
                role="status"
              >
                <div className="flex items-center gap-sm-token">
                  <Bookmark className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <p className="text-sm-token font-medium">
                    {isAuthenticated
                      ? 'Register for this expo to bookmark sessions'
                      : 'Sign in and register for this expo to bookmark sessions'}
                  </p>
                </div>
                <button
                  onClick={() =>
                    isAuthenticated
                      ? navigate(`/expos/${expoId}`)
                      : navigate(`/login?redirect=/expos/${expoId}/schedule`)
                  }
                  className={`flex-shrink-0 px-sm-token py-xs-token rounded-[8px] text-sm-token font-semibold border transition-colors ${borderStrong} ${textPrimary} bg-transparent`}
                >
                  {isAuthenticated ? 'Register now' : 'Sign in'}
                </button>
              </div>
            )}

            {sessions.length === 0 ? (
              // ── Empty state ────────────────────────────────────────────────
              <div
                className={`flex flex-col items-center text-center py-xl-token gap-md-token ${textSecondary}`}
              >
                <Calendar className="w-10 h-10 opacity-40" aria-hidden="true" />
                <p className={`text-base-token font-medium ${textPrimary}`}>No sessions yet</p>
                <p className="text-sm-token">
                  The organizer hasn't added any sessions to the schedule yet.
                </p>
              </div>
            ) : (
              <>
                {/* ── DayTabs (REQ-7.3) — only shown when expo spans multiple days ── */}
                {days.length > 1 && (
                  <div className="mb-lg-token">
                    <DayTabs
                      days={days}
                      selectedIndex={safeDayIndex}
                      onSelect={(i) => {
                        setSelectedDayIndex(i);
                        setViewMode('all');
                      }}
                    />
                  </div>
                )}

                {/* ── Filter controls row ────────────────────────────────────── */}
                <div className="flex flex-wrap items-center gap-sm-token mb-lg-token">
                  {/* View mode toggle: All / My Bookmarks (REQ-7.8) */}
                  <div className={`flex rounded-[8px] overflow-hidden border ${borderBase}`}>
                    <button
                      onClick={() => setViewMode('all')}
                      aria-pressed={viewMode === 'all'}
                      className={`px-sm-token py-xs-token text-sm-token font-medium transition-colors ${
                        viewMode === 'all' ? filterBtnActive : filterBtnInactive
                      }`}
                    >
                      All sessions
                    </button>
                    <button
                      onClick={() => {
                        if (!isAuthenticated || !hasQualifyingTicket) return;
                        setViewMode('bookmarks');
                      }}
                      aria-pressed={viewMode === 'bookmarks'}
                      disabled={!isAuthenticated || !hasQualifyingTicket}
                      title={
                        !isAuthenticated || !hasQualifyingTicket
                          ? 'Register for this expo to use bookmarks'
                          : undefined
                      }
                      className={`px-sm-token py-xs-token text-sm-token font-medium transition-colors border-l ${borderBase} disabled:opacity-40 disabled:cursor-not-allowed ${
                        viewMode === 'bookmarks' ? filterBtnActive : filterBtnInactive
                      }`}
                    >
                      My bookmarks
                      {hasQualifyingTicket && bookmarkedIds.size > 0 && (
                        <span
                          className={`ml-xs-token inline-flex items-center justify-center w-4 h-4 rounded-full text-xs-token font-semibold ${
                            viewMode === 'bookmarks'
                              ? 'bg-[#FF4D2E] text-[#2C0B03]'
                              : isDarkMode
                              ? 'bg-bg-hover-dark text-text-secondary-dark'
                              : 'bg-bg-hover-light text-text-secondary-light'
                          }`}
                          aria-label={`${bookmarkedIds.size} bookmarked`}
                        >
                          {bookmarkedIds.size}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Track filter (REQ-7.4 / REQ-7.6) */}
                  {availableTracks.length > 0 && (
                    <div className="flex flex-wrap gap-xs-token">
                      <button
                        onClick={() => setSelectedTrack('')}
                        aria-pressed={selectedTrack === ''}
                        className={`px-sm-token py-xs-token rounded-[8px] text-xs-token font-medium border transition-colors ${
                          selectedTrack === '' ? filterBtnActive : filterBtnInactive
                        }`}
                      >
                        All tracks
                      </button>
                      {availableTracks.map((track) => (
                        <button
                          key={track}
                          onClick={() => setSelectedTrack(selectedTrack === track ? '' : track)}
                          aria-pressed={selectedTrack === track}
                          className={`px-sm-token py-xs-token rounded-[8px] text-xs-token font-medium border transition-colors ${
                            selectedTrack === track ? filterBtnActive : filterBtnInactive
                          }`}
                        >
                          {track}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Session count label ────────────────────────────────────── */}
                <p className={`text-xs-token mb-md-token ${textSecondary}`}>
                  {viewMode === 'bookmarks'
                    ? `${displaySessions.length} bookmarked session${displaySessions.length === 1 ? '' : 's'}`
                    : days.length > 1
                    ? `${displaySessions.length} session${displaySessions.length === 1 ? '' : 's'} on this day`
                    : `${displaySessions.length} session${displaySessions.length === 1 ? '' : 's'}`}
                </p>

                {/* ── Empty bookmarks state ──────────────────────────────────── */}
                {viewMode === 'bookmarks' && displaySessions.length === 0 && (
                  <div
                    className={`flex flex-col items-center text-center py-xl-token gap-sm-token ${textSecondary}`}
                  >
                    <Bookmark className="w-8 h-8 opacity-40" aria-hidden="true" />
                    <p className={`text-base-token font-medium ${textPrimary}`}>
                      No bookmarks yet
                    </p>
                    <p className="text-sm-token">
                      Tap the bookmark icon on any session to save it here.
                    </p>
                    <button
                      onClick={() => setViewMode('all')}
                      className={`mt-xs-token px-md-token py-xs-token rounded-[8px] text-sm-token font-medium border transition-colors ${borderStrong} ${textPrimary} bg-transparent`}
                    >
                      Browse sessions
                    </button>
                  </div>
                )}

                {/* ── No sessions match track filter ─────────────────────────── */}
                {viewMode === 'all' && displaySessions.length === 0 && (
                  <div className={`text-center py-xl-token text-sm-token ${textSecondary}`}>
                    No sessions match the selected track filter.
                  </div>
                )}

                {/* ── ScheduleGrid ───────────────────────────────────────────── */}
                {displaySessions.length > 0 && (
                  <ScheduleGrid
                    sessions={displaySessions}
                    bookmarkedSessionIds={bookmarkedIds}
                    onBookmarkToggle={hasQualifyingTicket ? handleBookmarkToggle : undefined}
                    showBookmarks={hasQualifyingTicket}
                    isOrganizer={false}
                  />
                )}

                {/* ── Attendee count / day summary label ────────────────────── */}
                {days.length > 1 && displaySessions.length > 0 && (
                  <p className={`text-xs-token text-center mt-xl-token ${textSecondary}`}>
                    Showing day {safeDayIndex + 1} of {days.length}
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
