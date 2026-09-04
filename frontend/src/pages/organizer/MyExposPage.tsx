import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { expoService } from '../../services/expoService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import OrganizerExpoCard from '../../components/expo/OrganizerExpoCard';
import { Search } from 'lucide-react';

type ExpoStatus = 'all' | 'ongoing' | 'published' | 'draft' | 'completed' | 'archived';

const STATUS_CHIPS: { label: string; value: ExpoStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Ongoing', value: 'ongoing' },
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
  { label: 'Completed', value: 'completed' },
  { label: 'Archived', value: 'archived' },
];

export default function MyExposPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [expos, setExpos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExpoStatus>('all');

  const fetchExpos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await expoService.listMine();
      setExpos(Array.isArray(data) ? data : (data?.expos ?? []));
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Failed to load your expos',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpos();
  }, [fetchExpos]);

  // Count per status for chip badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    expos.forEach((e) => {
      counts[e.status] = (counts[e.status] ?? 0) + 1;
    });
    return counts;
  }, [expos]);

  const filteredAndSortedExpos = useMemo(() => {
    const statusOrder: Record<string, number> = {
      ongoing: 1,
      published: 2,
      draft: 3,
      completed: 4,
      archived: 5,
    };

    return [...expos]
      .filter((expo) => {
        if (statusFilter !== 'all' && expo.status !== statusFilter) return false;
        if (!searchTerm.trim()) return true;
        const name = (expo.name || '').toLowerCase();
        return name.includes(searchTerm.toLowerCase().trim());
      })
      .sort((a, b) => {
        const orderA = statusOrder[a.status] ?? 99;
        const orderB = statusOrder[b.status] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        const dateA = new Date(a.createdAt || a.startDate || 0).getTime();
        const dateB = new Date(b.createdAt || b.startDate || 0).getTime();
        return dateB - dateA;
      });
  }, [expos, searchTerm, statusFilter]);

  const primaryLinkBtn = `px-md-token py-xs-token rounded-md-token text-sm-token font-semibold transition-colors ${
    isDarkMode
      ? 'bg-brand-primary-dark text-text-on-primary-dark hover:bg-accent-hover-dark'
      : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light'
  }`;

  const chipBase = 'px-3 py-1 rounded-full text-xs-token font-medium transition-colors whitespace-nowrap border';
  const chipActive = isDarkMode
    ? 'bg-brand-primary-dark text-white border-brand-primary-dark'
    : 'bg-brand-primary-light text-white border-brand-primary-light';
  const chipInactive = isDarkMode
    ? 'bg-transparent text-text-secondary-dark border-border-base-dark hover:border-brand-primary-dark hover:text-text-primary-dark'
    : 'bg-transparent text-text-secondary-light border-border-base-light hover:border-brand-primary-light hover:text-text-primary-light';

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="My Expos" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">
          {/* Page header row */}
          <div className="flex flex-wrap items-center justify-between gap-md-token mb-lg-token">
            <div>
              <h2
                className={`text-xl-token font-semibold leading-tight-token ${
                  isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                }`}
              >
                My Expos
              </h2>
              <p
                className={`text-sm-token mt-xs-token ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                Manage your active and upcoming expo events
              </p>
            </div>
            <Link to="/organizer/expos/new" className={primaryLinkBtn}>
              + New Expo
            </Link>
          </div>

          {/* Status filter chips + Search bar */}
          {!loading && !error && expos.length > 0 && (
            <div className="mb-lg-token flex flex-col gap-sm-token">
              {/* Filter chips */}
              <div className="flex flex-wrap gap-2">
                {STATUS_CHIPS.map((chip) => {
                  const count = chip.value === 'all' ? expos.length : (statusCounts[chip.value] ?? 0);
                  return (
                    <button
                      key={chip.value}
                      onClick={() => setStatusFilter(chip.value)}
                      className={`${chipBase} ${statusFilter === chip.value ? chipActive : chipInactive}`}
                    >
                      {chip.label} ({count})
                    </button>
                  );
                })}
              </div>
              {/* Search input */}
              <div className="relative max-w-md">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                  isDarkMode ? 'text-text-tertiary-dark' : 'text-text-tertiary-light'
                }`} />
                <input
                  type="text"
                  placeholder="Search expos by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-9 pr-sm-token py-xs-token rounded-md-token border text-sm-token outline-none transition-colors ${
                    isDarkMode
                      ? 'bg-glass-dark border-border-base-dark text-text-primary-dark placeholder-text-tertiary-dark focus:border-brand-primary-dark'
                      : 'bg-glass-light border-border-base-light text-text-primary-light placeholder-text-tertiary-light focus:border-brand-primary-light'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Action error banner */}
          {actionError && (
            <div
              className={`mb-md-token px-md-token py-sm-token rounded-md-token text-sm-token flex items-center justify-between ${
                isDarkMode
                  ? 'bg-bg-danger-dark text-text-danger-dark'
                  : 'bg-bg-danger-light text-text-danger-light'
              }`}
            >
              <span>{actionError}</span>
              <button
                onClick={() => setActionError(null)}
                className="ml-sm-token underline text-xs-token shrink-0"
                aria-label="Dismiss error"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div
              className={`text-center py-xl-token text-sm-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              Loading your expos…
            </div>
          )}

          {/* Fetch error */}
          {!loading && error && (
            <div
              className={`text-center py-xl-token text-sm-token ${
                isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
              }`}
            >
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && expos.length === 0 && (
            <div
              className={`flex flex-col items-center text-center py-xl-token gap-md-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              <p
                className={`text-base-token font-medium ${
                  isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                }`}
              >
                No expos yet
              </p>
              <p className="text-sm-token">
                Create your first expo to get started.
              </p>
              <Link to="/organizer/expos/new" className={primaryLinkBtn}>
                Create Expo
              </Link>
            </div>
          )}

          {/* No results */}
          {!loading && !error && expos.length > 0 && filteredAndSortedExpos.length === 0 && (
            <div
              className={`text-center py-xl-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              <p className="text-base-token font-medium mb-xs-token">No matching expos</p>
              <p className="text-sm-token">Try adjusting your search or filter.</p>
            </div>
          )}

          {/* Expo card grid */}
          {!loading && !error && filteredAndSortedExpos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md-token md:gap-lg-token">
              {filteredAndSortedExpos.map((expo: any) => (
                <OrganizerExpoCard
                  key={expo._id}
                  expo={expo}
                  onDeleteSuccess={() => {
                    setActionError(null);
                    fetchExpos();
                  }}
                  onError={(msg) => setActionError(msg)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
