import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { expoService } from '../../services/expoService';
import ExpoCard from '../../components/expo/ExpoCard';
import PublicNavBar from '../../components/layout/PublicNavBar';
import { Search, Sparkles, Calendar, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

type StatusFilter = '' | 'upcoming' | 'ongoing' | 'completed';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'All Expos' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Live Now' },
  { value: 'completed', label: 'Past Events' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function ExpoListingPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [expos, setExpos] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleStatusChange = (value: StatusFilter) => { setStatusFilter(value); setPage(1); };

  const fetchExpos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, any> = { page, limit: 12 };
      if (statusFilter) query.status = statusFilter;
      if (debouncedSearch) query.search = debouncedSearch;
      const data = await expoService.list(query);
      setExpos(data?.expos ?? []);
      setPagination({
        page: data?.pagination?.page ?? 1,
        totalPages: data?.pagination?.totalPages ?? 1,
        total: data?.pagination?.total ?? 0,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load expos');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => { fetchExpos(); }, [fetchExpos]);

  const chipBase = 'px-sm-token md:px-md-token py-xs-token rounded-md-token text-xs-token md:text-sm-token font-medium transition-colors cursor-pointer whitespace-nowrap';
  const chipActive = isDarkMode ? 'bg-brand-primary-dark text-text-on-primary-dark font-semibold' : 'bg-brand-primary-light text-text-on-primary-light font-semibold';
  const chipInactive = isDarkMode
    ? 'text-text-secondary-dark hover:text-text-primary-dark hover:bg-bg-hover-dark'
    : 'text-text-secondary-light hover:text-text-primary-light hover:bg-bg-hover-light';

  // Feature the first expo if we are on page 1 without search filters
  const showFeaturedHero = page === 1 && !debouncedSearch && !statusFilter && expos.length > 0;
  const featuredExpo = showFeaturedHero ? expos[0] : null;
  const standardExpos = showFeaturedHero ? expos.slice(1) : expos;

  return (
    <div className="min-h-screen">
      <PublicNavBar />

      <div className="max-w-6xl mx-auto px-md-token md:px-lg-token pt-lg-token md:pt-xl-token pb-xxl-token">

        {/* ── Asymmetric Hero / Header Section ──────────────────────────── */}
        <div className="mb-xl-token md:mb-xxl-token grid grid-cols-1 lg:grid-cols-12 gap-lg-token items-end">
          <div className="lg:col-span-8">
            <div className="inline-flex items-center gap-xs-token px-sm-token py-xs-token rounded-md-token text-xs-token font-semibold uppercase tracking-wider mb-sm-token bg-brand-primary-dark/10 text-brand-primary-dark border border-brand-primary-dark/20">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>EventSphere Discovery</span>
            </div>
            <h1 className={`text-display-token font-bold tracking-tight leading-tight-token mb-sm-token ${
              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
            }`}>
              Discover World-Class <br className="hidden sm:inline" />
              <span className={isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}>Expos & Conferences</span>
            </h1>
            <p className={`text-base-token leading-normal-token max-w-xl ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
              Connect with leading industry innovators, explore interactive booth floorplans, and reserve passes for upcoming tech summits.
            </p>
          </div>

          <div className="lg:col-span-4 flex lg:justify-end">
            <div className={`p-md-token rounded-xl-token border backdrop-blur-md w-full lg:max-w-xs ${
              isDarkMode ? 'bg-glass-dark border-glass-border-dark' : 'bg-glass-light border-glass-border-light'
            }`}>
              <div className="flex justify-between items-center text-sm-token">
                <span className={isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}>Live Platforms</span>
                <span className={`font-bold ${isDarkMode ? 'text-text-success-dark' : 'text-text-success-light'}`}>Active</span>
              </div>
              <div className={`text-2xl-token font-bold mt-xs-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                {pagination.total > 0 ? `${pagination.total}+ Events` : 'Curated Events'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Featured Spotlight Expo (if on primary overview) ─────────── */}
        {featuredExpo && !loading && (
          <div className="mb-xl-token">
            <div className="flex items-center gap-xs-token mb-sm-token">
              <span className={`text-xs-token font-bold uppercase tracking-wider ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`}>
                Spotlight Event
              </span>
            </div>
            <Link
              to={`/expos/${featuredExpo._id}`}
              className={`group relative overflow-hidden rounded-xl-token border transition-all block backdrop-blur-md hover:border-brand-primary-dark ${
                isDarkMode ? 'bg-glass-dark border-glass-border-dark' : 'bg-glass-light border-glass-border-light'
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
                <div className="md:col-span-7 p-lg-token md:p-xl-token flex flex-col justify-between gap-md-token z-10">
                  <div>
                    <div className="flex flex-wrap gap-xs-token items-center mb-sm-token">
                      <span className={`px-sm-token py-0.5 rounded-sm-token text-xs-token font-semibold uppercase ${
                        featuredExpo.status === 'ongoing' 
                          ? isDarkMode ? 'bg-bg-success-dark text-text-success-dark' : 'bg-bg-success-light text-text-success-light'
                          : isDarkMode ? 'bg-bg-warning-dark text-text-warning-dark' : 'bg-bg-warning-light text-text-warning-light'
                      }`}>
                        {featuredExpo.status}
                      </span>
                      {featuredExpo.category && (
                        <span className={`text-xs-token px-sm-token py-0.5 rounded-sm-token ${
                          isDarkMode ? 'bg-bg-hover-dark text-text-secondary-dark' : 'bg-bg-hover-light text-text-secondary-light'
                        }`}>
                          {featuredExpo.category}
                        </span>
                      )}
                    </div>
                    <h2 className={`text-xl-token md:text-2xl-token font-bold mb-xs-token group-hover:text-brand-primary-dark transition-colors ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}>
                      {featuredExpo.name}
                    </h2>
                    <p className={`text-sm-token line-clamp-2 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                      {featuredExpo.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-md-token text-xs-token pt-sm-token border-t border-glass-border-dark/50">
                    <span className="flex items-center gap-xs-token font-medium">
                      <Calendar className="w-4 h-4 text-brand-primary-dark" aria-hidden="true" />
                      {formatDate(featuredExpo.startDate)} – {formatDate(featuredExpo.endDate)}
                    </span>
                    <span className="flex items-center gap-xs-token">
                      <MapPin className="w-4 h-4 text-brand-primary-dark" aria-hidden="true" />
                      {featuredExpo.venueName}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-5 relative min-h-[200px] md:min-h-[260px] overflow-hidden">
                  {featuredExpo.bannerUrl ? (
                    <img
                      src={featuredExpo.bannerUrl}
                      alt={featuredExpo.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center p-md-token text-center ${
                      isDarkMode ? 'bg-bg-surface-dark text-brand-primary-dark' : 'bg-bg-surface-light text-brand-primary-light'
                    }`}>
                      <span className="font-bold text-lg-token">{featuredExpo.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* ── Search & Filter Controls ──────────────────────────────────── */}
        <div className={`p-sm-token md:p-md-token rounded-xl-token border backdrop-blur-md mb-lg-token ${
          isDarkMode ? 'bg-glass-dark border-glass-border-dark' : 'bg-glass-light border-glass-border-light'
        }`}>
          <div className="flex flex-col md:flex-row gap-sm-token items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className={`absolute left-sm-token top-1/2 -translate-y-1/2 w-4 h-4 ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`} aria-hidden="true" />
              <input
                type="text"
                placeholder="Search expos by title, topic, or venue…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search expos"
                className={`w-full pl-[36px] pr-sm-token py-sm-token rounded-md-token border text-sm-token outline-none focus:ring-0 transition-colors ${
                  isDarkMode
                    ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark placeholder:text-text-muted-dark focus:border-brand-primary-dark'
                    : 'bg-bg-surface-light border-border-base-light text-text-primary-light placeholder:text-text-muted-light focus:border-brand-primary-light'
                }`}
              />
            </div>

            <div className={`flex gap-xs-token p-xs-token rounded-md-token overflow-x-auto ${
              isDarkMode ? 'bg-bg-surface-dark border border-border-base-dark' : 'bg-bg-surface-light border border-border-base-light'
            }`}>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleStatusChange(opt.value)}
                  className={`${chipBase} ${statusFilter === opt.value ? chipActive : chipInactive}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Loading State ─────────────────────────────────────────────── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md-token py-md-token">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`h-48 rounded-xl-token border animate-pulse ${
                isDarkMode ? 'bg-glass-dark border-glass-border-dark' : 'bg-glass-light border-glass-border-light'
              }`} />
            ))}
          </div>
        )}

        {/* ── Error State ──────────────────────────────────────────────── */}
        {!loading && error && (
          <div className={`text-center py-xl-token text-sm-token ${isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}`}>
            {error}
          </div>
        )}

        {/* ── Empty State ──────────────────────────────────────────────── */}
        {!loading && !error && expos.length === 0 && (
          <div className={`text-center py-xxl-token rounded-xl-token border backdrop-blur-md ${
            isDarkMode ? 'bg-glass-dark border-glass-border-dark text-text-secondary-dark' : 'bg-glass-light border-glass-border-light text-text-secondary-light'
          }`}>
            <p className={`text-base-token font-medium mb-xs-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
              No expos found
            </p>
            <p className="text-sm-token">
              {debouncedSearch || statusFilter ? 'Try adjusting your search query or filter settings.' : 'Check back soon for upcoming expos.'}
            </p>
          </div>
        )}

        {/* ── Grid Results ─────────────────────────────────────────────── */}
        {!loading && !error && standardExpos.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-md-token">
              <h3 className={`text-sm-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                {showFeaturedHero ? 'All Exhibitions' : 'Search Results'}
              </h3>
              <span className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                {pagination.total > 0 ? `${pagination.total} expo${pagination.total !== 1 ? 's' : ''}` : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md-token">
              {standardExpos.map((expo) => (
                <ExpoCard key={expo._id} expo={expo} />
              ))}
            </div>
          </>
        )}

        {/* ── Pagination ───────────────────────────────────────────────── */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-sm-token mt-xl-token">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={`px-md-token py-sm-token rounded-md-token text-sm-token font-medium transition-colors disabled:opacity-40 ${
                isDarkMode
                  ? 'border border-border-base-dark text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
                  : 'border border-border-base-light text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light'
              }`}
            >
              ← Prev
            </button>
            <span className={`text-sm-token font-medium px-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className={`px-md-token py-sm-token rounded-md-token text-sm-token font-medium transition-colors disabled:opacity-40 ${
                isDarkMode
                  ? 'border border-border-base-dark text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
                  : 'border border-border-base-light text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light'
              }`}
            >
              Next →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
