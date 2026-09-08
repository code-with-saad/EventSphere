import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Bookmark, Clock, Search, Compass, Sparkles, Download, Ticket, Heart } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { sessionService } from '../../services/sessionService';
import { expoService } from '../../services/expoService';
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
import toast from 'react-hot-toast';

// ── Types ────────────────────────────────────────────────────────────────────

type Session = {
  _id: string;
  title: string;
  speakerName: string;
  startTime: string;
  endTime: string;
  room: string;
  capacity?: number;
  registrationCount?: number;
  waitlistCount?: number;
  isRegistered?: boolean;
  isWaitlisted?: boolean;
  waitlistPosition?: number | null;
  isFull?: boolean;
  track?: string;
  description?: string;
};

type ExpoTabItem = {
  expoId: string;
  name: string;
  venueName?: string;
  category?: string;
  source: 'ticket' | 'favorite';
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

type ViewMode = 'all' | 'bookmarks' | 'registered';

export default function MySchedulePage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { isAuthenticated } = useAuth();

  // Tickets & Favorites
  const { tickets, loading: loadingTickets } = useTickets();
  const [favorites, setFavorites] = useState<ExpoFavoriteItem[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [selectedExpoId, setSelectedExpoId] = useState<string>('');

  // Sessions for active expo
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  // Day & filter states
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedTrack, setSelectedTrack] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [icsDownloading, setIcsDownloading] = useState(false);

  // Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarkPending, setBookmarkPending] = useState<Set<string>>(new Set());

  // RSVP / Register pending
  const [registerPending, setRegisterPending] = useState<Set<string>>(new Set());

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

  // 1. Fetch user's favorited expos
  useEffect(() => {
    favoriteService
      .getMine()
      .then((favs) => {
        setFavorites(favs || []);
      })
      .catch(() => {})
      .finally(() => setLoadingFavorites(false));
  }, []);

  // 2. Build merged Expo tabs (Both Registered Tickets + Favorites)
  const expoTabs = useMemo<ExpoTabItem[]>(() => {
    const map = new Map<string, ExpoTabItem>();

    // Add ticketed expos first
    (tickets || []).forEach((t: any) => {
      const eid =
        (typeof t.expoId === 'object' && t.expoId?._id ? t.expoId._id : t.expoId) ||
        (typeof t.expo === 'object' && t.expo?._id ? t.expo._id : t.expo) ||
        '';
      const idStr = eid ? eid.toString() : '';
      if (!idStr) return;

      const name =
        (typeof t.expoId === 'object' && t.expoId?.name ? t.expoId.name : null) ||
        (typeof t.expo === 'object' && t.expo?.name ? t.expo.name : null) ||
        t.expoName ||
        'My Expo';
      
      const venue =
        (typeof t.expoId === 'object' && t.expoId?.venueName ? t.expoId.venueName : null) ||
        (typeof t.expo === 'object' && t.expo?.venueName ? t.expo.venueName : null) ||
        '';

      const category =
        (typeof t.expoId === 'object' && t.expoId?.category ? t.expoId.category : null) ||
        (typeof t.expo === 'object' && t.expo?.category ? t.expo.category : null) ||
        '';

      map.set(idStr, {
        expoId: idStr,
        name,
        venueName: venue,
        category,
        source: 'ticket',
      });
    });

    // Add favorited expos
    (favorites || []).forEach((f) => {
      if (!map.has(f.expoId)) {
        map.set(f.expoId, {
          expoId: f.expoId,
          name: f.expo?.name || 'Favorited Expo',
          venueName: f.expo?.venueName || '',
          category: f.expo?.category || '',
          source: 'favorite',
        });
      }
    });

    return Array.from(map.values());
  }, [tickets, favorites]);

  // Set default selected expo once tabs load
  useEffect(() => {
    if (!selectedExpoId && expoTabs.length > 0) {
      setSelectedExpoId(expoTabs[0].expoId);
    }
  }, [expoTabs, selectedExpoId]);

  // Check-in status from user tickets for rating validation
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

  // Has ticket for active expo (for session registration)
  const hasTicketForActiveExpo = useMemo(() => {
    if (!selectedExpoId || !tickets || tickets.length === 0) return false;
    return tickets.some((t: any) => {
      const ticketExpoId =
        typeof t.expoId === 'object' && t.expoId?._id
          ? t.expoId._id.toString()
          : t.expoId?.toString();
      return ticketExpoId === selectedExpoId && (t.status === 'active' || t.status === 'checked_in');
    });
  }, [selectedExpoId, tickets]);

  // 3. Fetch bookmarks and ratings
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
      .then((sessionsList: any[]) => {
        const ids = new Set<string>((sessionsList || []).map((s: any) => String(s._id ?? s.sessionId)));
        setBookmarkedIds(ids);
      })
      .catch(() => {});
    fetchRatings();
  }, [isAuthenticated, fetchRatings]);

  // 4. Fetch sessions when selected expo changes
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

  // ── Session Registration (RSVP) toggle ──
  const handleRegisterToggle = useCallback(
    async (sessionId: string, isCurrentlyRegistered: boolean) => {
      if (!selectedExpoId || registerPending.has(sessionId)) return;

      const targetSession = sessions.find((s) => s._id === sessionId);
      const isCurrentlyWaitlisted = targetSession?.isWaitlisted;

      setRegisterPending((prev) => new Set(prev).add(sessionId));

      try {
        if (isCurrentlyRegistered || isCurrentlyWaitlisted) {
          await sessionService.unregister(selectedExpoId, sessionId);
          toast.success(isCurrentlyWaitlisted ? 'Left session waitlist' : 'Session registration cancelled');
        } else {
          const res = await sessionService.register(selectedExpoId, sessionId);
          if (res?.data?.type === 'waitlisted') {
            toast.success(`Session full. You joined the waitlist (#${res.data.position || 1})!`);
          } else {
            toast.success('Registered for session successfully!');
          }
        }
        await fetchSessions(selectedExpoId);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || err?.message || 'Failed to update session status');
      } finally {
        setRegisterPending((prev) => {
          const next = new Set(prev);
          next.delete(sessionId);
          return next;
        });
      }
    },
    [selectedExpoId, registerPending, sessions, fetchSessions]
  );

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
    } else if (viewMode === 'registered') {
      list = list.filter((s) => s.isRegistered);
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

  const activeTabExpo = expoTabs.find((t) => t.expoId === selectedExpoId);

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

          {/* Loading or Empty State */}
          {loadingFavorites || loadingTickets ? (
            <div className="py-12 text-center text-xs opacity-60">Loading your schedules & events…</div>
          ) : expoTabs.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl-token border backdrop-blur-md ${bgCard}`}>
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40 text-brand-primary-dark" />
              <h2 className={`text-base-token font-bold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                No Event Schedules Yet
              </h2>
              <p className={`text-xs-token max-w-md mx-auto mt-1 mb-md-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                Register for an expo or favorite an event to view its full agenda and reserve seats right here.
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
                {expoTabs.map((tab) => {
                  const isSelected = tab.expoId === selectedExpoId;
                  return (
                    <button
                      key={tab.expoId}
                      onClick={() => setSelectedExpoId(tab.expoId)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg-token text-xs-token font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                        isSelected
                          ? isDarkMode
                            ? 'bg-brand-primary-dark text-text-on-primary-dark border-brand-primary-dark shadow-sm'
                            : 'bg-brand-primary-light text-text-on-primary-light border-brand-primary-light shadow-sm'
                          : isDarkMode
                          ? 'bg-glass-dark border-glass-border-dark text-text-secondary-dark hover:text-white hover:border-white/20'
                          : 'bg-glass-light border-glass-border-light text-text-secondary-light hover:text-black hover:border-black/20'
                      }`}
                    >
                      {tab.source === 'ticket' ? (
                        <Ticket className="w-3.5 h-3.5 opacity-80" />
                      ) : (
                        <Heart className="w-3.5 h-3.5 opacity-80 fill-current" />
                      )}
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Expo Context Bar */}
              {activeTabExpo && (
                <div className={`p-md-token rounded-xl-token border mb-lg-token flex flex-wrap items-center justify-between gap-sm-token backdrop-blur-md ${bgCard}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className={`text-base-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                        {activeTabExpo.name}
                      </h2>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        activeTabExpo.source === 'ticket'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                      }`}>
                        {activeTabExpo.source === 'ticket' ? 'Registered Ticket' : 'Favorited'}
                      </span>
                    </div>
                    <p className={`text-xs-token mt-0.5 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                      {activeTabExpo.venueName || 'Main Venue'} · {activeTabExpo.category || 'Exhibition'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/expos/${selectedExpoId}`)}
                      className="text-xs-token font-medium text-brand-primary-dark hover:underline"
                    >
                      View Expo Details →
                    </button>
                    <button
                      onClick={async () => {
                        if (!activeTabExpo || icsDownloading) return;
                        setIcsDownloading(true);
                        try {
                          await expoService.downloadScheduleIcs(selectedExpoId, activeTabExpo.name);
                          toast.success('Schedule downloaded (.ics)!');
                        } catch {
                          toast.error('Failed to download schedule');
                        } finally {
                          setIcsDownloading(false);
                        }
                      }}
                      disabled={icsDownloading}
                      className={`inline-flex items-center gap-1 text-xs-token font-medium transition-colors disabled:opacity-50 ${
                        isDarkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-700 hover:text-emerald-600'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{icsDownloading ? 'Exporting…' : 'Export .ics'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* View Mode & Search Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-md-token mb-md-token">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                    <input
                      type="text"
                      placeholder="Search session title or speaker…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-9 pr-3 py-1.5 rounded-lg-token text-xs-token border outline-none transition-all ${
                        isDarkMode
                          ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark focus:border-brand-primary-dark'
                          : 'bg-bg-surface-light border-border-base-light text-text-primary-light focus:border-brand-primary-light'
                      }`}
                    />
                  </div>

                  {tracks.length > 0 && (
                    <select
                      value={selectedTrack}
                      onChange={(e) => setSelectedTrack(e.target.value)}
                      className={`px-3 py-1.5 rounded-lg-token border text-xs-token font-medium outline-none transition-colors ${
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

                {/* View Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-lg-token border border-glass-border-dark/40 bg-black/5 dark:bg-white/5">
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
                    onClick={() => setViewMode('registered')}
                    className={`px-3 py-1 rounded-md-token text-xs-token font-semibold transition-all ${
                      viewMode === 'registered'
                        ? isDarkMode
                          ? 'bg-brand-primary-dark text-text-on-primary-dark shadow-sm'
                          : 'bg-brand-primary-light text-text-on-primary-light shadow-sm'
                        : isDarkMode
                        ? 'text-text-secondary-dark hover:text-white'
                        : 'text-text-secondary-light hover:text-black'
                    }`}
                  >
                    My RSVPs ({sessions.filter(s => s.isRegistered).length})
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
                      : viewMode === 'registered'
                      ? 'You have not RSVPed to any sessions for this event yet.'
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
                  showRegister={hasTicketForActiveExpo}
                  onRegisterToggle={handleRegisterToggle}
                  registerPendingIds={registerPending}
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
