import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { applicationService } from '../../services/applicationService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import PageHeader from '../../components/layout/PageHeader';
import ApplicationCard from '../../components/application/ApplicationCard';
import WithdrawConfirmDialog from '../../components/application/WithdrawConfirmDialog';
import toast from 'react-hot-toast';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyApplicationsPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const navigate = useNavigate();

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Withdraw dialog state
  const [withdrawTarget, setWithdrawTarget] = useState<{ expoId: string; appId: string } | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await applicationService.listAllMine();
      setApplications(Array.isArray(data) ? data : (data?.applications ?? []));
    } catch (err: unknown) {
      setError(
        (err as any)?.response?.data?.message ||
        (err as any)?.message ||
        'Failed to load your applications'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const handleWithdraw = async () => {
    if (!withdrawTarget) return;
    setWithdrawing(true);
    try {
      await applicationService.withdraw(withdrawTarget.expoId, withdrawTarget.appId);
      toast.success('Application withdrawn successfully.');
      setWithdrawTarget(null);
      fetchApplications();
    } catch (err: unknown) {
      toast.error(
        (err as any)?.response?.data?.message ||
        (err as any)?.message ||
        'Failed to withdraw application'
      );
    } finally {
      setWithdrawing(false);
    }
  };

  const secondaryBtn = `px-sm-token py-xs-token rounded-md-token text-xs-token font-medium border transition-colors ${
    isDarkMode
      ? 'border-border-base-dark text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
      : 'border-border-base-light text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light'
  }`;

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="My Applications" />
        <main className={`flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token ${
          isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'
        }`}>

          <PageHeader
            title="My Applications"
            subtitle="Track your exhibition applications and their status."
          />

          {/* Loading */}
          {loading && (
            <div className={`text-center py-xl-token text-sm-token ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}>
              Loading your applications…
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className={`text-center py-xl-token text-sm-token ${
              isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
            }`}>
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && applications.length === 0 && (
            <div className={`text-center py-xl-token ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}>
              <p className="text-base-token font-medium mb-xs-token">No applications yet</p>
              <p className="text-sm-token">Browse expos and apply to exhibit.</p>
            </div>
          )}

          {/* Application list */}
          {!loading && !error && applications.length > 0 && (
            <div className="flex flex-col gap-md-token">
              {applications.map((app: any) => (
                <div
                  key={app._id}
                  className={`rounded-lg-token border overflow-hidden ${
                    isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'
                  }`}
                >
                  {/* Card — no onClick since we handle actions below */}
                  <ApplicationCard application={app} />

                  {/* Pending actions — footer strip inside the same border */}
                  {app.status === 'pending' && (
                    <div className={`flex gap-xs-token px-md-token py-sm-token border-t ${
                      isDarkMode ? 'border-border-base-dark bg-bg-surface-dark' : 'border-border-base-light bg-bg-surface-light'
                    }`}>
                      <button
                        onClick={() => navigate(`/expos/${app.expoId}/apply`)}
                        className={secondaryBtn}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setWithdrawTarget({ expoId: app.expoId, appId: app._id })}
                        className={`${secondaryBtn} ${
                          isDarkMode ? 'text-text-danger-dark border-text-danger-dark' : 'text-text-danger-light border-text-danger-light'
                        }`}
                      >
                        Withdraw
                      </button>
                    </div>
                  )}

                  {/* Approved extras */}
                  {app.status === 'approved' && (app.boothLabel || app.venueMapUrl) && (
                    <div className={`flex flex-wrap gap-sm-token px-md-token py-sm-token border-t text-xs-token ${
                      isDarkMode ? 'border-border-base-dark bg-bg-surface-dark text-text-secondary-dark' : 'border-border-base-light bg-bg-surface-light text-text-secondary-light'
                    }`}>
                      {app.boothLabel && (
                        <span className={`font-medium ${isDarkMode ? 'text-text-success-dark' : 'text-text-success-light'}`}>
                          Booth: {app.boothLabel}
                        </span>
                      )}
                      {app.venueMapUrl && (
                        <a href={app.venueMapUrl} target="_blank" rel="noopener noreferrer"
                          className={isDarkMode ? 'text-brand-primary-dark underline' : 'text-brand-primary-light underline'}>
                          View Venue Map
                        </a>
                      )}
                    </div>
                  )}

                  {/* Rejected reason */}
                  {app.status === 'rejected' && app.rejectionReason && (
                    <div className={`px-md-token py-sm-token border-t text-xs-token ${
                      isDarkMode ? 'border-border-base-dark bg-bg-surface-dark text-text-danger-dark' : 'border-border-base-light bg-bg-surface-light text-text-danger-light'
                    }`}>
                      Reason: {app.rejectionReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
      <BottomNav />

      {/* Withdraw confirm dialog */}
      <WithdrawConfirmDialog
        isOpen={!!withdrawTarget}
        onConfirm={handleWithdraw}
        onCancel={() => setWithdrawTarget(null)}
        isLoading={withdrawing}
      />
    </div>
  );
}
