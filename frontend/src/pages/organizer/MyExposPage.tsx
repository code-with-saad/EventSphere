import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { expoService } from '../../services/expoService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import OrganizerExpoCard from '../../components/expo/OrganizerExpoCard';

export default function MyExposPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [expos, setExpos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const primaryLinkBtn = `px-md-token py-xs-token rounded-md-token text-sm-token font-semibold transition-colors ${
    isDarkMode
      ? 'bg-brand-primary-dark text-text-on-primary-dark hover:bg-accent-hover-dark'
      : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light'
  }`;

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="My Expos" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">
          {/* Page header row */}
          <div className="flex items-center justify-between mb-lg-token">
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

          {/* Expo card grid: 1 col mobile, 2 cols tablet, 3 cols desktop */}
          {!loading && !error && expos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md-token md:gap-lg-token">
              {expos.map((expo: any) => (
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
