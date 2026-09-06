import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Bookmark, Clock, Search, Compass, Sparkles } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { sessionService } from '../../services/sessionService';
import { favoriteService, ExpoFavoriteItem } from '../../services/favoriteService';
import { bookmarkService } from '../../services/bookmarkService';
import { feedbackService, MyRatingItem } from '../../services/feedbackService';
import { useTickets } from '../../hooks/useTickets';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import DayTabs from '../../components/session/DayTabs';
import ScheduleGrid from '../../components/session/ScheduleGrid';
import AttendeeRatingModal from '../../components/common/AttendeeRatingModal';

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

function dayKey(iso: string | Date): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function extractDays(sessions: Session[]): Date[] {
  const seen = new Set<string>();
  sessions.forEach((s) => seen.add(dayKey(s.startTime)));
  return Array.from(seen)
    .sort()
    .map((k) => new Date(k + 'T00:00:00'));
}

function sessionsForDay(sessions: Session[], day: Date): Session[] {
  const key = dayKey(day);
  return sessions.filter((s) => dayKey(s.startTime) === key);
}

function extractTracks(sessions: Session[]): string[] {
  const seen = new Set<string>();
  sessions.forEach((s) => {
    if (s.track) seen.add(s.track);
  });
  return Array.from(seen).sort();
}

type ViewMode = 'all' | 'bookmarks';

