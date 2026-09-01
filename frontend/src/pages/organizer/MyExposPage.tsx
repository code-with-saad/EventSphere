import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { expoService } from '../../services/expoService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import ExpoStatusBadge from '../../components/expo/ExpoStatusBadge';
import ExpoStatusTransitionButton from '../../components/expo/ExpoStatusTransitionButton';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function MyExposPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const navigate = useNavigate();

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

  // ── Shared button styles ───────────────────────────────────────────────────
  const actionBtnBase =
    'px-sm-token py-xs-token rounded-md-token text-xs-token font-medium transition-colors';
  const secondaryBtn = `${actionBtnBase} border ${
    isDarkMode
      ? 'border-border-base-dark text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
      : 'border-border-base-light text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light'
  }`;
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
        <main
          className={`flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token ${
            isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'
          }`}
        >
          {/* Page header row */}
          <div className="flex items-center justify-between mb-lg-token">
            <h2
              className={`text-xl-token font-semibold leading-tight-token ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}
            >
              My Expos
            </h2>
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

          {/* Expo list */}
          {!loading && !error && expos.length > 0 && (
            <div className="flex flex-col gap-md-token">
              {expos.map((expo: any) => (
                <div
                  key={expo._id}
                  className={`rounded-lg-token border p-md-token ${
                    isDarkMode
                      ? 'bg-bg-surface-dark border-border-base-dark'
                      : 'bg-bg-surface-light border-border-base-light'
                  }`}
                >
                  {/* Top row: name + status badge */}
                  <div className="flex flex-wrap items-start justify-between gap-sm-token mb-xs-token">
                    <h3
                      className={`text-base-token font-semibold ${
                        isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                      }`}
                    >
                      {expo.name}
                    </h3>
                    <ExpoStatusBadge status={expo.status} />
                  </div>

                  {/* Dates + venue */}
                  <p
                    className={`text-xs-token mb-sm-token ${
                      isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                    }`}
                  >
                    {expo.startDate && expo.endDate
                      ? `${formatDate(expo.startDate)} – ${formatDate(expo.endDate)}`
                      : 'Dates TBD'}
                    {expo.venueName && ` — ${expo.venueName}`}
                  </p>

                  {/* Quick-action buttons */}
                  <div className="flex flex-wrap gap-xs-token items-center">
                    <button
                      onClick={() => navigate(`/organizer/expos/${expo._id}/edit`)}
                      className={secondaryBtn}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        navigate(`/organizer/expos/${expo._id}/applications`)
                      }
                      className={secondaryBtn}
                    >
                      Manage Applications
                    </button>
                    <button
                      onClick={() =>
                        navigate(`/organizer/expos/${expo._id}/schedule`)
                      }
                      className={secondaryBtn}
                    >
                      Manage Schedule
                    </button>
                    <ExpoStatusTransitionButton
                      expoId={expo._id}
                      action="delete"
                      onSuccess={() => {
                        setActionError(null);
                        fetchExpos();
                      }}
                      onError={(msg) => setActionError(msg)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
