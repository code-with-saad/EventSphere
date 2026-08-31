import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { expoService } from '../../services/expoService';
import ExpoCard from '../../components/expo/ExpoCard';

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

  // Debounce search 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when filter changes
  const handleStatusChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  // Fetch expos
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

  useEffect(() => {
    fetchExpos();
  }, [fetchExpos]);

  // ── Styles ──────────────────────────────────────────────────────────────────

  const chipBase =
    'px-sm-token py-xs-token rounded-sm-token text-sm-token font-medium transition-colors cursor-pointer';
  const chipActive = isDarkMode
    ? 'bg-brand-primary-dark text-text-on-primary-dark'
    : 'bg-brand-primary-light text-text-on-primary-light';
  const chipInactive = isDarkMode
    ? 'bg-bg-surface-dark text-text-secondary-dark border border-border-base-dark hover:bg-bg-hover-dark'
    : 'bg-bg-surface-light text-text-secondary-light border border-border-base-light hover:bg-bg-hover-light';

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'}`}>
      <div className="max-w-6xl mx-auto p-md-token md:p-lg-token">

        {/* Page heading */}
        <h1
          className={`text-xl-token font-semibold mb-lg-token ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}
        >
          Explore Expos
        </h1>

        {/* Filters row */}
        <div className="flex flex-col gap-sm-token mb-lg-token sm:flex-row sm:items-center">
          {/* Search input */}
          <input
            type="text"
            placeholder="Search expos…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search expos"
            className={`flex-1 rounded-md-token border px-sm-token py-xs-token text-sm-token outline-none transition-colors ${
              isDarkMode
                ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark placeholder:text-text-secondary-dark focus:border-brand-primary-dark'
                : 'bg-bg-surface-light border-border-base-light text-text-primary-light placeholder:text-text-secondary-light focus:border-brand-primary-light'
            }`}
          />

          {/* Status filter chips */}
          <div className="flex flex-wrap gap-xs-token">
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

        {/* Loading state */}
        {loading && (
          <div
            className={`text-center py-xl-token text-sm-token ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}
          >
            Loading expos…
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div
            className={`text-center py-xl-token text-sm-token ${
              isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
            }`}
          >
            {error}
          </div>
        )}

        {/* Empty state (REQ-1.7) */}
        {!loading && !error && expos.length === 0 && (
          <div
            className={`text-center py-xl-token ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}
          >
            <p className="text-base-token font-medium mb-xs-token">No expos found</p>
            <p className="text-sm-token">
              {debouncedSearch || statusFilter
                ? 'Try adjusting your search or filters.'
                : 'Check back soon for upcoming expos.'}
            </p>
          </div>
        )}

        {/* Expo grid */}
        {!loading && !error && expos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md-token">
            {expos.map((expo) => (
              <ExpoCard key={expo._id} expo={expo} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-sm-token mt-lg-token">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={`px-sm-token py-xs-token rounded-md-token text-sm-token font-medium transition-colors disabled:opacity-40 ${
                isDarkMode
                  ? 'bg-bg-surface-dark text-text-primary-dark border border-border-base-dark hover:bg-bg-hover-dark'
                  : 'bg-bg-surface-light text-text-primary-light border border-border-base-light hover:bg-bg-hover-light'
              }`}
            >
              ← Prev
            </button>
            <span
              className={`text-sm-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className={`px-sm-token py-xs-token rounded-md-token text-sm-token font-medium transition-colors disabled:opacity-40 ${
                isDarkMode
                  ? 'bg-bg-surface-dark text-text-primary-dark border border-border-base-dark hover:bg-bg-hover-dark'
                  : 'bg-bg-surface-light text-text-primary-light border border-border-base-light hover:bg-bg-hover-light'
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