export default function MySchedulePage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { isAuthenticated } = useAuth();

  // Favorited expos
  const [favorites, setFavorites] = useState<ExpoFavoriteItem[]>([]);
  const [selectedExpoId, setSelectedExpoId] = useState<string>('');
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  // Sessions for active expo
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // Day & filter states
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedTrack, setSelectedTrack] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarkPending, setBookmarkPending] = useState<Set<string>>(new Set());

  // Session ratings
  const [ratingModalTarget, setRatingModalTarget] = useState<{
    id: string;
    name: string;
    speakerName?: string;
  } | null>(null);
  const [mySessionRatings, setMySessionRatings] = useState<MyRatingItem[]>([]);

  const ratedSessionIds = useMemo(
    () =>
      new Set(
        mySessionRatings
          .filter((r) => r.feedbackType === 'session')
          .map((r) => r.targetId)
      ),
    [mySessionRatings]
  );

  // Check-in status from user tickets for rating validation
  const { tickets } = useTickets();
  const isCheckedInToActiveExpo = useMemo(() => {
    if (!selectedExpoId || !tickets || tickets.length === 0) return false;
    return tickets.some((t: any) => {
      const ticketExpoId =
        typeof t.expoId === 'object' && t.expoId?._id
          ? t.expoId._id.toString()
          : t.expoId?.toString();
      return ticketExpoId === selectedExpoId && t.status === 'checked_in';
    });
  }, [selectedExpoId, tickets]);

  // 1. Fetch user's favorited expos
  useEffect(() => {
    favoriteService
      .getMine()
      .then((favs) => {
        setFavorites(favs || []);
        if (favs && favs.length > 0) {
          setSelectedExpoId(favs[0].expoId);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingFavorites(false));
  }, []);

  // 2. Fetch bookmarks and ratings
  const fetchRatings = useCallback(() => {
    if (!isAuthenticated) return;
    feedbackService
      .listMyRatings()
      .then((ratings) => setMySessionRatings(ratings || []))
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    bookmarkService
      .getAllMine()
      .then((sessions: any[]) => {
        const ids = new Set<string>((sessions || []).map((s: any) => String(s._id ?? s.sessionId)));
        setBookmarkedIds(ids);
      })
      .catch(() => {});
    fetchRatings();
  }, [isAuthenticated, fetchRatings]);

  // 3. Fetch sessions when selected expo changes
  const fetchSessions = useCallback(async (expoId: string) => {
    if (!expoId) {
      setSessions([]);
      return;
    }
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const data = await sessionService.list(expoId);
      const list: Session[] = Array.isArray(data) ? data : data?.sessions ?? [];
      list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      setSessions(list);
      setSelectedDayIndex(0);
    } catch (err: any) {
      setSessionsError(err?.response?.data?.message || err?.message || 'Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedExpoId) {
      fetchSessions(selectedExpoId);
    }
  }, [selectedExpoId, fetchSessions]);

  // Bookmark toggle
  const handleToggleBookmark = useCallback(
    async (sessionId: string) => {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      if (bookmarkPending.has(sessionId)) return;

      const isCurrentlyBookmarked = bookmarkedIds.has(sessionId);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyBookmarked) next.delete(sessionId);
        else next.add(sessionId);
        return next;
      });
      setBookmarkPending((prev) => new Set(prev).add(sessionId));

      try {
        if (isCurrentlyBookmarked) {
          await bookmarkService.remove(selectedExpoId, sessionId);
        } else {
          await bookmarkService.add(selectedExpoId, sessionId);
        }
      } catch {
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          if (isCurrentlyBookmarked) next.add(sessionId);
          else next.delete(sessionId);
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
    [isAuthenticated, bookmarkPending, bookmarkedIds, navigate, selectedExpoId]
  );

  // Derived filter calculations
  const days = useMemo(() => extractDays(sessions), [sessions]);
  const safeDayIndex = Math.min(selectedDayIndex, Math.max(0, days.length - 1));
  const activeDay = days[safeDayIndex];
  const tracks = useMemo(() => extractTracks(sessions), [sessions]);

  const displayedSessions = useMemo(() => {
    let list = activeDay ? sessionsForDay(sessions, activeDay) : sessions;
    if (viewMode === 'bookmarks') {
      list = list.filter((s) => bookmarkedIds.has(s._id));
    }
    if (selectedTrack) {
      list = list.filter((s) => s.track === selectedTrack);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.speakerName.toLowerCase().includes(q) ||
          (s.track && s.track.toLowerCase().includes(q))
      );
    }
    return list;
  }, [sessions, activeDay, viewMode, selectedTrack, searchQuery, bookmarkedIds]);

  const activeExpo = favorites.find((f) => f.expoId === selectedExpoId)?.expo;

  const bgCard = isDarkMode
    ? 'bg-glass-dark border-glass-border-dark'
    : 'bg-glass-light border-glass-border-light';

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="My Schedule" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">
          
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-md-token mb-lg-token">
            <div>
              <h1 className={`text-xl-token md:text-2xl-token font-bold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                My Event Schedules
              </h1>
              <p className={`text-xs-token md:text-sm-token mt-1 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                Browse sessions, view bookmarks, and rate keynotes from your favorited expos
              </p>
            </div>

            <button
              onClick={() => navigate('/expos')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg-token text-xs-token font-semibold border transition-all ${
                isDarkMode
                  ? 'border-brand-primary-dark text-brand-primary-dark hover:bg-brand-primary-dark/10'
                  : 'border-brand-primary-light text-brand-primary-light hover:bg-brand-primary-light/10'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Browse More Expos</span>
            </button>
          </div>

          {/* Favorited Expo Selector Tabs */}
          {loadingFavorites ? (
            <div className="py-12 text-center text-xs opacity-60">Loading your favorited events…</div>
          ) : favorites.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl-token border backdrop-blur-md ${bgCard}`}>
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40 text-brand-primary-dark" />
              <h2 className={`text-base-token font-bold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                No Favorited Expos Yet
              </h2>
              <p className={`text-xs-token max-w-md mx-auto mt-1 mb-md-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                Favorite an expo using the heart icon on any expo card to keep track of its full agenda right here.
              </p>
              <button
                onClick={() => navigate('/expos')}
                className={`inline-flex items-center gap-2 px-md-token py-sm-token rounded-lg-token text-xs-token font-semibold ${
                  isDarkMode
                    ? 'bg-brand-primary-dark text-text-on-primary-dark hover:bg-accent-hover-dark'
                    : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Explore Upcoming Expos</span>
              </button>
            </div>
          ) : (
            <>
              {/* Event Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-md-token scrollbar-none">
                {favorites.map((fav) => {
                  const isSelected = fav.expoId === selectedExpoId;
                  return (
                    <button
                      key={fav.expoId}
                      onClick={() => setSelectedExpoId(fav.expoId)}
                      className={`px-3 py-1.5 rounded-lg-token text-xs-token font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                        isSelected
                          ? isDarkMode
                            ? 'bg-brand-primary-dark text-text-on-primary-dark border-brand-primary-dark shadow-sm'
                            : 'bg-brand-primary-light text-text-on-primary-light border-brand-primary-light shadow-sm'
                          : isDarkMode
                          ? 'bg-glass-dark border-glass-border-dark text-text-secondary-dark hover:text-white hover:border-white/20'
                          : 'bg-glass-light border-glass-border-light text-text-secondary-light hover:text-black hover:border-black/20'
                      }`}
                    >
                      <span>{fav.expo?.name || 'Expo'}</span>
                    </button>
                  );
                })}
              </div>

              {/* Expo Context Bar */}
              {activeExpo && (
                <div className={`p-md-token rounded-xl-token border mb-lg-token flex flex-wrap items-center justify-between gap-sm-token backdrop-blur-md ${bgCard}`}>
                  <div>
                    <h2 className={`text-base-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                      {activeExpo.name}
                    </h2>
                    <p className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                      {activeExpo.venueName} · {activeExpo.category || 'Exhibition'}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate(`/expos/${selectedExpoId}`)}
                    className="text-xs-token font-medium text-brand-primary-dark hover:underline"
                  >
                    View Expo Details →
                  </button>
                </div>
              )}

              {/* Filter controls row */}
              <div className="flex flex-wrap items-center justify-between gap-sm-token mb-md-token">
                {/* Search & Track Filter */}
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                    <input
                      type="text"
                      placeholder="Search session title or speaker…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-8 pr-3 py-1.5 rounded-lg-token border text-xs-token outline-none ${
                        isDarkMode
                          ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark placeholder:text-text-secondary-dark'
                          : 'bg-white border-border-base-light text-text-primary-light placeholder:text-text-secondary-light'
                      }`}
                    />
                  </div>

                  {tracks.length > 0 && (
                    <select
                      value={selectedTrack}
                      onChange={(e) => setSelectedTrack(e.target.value)}
                      className={`px-3 py-1.5 rounded-lg-token border text-xs-token font-medium outline-none ${
                        isDarkMode
                          ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark'
                          : 'bg-white border-border-base-light text-text-primary-light'
                      }`}
                    >
                      <option value="">All Tracks</option>
                      {tracks.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* View Mode Toggle: All vs Bookmarks */}
                <div className="flex items-center rounded-lg-token border p-0.5 bg-black/5">
                  <button
                    type="button"
                    onClick={() => setViewMode('all')}
                    className={`px-3 py-1 rounded-md-token text-xs-token font-semibold transition-all ${
                      viewMode === 'all'
                        ? isDarkMode
                          ? 'bg-brand-primary-dark text-text-on-primary-dark shadow-sm'
                          : 'bg-brand-primary-light text-text-on-primary-light shadow-sm'
                        : isDarkMode
                        ? 'text-text-secondary-dark hover:text-white'
                        : 'text-text-secondary-light hover:text-black'
                    }`}
                  >
                    All Sessions ({sessions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('bookmarks')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md-token text-xs-token font-semibold transition-all ${
                      viewMode === 'bookmarks'
                        ? isDarkMode
                          ? 'bg-brand-primary-dark text-text-on-primary-dark shadow-sm'
                          : 'bg-brand-primary-light text-text-on-primary-light shadow-sm'
                        : isDarkMode
                        ? 'text-text-secondary-dark hover:text-white'
                        : 'text-text-secondary-light hover:text-black'
                    }`}
                  >
                    <Bookmark className="w-3 h-3" />
                    <span>Bookmarks ({bookmarkedIds.size})</span>
                  </button>
                </div>
              </div>

              {/* Day Tabs (if multiple days) */}
              {days.length > 1 && (
                <div className="mb-md-token">
                  <DayTabs
                    days={days}
                    selectedIndex={safeDayIndex}
                    onSelect={setSelectedDayIndex}
                  />
                </div>
              )}

              {/* Schedule Grid Content */}
              {sessionsLoading ? (
                <div className="py-16 text-center text-xs opacity-60">Loading sessions…</div>
              ) : sessionsError ? (
                <div className="p-4 rounded-lg-token bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                  {sessionsError}
                </div>
              ) : displayedSessions.length === 0 ? (
                <div className={`p-12 text-center rounded-xl-token border backdrop-blur-md ${bgCard}`}>
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-text-secondary-dark" />
                  <p className="text-sm font-semibold">No sessions found</p>
                  <p className="text-xs text-text-secondary-dark mt-1">
                    {viewMode === 'bookmarks'
                      ? 'You have not bookmarked any sessions for this event yet.'
                      : 'No sessions match your search or track filter.'}
                  </p>
                </div>
              ) : (
                <ScheduleGrid
                  sessions={displayedSessions}
                  isOrganizer={false}
                  showBookmarks={true}
                  bookmarkedSessionIds={bookmarkedIds}
                  onBookmarkToggle={handleToggleBookmark}
                  onRate={
                    isCheckedInToActiveExpo
                      ? (sessionId: string) => {
                          const s = displayedSessions.find((x) => x._id === sessionId);
                          if (s) setRatingModalTarget({ id: s._id, name: s.title, speakerName: s.speakerName });
                        }
                      : undefined
                  }
                  isRatedIds={ratedSessionIds}
                />
              )}
            </>
          )}
        </main>
      </div>
      <BottomNav />

      {/* Attendee Session Rating Modal */}
      {ratingModalTarget && (
        <AttendeeRatingModal
          isOpen={!!ratingModalTarget}
          targetId={ratingModalTarget.id}
          targetName={ratingModalTarget.name}
          speakerName={ratingModalTarget.speakerName}
          initialType="session"
          onClose={() => setRatingModalTarget(null)}
          onSuccess={() => {
            fetchRatings();
          }}
        />
      )}
    </div>
  );
}
