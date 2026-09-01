import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { applicationService } from '../../services/applicationService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import BackButton from '../../components/layout/BackButton';
import ApplicationCard from '../../components/application/ApplicationCard';
import ReviewPanel from '../../components/application/ReviewPanel';
import BoothAssignmentModal from '../../components/application/BoothAssignmentModal';
import toast from 'react-hot-toast';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function ApplicationsPage() {
  const { id: expoId } = useParams<{ id: string }>();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [pending, setPending] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [rejected, setRejected] = useState<any[]>([]);
  const [totalBooths, setTotalBooths] = useState(0);
  const [assignedBooths, setAssignedBooths] = useState(0);
  const [boothFillRate, setBoothFillRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [showBoothModal, setShowBoothModal] = useState(false);
  const [isActing, setIsActing] = useState(false);

  const fetchApplications = useCallback(async () => {
    if (!expoId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await applicationService.listForExpo(expoId);
      setPending(data?.pending ?? []);
      setApproved(data?.approved ?? []);
      setRejected(data?.rejected ?? []);
      setTotalBooths(data?.totalBooths ?? 0);
      setAssignedBooths(data?.assignedBooths ?? 0);
      setBoothFillRate(data?.boothFillRate ?? 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [expoId]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const allApps = useMemo(() => [...pending, ...approved, ...rejected], [pending, approved, rejected]);

  const filteredApps = useMemo(() => {
    const pool = statusFilter === 'all' ? allApps
      : statusFilter === 'pending' ? pending
      : statusFilter === 'approved' ? approved
      : rejected;
    if (!searchQuery.trim()) return pool;
    const q = searchQuery.toLowerCase();
    return pool.filter((a: any) => a.companyName?.toLowerCase().includes(q));
  }, [allApps, pending, approved, rejected, statusFilter, searchQuery]);

  const handleApprove = (_applicationId: string) => {
    setShowBoothModal(true);
  };

  const handleBoothConfirm = async (boothLabel: string) => {
    if (!expoId || !selectedApp) return;
    setIsActing(true);
    try {
      const result = await applicationService.review(expoId, selectedApp._id, { action: 'approve', boothLabel });
      toast.success(result?.overfillWarning ? 'Approved! Note: expo is now over capacity.' : 'Application approved!');
      setShowBoothModal(false);
      setSelectedApp(null);
      fetchApplications();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      toast.error(code === 'BOOTH_CONFLICT' ? 'Booth label already assigned. Choose a different label.' : err?.response?.data?.message || 'Approval failed');
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async (applicationId: string) => {
    if (!expoId) return;
    setIsActing(true);
    try {
      await applicationService.review(expoId, applicationId, { action: 'reject' });
      toast.success('Application rejected.');
      setSelectedApp(null);
      fetchApplications();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Rejection failed');
    } finally {
      setIsActing(false);
    }
  };

  const handleRevoke = async (applicationId: string) => {
    if (!expoId) return;
    setIsActing(true);
    try {
      await applicationService.review(expoId, applicationId, { action: 'revoke' });
      toast.success('Approval revoked.');
      setSelectedApp(null);
      fetchApplications();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Revoke failed');
    } finally {
      setIsActing(false);
    }
  };

  const chipBase = 'px-sm-token py-xs-token rounded-sm-token text-xs-token font-medium cursor-pointer transition-colors';
  const chipActive = isDarkMode ? 'bg-brand-primary-dark text-text-on-primary-dark' : 'bg-brand-primary-light text-text-on-primary-light';
  const chipInactive = isDarkMode ? 'bg-bg-surface-dark text-text-secondary-dark border border-border-base-dark hover:bg-bg-hover-dark' : 'bg-bg-surface-light text-text-secondary-light border border-border-base-light hover:bg-bg-hover-light';
  const fillColor = boothFillRate >= 100
    ? (isDarkMode ? 'bg-text-danger-dark' : 'bg-text-danger-light')
    : boothFillRate >= 80
      ? (isDarkMode ? 'bg-text-warning-dark' : 'bg-text-warning-light')
      : (isDarkMode ? 'bg-brand-primary-dark' : 'bg-brand-primary-light');

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Manage Applications" />
        <main className={`flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token ${isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'}`}>

          {/* Page header with expo context */}
          <div className="mb-xl-token">
            <div className="mb-sm-token">
              <BackButton fallback="/organizer/expos" label="My Expos" />
            </div>
            <div className="flex flex-wrap items-end justify-between gap-md-token">
              <div>
                <h1 className={`text-xl-token font-semibold leading-tight-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                  Manage Applications
                </h1>
                <p className={`mt-xs-token text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  Review and action exhibitor applications
                </p>
              </div>
              {/* Summary stats inline */}
              {!loading && (
                <div className="flex flex-wrap gap-md-token">
                  {[
                    { label: 'Total', value: allApps.length },
                    { label: 'Pending', value: pending.length, accent: pending.length > 0 },
                    { label: 'Approved', value: approved.length },
                    { label: 'Rejected', value: rejected.length },
                  ].map(({ label, value, accent }) => (
                    <div key={label} className="text-center">
                      <div className={`text-lg-token font-semibold leading-tight-token ${
                        accent
                          ? isDarkMode ? 'text-text-warning-dark' : 'text-text-warning-light'
                          : isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                      }`}>
                        {value}
                      </div>
                      <div className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Booth fill rate — inline below header, no card border */}
            {!loading && totalBooths > 0 && (
              <div className="mt-md-token">
                <div className="flex items-center justify-between mb-xs-token">
                  <span className={`text-xs-token font-medium ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                    Booth capacity
                  </span>
                  <span className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                    {assignedBooths} / {totalBooths} ({boothFillRate}%)
                  </span>
                </div>
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`}>
                  <div
                    className={`h-full rounded-full transition-all ${fillColor}`}
                    style={{ width: `${Math.min(boothFillRate, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={boothFillRate}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Booth fill rate: ${boothFillRate}%`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-sm-token mb-lg-token">
            <input type="text" placeholder="Search by company name…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} aria-label="Search applications"
              className={`flex-1 rounded-md-token border px-sm-token py-xs-token text-sm-token outline-none focus:ring-0 transition-colors ${isDarkMode ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark placeholder:text-text-secondary-dark focus:border-brand-primary-dark' : 'bg-bg-surface-light border-border-base-light text-text-primary-light placeholder:text-text-secondary-light focus:border-brand-primary-light'}`} />
            <div className="flex gap-xs-token flex-wrap">
              {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`${chipBase} ${statusFilter === s ? chipActive : chipInactive}`}>
                  {s === 'all' ? `All (${allApps.length})` : s === 'pending' ? `Pending (${pending.length})` : s === 'approved' ? `Approved (${approved.length})` : `Rejected (${rejected.length})`}
                </button>
              ))}
            </div>
          </div>

          {loading && <div className={`text-center py-xl-token text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>Loading applications…</div>}
          {!loading && error && <div className={`text-center py-xl-token text-sm-token ${isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}`}>{error}</div>}
          {!loading && !error && filteredApps.length === 0 && (
            <div className={`text-center py-xl-token text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>No applications {searchQuery ? 'match your search' : 'in this category'}.</div>
          )}

          {/* Three-column layout for 'all', flat list for filtered */}
          {!loading && !error && filteredApps.length > 0 && statusFilter === 'all' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md-token">
              {(['pending', 'approved', 'rejected'] as const).map((status) => {
                const apps = status === 'pending' ? pending : status === 'approved' ? approved : rejected;
                const filtered = searchQuery ? apps.filter((a: any) => a.companyName?.toLowerCase().includes(searchQuery.toLowerCase())) : apps;
                return (
                  <div key={status}>
                    <h3 className={`text-sm-token font-semibold mb-sm-token capitalize ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>{status} ({filtered.length})</h3>
                    <div className="flex flex-col gap-sm-token">
                      {filtered.length === 0
                        ? <p className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>No {status} applications</p>
                        : filtered.map((app: any) => <ApplicationCard key={app._id} application={app} onClick={() => setSelectedApp(app)} />)
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !loading && !error && filteredApps.length > 0 ? (
            <div className="flex flex-col gap-sm-token">
              {filteredApps.map((app: any) => <ApplicationCard key={app._id} application={app} onClick={() => setSelectedApp(app)} />)}
            </div>
          ) : null}

        </main>
      </div>
      <BottomNav />

      {selectedApp && !showBoothModal && (
        <ReviewPanel application={selectedApp} onClose={() => setSelectedApp(null)} onApprove={handleApprove} onReject={handleReject} onRevoke={handleRevoke} isActing={isActing} />
      )}

      {selectedApp && (
        <BoothAssignmentModal isOpen={showBoothModal} applicationId={selectedApp._id} expoId={expoId ?? ''} totalBooths={totalBooths} assignedBooths={assignedBooths} onConfirm={handleBoothConfirm} onCancel={() => setShowBoothModal(false)} isLoading={isActing} />
      )}
    </div>
  );
}
