import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { favoriteService, ExpoFavoriteItem } from '../../services/favoriteService';
import { bookmarkService } from '../../services/bookmarkService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { BentoCard } from '../../components/common/BentoCard';
import ExpoCard from '../../components/expo/ExpoCard';
import {
  Heart,
  Bookmark,
  Calendar,
  Clock,
  MapPin,
  Compass,
  ArrowRight,
  Loader2,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function BookmarksPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'sessions'>('all');
  const [favorites, setFavorites] = useState<ExpoFavoriteItem[]>([]);
  const [bookmarkedSessions, setBookmarkedSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [favs, sessions] = await Promise.all([
        favoriteService.getMine().catch(() => []),
        bookmarkService.getAllMine().catch(() => []),
      ]);
      setFavorites(favs || []);
      setBookmarkedSessions(sessions || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load bookmarks and favorites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRemoveFavorite = async (e: React.MouseEvent, expoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await favoriteService.removeFavorite(expoId);
      setFavorites((prev) => prev.filter((f) => f.expoId !== expoId));
      toast.success('Removed from favorites');
    } catch {
      toast.error('Failed to remove from favorites');
    }
  };

  const handleRemoveSessionBookmark = async (expoId: string, sessionId: string) => {
    try {
      await bookmarkService.remove(expoId, sessionId);
      setBookmarkedSessions((prev) => prev.filter((s) => s._id !== sessionId));
      toast.success('Bookmark removed');
    } catch {
      toast.error('Failed to remove bookmark');
    }
  };

  // Group bookmarked sessions by expo
  const sessionsByExpo = useMemo(() => {
    const map = new Map<string, { expo: any; sessions: any[] }>();
    bookmarkedSessions.forEach((s) => {
      const expoId = s.expoId || s.expo?._id;
      if (!map.has(expoId)) {
        map.set(expoId, {
          expo: s.expo || { _id: expoId, name: 'Expo Schedule' },
          sessions: [],
        });
      }
      map.get(expoId)!.sessions.push(s);
    });
    return Array.from(map.values());
  }, [bookmarkedSessions]);

  const tabBtnClass = (active: boolean) =>
    `px-4 py-2 rounded-lg-token text-xs-token font-semibold transition-all flex items-center gap-2 border ${
      active
        ? isDarkMode
          ? 'bg-brand-primary-dark text-white border-brand-primary-dark shadow-sm'
          : 'bg-brand-primary-light text-white border-brand-primary-light shadow-sm'
        : isDarkMode
        ? 'bg-glass-dark border-border-base-dark text-text-secondary-dark hover:text-text-primary-dark hover:bg-white/5'
        : 'bg-white border-border-base-light text-text-secondary-light hover:text-text-primary-light hover:bg-black/5'
    }`;

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Bookmarks & Favorites" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">
          <div className="max-w-6xl mx-auto flex flex-col gap-lg-token">
            
            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-md-token">
              <div>
                <h1 className={`text-xl-token md:text-2xl-token font-bold ${
                  isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                }`}>
                  My Bookmarks &amp; Favorites
                </h1>
                <p className={`text-xs-token md:text-sm-token mt-1 ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}>
                  Keep track of your favorite expos and bookmarked conference sessions in one place
                </p>
              </div>

              <Link
                to="/expos"
                className={`inline-flex items-center gap-1.5 px-md-token py-2 rounded-md-token text-xs-token font-semibold border transition-colors ${
                  isDarkMode
                    ? 'border-brand-primary-dark text-brand-primary-dark hover:bg-brand-primary-dark/10'
                    : 'border-brand-primary-light text-brand-primary-light hover:bg-brand-primary-light/10'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Explore More Expos</span>
              </Link>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={tabBtnClass(activeTab === 'all')}
              >
                <span>All Saved</span>
                <span className="opacity-80">({favorites.length + bookmarkedSessions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('favorites')}
                className={tabBtnClass(activeTab === 'favorites')}
              >
                <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                <span>Favorited Expos</span>
                <span className="opacity-80">({favorites.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sessions')}
                className={tabBtnClass(activeTab === 'sessions')}
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Bookmarked Sessions</span>
                <span className="opacity-80">({bookmarkedSessions.length})</span>
              </button>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-2 opacity-70">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs-token">Loading saved items…</span>
              </div>
            )}

            {!loading && error && (
              <div className={`p-md-token rounded-lg-token text-sm-token text-center ${
                isDarkMode ? 'bg-bg-danger-dark text-text-danger-dark' : 'bg-bg-danger-light text-text-danger-light'
              }`}>
                {error}
              </div>
            )}

            {!loading && !error && (
              <div className="flex flex-col gap-xl-token">

                {/* ── SECTION 1: Favorited Expos ───────────────────────────────── */}
                {(activeTab === 'all' || activeTab === 'favorites') && (
                  <section aria-labelledby="favorited-expos-heading" className="flex flex-col gap-md-token">
                    <div className="flex items-center gap-2 pb-2 border-b border-border-base-dark/20">
                      <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                      <h2
                        id="favorited-expos-heading"
                        className={`text-base-token font-bold ${
                          isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                        }`}
                      >
                        Favorited Expos ({favorites.length})
                      </h2>
                    </div>

                    {favorites.length === 0 ? (
                      <div className={`p-8 rounded-xl-token border text-center ${
                        isDarkMode ? 'bg-glass-dark border-glass-border-dark' : 'bg-glass-light border-glass-border-light'
                      }`}>
                        <Heart className="w-8 h-8 mx-auto mb-2 opacity-30 text-red-500" />
                        <p className="text-sm-token font-medium mb-1">No favorited expos yet</p>
                        <p className={`text-xs-token max-w-sm mx-auto mb-4 ${
                          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                        }`}>
                          Click the heart icon on any expo card or detail page to add it to your favorites.
                        </p>
                        <button
                          onClick={() => navigate('/expos')}
                          className={`px-md-token py-1.5 rounded-md-token text-xs-token font-semibold ${
                            isDarkMode
                              ? 'bg-brand-primary-dark text-white'
                              : 'bg-brand-primary-light text-white'
                          }`}
                        >
                          Browse Expos
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md-token">
                        {favorites.map((fav) => (
                          <div key={fav._id} className="relative group">
                            <ExpoCard expo={fav.expo} isFavoritedInitially={true} />
                            <button
                              type="button"
                              onClick={(e) => handleRemoveFavorite(e, fav.expoId)}
                              title="Remove from favorites"
                              className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/60 hover:bg-red-600 text-white transition-all shadow-md z-10"
                            >
                              <Heart className="w-3.5 h-3.5 fill-red-500 hover:fill-white text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* ── SECTION 2: Bookmarked Sessions ───────────────────────────── */}
                {(activeTab === 'all' || activeTab === 'sessions') && (
                  <section aria-labelledby="bookmarked-sessions-heading" className="flex flex-col gap-md-token">
                    <div className="flex items-center gap-2 pb-2 border-b border-border-base-dark/20">
                      <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <h2
                        id="bookmarked-sessions-heading"
                        className={`text-base-token font-bold ${
                          isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                        }`}
                      >
                        Bookmarked Sessions ({bookmarkedSessions.length})
                      </h2>
                    </div>

                    {bookmarkedSessions.length === 0 ? (
                      <div className={`p-8 rounded-xl-token border text-center ${
                        isDarkMode ? 'bg-glass-dark border-glass-border-dark' : 'bg-glass-light border-glass-border-light'
                      }`}>
                        <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-500" />
                        <p className="text-sm-token font-medium mb-1">No bookmarked sessions</p>
                        <p className={`text-xs-token max-w-sm mx-auto mb-4 ${
                          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                        }`}>
                          Browse the schedules of your registered expos and bookmark sessions you plan to attend.
                        </p>
                        <button
                          onClick={() => navigate('/attendee/tickets')}
                          className={`px-md-token py-1.5 rounded-md-token text-xs-token font-semibold ${
                            isDarkMode
                              ? 'bg-brand-primary-dark text-white'
                              : 'bg-brand-primary-light text-white'
                          }`}
                        >
                          View My Tickets
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-lg-token">
                        {sessionsByExpo.map(({ expo, sessions }) => (
                          <BentoCard key={expo._id} className="p-md-token md:p-lg-token">
                            {/* Expo Group Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-md-token pb-sm-token border-b border-border-base-dark/20">
                              <div className="flex items-center gap-2">
                                <Calendar className={`w-4 h-4 ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`} />
                                <h3 className={`text-sm-token md:text-base-token font-bold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                                  {expo.name}
                                </h3>
                                <span className={`text-xs-token px-2 py-0.5 rounded-full font-medium ${
                                  isDarkMode ? 'bg-bg-hover-dark text-text-secondary-dark' : 'bg-bg-hover-light text-text-secondary-light'
                                }`}>
                                  {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                                </span>
                              </div>

                              <Link
                                to={`/expos/${expo._id}/schedule`}
                                className={`text-xs-token font-semibold flex items-center gap-1 hover:underline ${
                                  isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
                                }`}
                              >
                                <span>Full Schedule</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>

                            {/* Sessions Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-md-token">
                              {sessions.map((session) => (
                                <div
                                  key={session._id}
                                  className={`p-3.5 rounded-lg-token border flex flex-col justify-between transition-colors ${
                                    isDarkMode
                                      ? 'bg-black/20 border-border-base-dark hover:border-brand-primary-dark/50'
                                      : 'bg-black/5 border-border-base-light hover:border-brand-primary-light/50'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                      <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                                        isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
                                      }`}>
                                        <Clock className="w-3 h-3" />
                                        {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() => handleRemoveSessionBookmark(session.expoId, session._id)}
                                        title="Remove bookmark"
                                        className={`p-1 rounded transition-colors ${
                                          isDarkMode
                                            ? 'text-text-secondary-dark hover:text-text-danger-dark hover:bg-bg-hover-dark'
                                            : 'text-text-secondary-light hover:text-text-danger-light hover:bg-bg-hover-light'
                                        }`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    <h4 className={`text-sm-token font-bold mb-1 ${
                                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                                    }`}>
                                      {session.title}
                                    </h4>

                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs-token text-text-secondary-dark">
                                      <span>Speaker: <strong className="font-semibold text-text-primary-dark">{session.speakerName}</strong></span>
                                      <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {session.room}
                                      </span>
                                    </div>

                                    {session.description && (
                                      <p className={`text-xs-token line-clamp-2 mt-2 leading-relaxed ${
                                        isDarkMode ? 'text-text-muted-dark' : 'text-text-muted-light'
                                      }`}>
                                        {session.description}
                                      </p>
                                    )}
                                  </div>

                                  {session.track && (
                                    <div className="mt-3 pt-2 border-t border-border-base-dark/20 flex justify-between items-center">
                                      <span className={`text-[11px] px-2 py-0.5 rounded-sm-token font-medium ${
                                        isDarkMode ? 'bg-bg-hover-dark text-text-secondary-dark' : 'bg-bg-hover-light text-text-secondary-light'
                                      }`}>
                                        {session.track}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </BentoCard>
                        ))}
                      </div>
                    )}
                  </section>
                )}

              </div>
            )}

          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
