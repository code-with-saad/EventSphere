import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { expoService } from '../../services/expoService';
import ExpoCard from '../../components/expo/ExpoCard';
import PublicNavBar from '../../components/layout/PublicNavBar';
import { Search } from 'lucide-react';

type StatusFilter = '' | 'upcoming' | 'ongoing' | 'completed';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
];

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

  const chipBase = 'px-sm-token py-xs-token rounded-sm-token text-xs-token font-medium transition-colors cursor-pointer whitespace-nowrap';
  const chipActive = isDarkMode ? 'bg-brand-primary-dark text-text-on-primary-dark' : 'bg-brand-primary-light text-text-on-primary-light';
  const chipInactive = isDarkMode
    ? 'text-text-secondary-dark hover:text-text-primary-dark hover:bg-bg-hover-dark'
    : 'text-text-secondary-light hover:text-text-primary-light hover:bg-bg-hover-light';

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'}`}>
      <PublicNavBar />

      <div className="max-w-6xl mx-auto px-md-token md:px-lg-token py-lg-token md:py-xl-token">

        {/* Page heading */}
        <div className="mb-xl-token">
          <h1 className={`text-xl-token font-semibold leading-tight-token mb-xs-token ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}>
            Explore Expos
          </h1>
          <p className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
            Discover tech events, trade shows, and conferences
          </p>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-sm-token mb-lg-token items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Search className={`absolute left-sm-token top-1/2 -translate-y-1/2 w-4 h-4 ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`} aria-hidden="true" />
            <input
              type="text"
              placeholder="Search expos…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search expos"
              className={`w-full pl-[32px] pr-sm-token py-xs-token rounded-md-token border text-sm-token outline-none focus:ring-0 transition-colors ${
                isDarkMode
                  ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark placeholder:text-text-secondary-dark focus:border-brand-primary-dark'
                  : 'bg-bg-surface-light border-border-base-light text-text-primary-light placeholder:text-text-secondary-light focus:border-brand-primary-light'
              }`}
            />
          </div>
          <div className={`flex gap-xs-token p-xs-token rounded-md-token ${
            isDarkMode ? 'bg-bg-surface-dark' : 'bg-bg-surface-light'
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

        {/* Loading */}
        {loading && (
          <div className={`text-center py-xl-token text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
            Loading expos…
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className={`text-center py-xl-token text-sm-token ${isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}`}>
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && expos.length === 0 && (
          <div className={`text-center py-xxl-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
            <p className={`text-base-token font-medium mb-xs-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
              No expos found
            </p>
            <p className="text-sm-token">
              {debouncedSearch || statusFilter ? 'Try adjusting your search or filters.' : 'Check back soon for upcoming expos.'}
            </p>
          </div>
        )}

        {/* Results count + grid */}
        {!loading && !error && expos.length > 0 && (
          <>
            <p className={`text-xs-token mb-md-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
              {pagination.total > 0 ? `${pagination.total} expo${pagination.total !== 1 ? 's' : ''} found` : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md-token">
              {expos.map((expo) => <ExpoCard key={expo._id} expo={expo} />)}
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-sm-token mt-xl-token">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={`px-sm-token py-xs-token rounded-md-token text-sm-token font-medium transition-colors disabled:opacity-40 ${
                isDarkMode
                  ? 'border border-border-base-dark text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
                  : 'border border-border-base-light text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light'
              }`}
            >
              ← Prev
            </button>
            <span className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
              {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className={`px-sm-token py-xs-token rounded-md-token text-sm-token font-medium transition-colors disabled:opacity-40 ${
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
