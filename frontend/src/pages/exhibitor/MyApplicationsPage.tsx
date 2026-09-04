import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { applicationService } from '../../services/applicationService';
import { expoService } from '../../services/expoService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import PageHeader from '../../components/layout/PageHeader';
import ExhibitorApplicationCard from '../../components/application/ExhibitorApplicationCard';
import WithdrawConfirmDialog from '../../components/application/WithdrawConfirmDialog';
import ApplicationMessageThread from '../../components/application/ApplicationMessageThread';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';

type AppStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'withdrawn';

const STATUS_CHIPS: { label: string; value: AppStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Withdrawn', value: 'withdrawn' },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyApplicationsPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawnApps, setWithdrawnApps] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppStatus>('all');

  // Withdraw dialog state
  const [withdrawTarget, setWithdrawTarget] = useState<{ expoId: string; appId: string } | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  // Messaging state
  const [messageApp, setMessageApp] = useState<any | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await applicationService.listAllMine();
      const rawList: any[] = Array.isArray(data) ? data : (data?.applications ?? []);

      // Attempt to load expo details if expoName or startDate is missing
      let exposMap: Record<string, any> = {};
      try {
        const exposData = await expoService.list({ limit: 100 });
        const exposList: any[] = exposData?.expos ?? [];
        exposList.forEach((e) => {
          exposMap[e._id?.toString()] = e;
        });
      } catch {
        // Continue if expo lookup fails
      }

      const enriched = rawList.map((app) => {
        const eid = typeof app.expoId === 'object' ? app.expoId?._id : app.expoId;
        const expoInfo = exposMap[eid?.toString()];
        return {
          ...app,
          expoId: eid,
          expoName: app.expoName || expoInfo?.name,
          startDate: app.startDate || expoInfo?.startDate,
          venueName: app.venueName || expoInfo?.venueName,
          venueMapUrl: app.venueMapUrl || expoInfo?.venueMapUrl,
        };
      });

      setApplications(enriched);
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
      const withdrawnApp = applications.find(a => a._id === withdrawTarget.appId);
      await applicationService.withdraw(withdrawTarget.expoId, withdrawTarget.appId);
      toast.success('Application withdrawn.');
      setWithdrawTarget(null);
      if (withdrawnApp) {
        setApplications(prev => prev.filter(a => a._id !== withdrawTarget.appId));
        setWithdrawnApps(prev => [...prev, { ...withdrawnApp, status: 'withdrawn' as const }]);
      } else {
        fetchApplications();
      }
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

  const allApps = [...applications, ...withdrawnApps];

  // Count per status for chip badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allApps.forEach((a) => {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    });
    return counts;
  }, [allApps]);

  const filteredAndSortedApps = useMemo(() => {
    const statusOrder: Record<string, number> = {
      pending: 1,
      approved: 2,
      rejected: 3,
      withdrawn: 4,
    };

    return [...allApps]
      .filter((app) => {
        if (statusFilter !== 'all' && app.status !== statusFilter) return false;
        if (!searchTerm.trim()) return true;
        const query = searchTerm.toLowerCase().trim();
        const expoName = (app.expoName || '').toLowerCase();
        const companyName = (app.companyName || '').toLowerCase();
        return expoName.includes(query) || companyName.includes(query);
      })
      .sort((a, b) => {
        const orderA = statusOrder[a.status] ?? 99;
        const orderB = statusOrder[b.status] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        const dateA = new Date(a.submittedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.submittedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
  }, [allApps, searchTerm, statusFilter]);

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
        <Header title="My Applications" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">

          <PageHeader
            title="My Applications"
            subtitle="Track your exhibition applications, booth assignments, and review status."
          />

          {/* Status filter chips + Search bar */}
          {!loading && !error && allApps.length > 0 && (
            <div className="mb-lg-token flex flex-col gap-sm-token">
              {/* Filter chips */}
              <div className="flex flex-wrap gap-2">
                {STATUS_CHIPS.map((chip) => {
                  const count = chip.value === 'all' ? allApps.length : (statusCounts[chip.value] ?? 0);
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
                  placeholder="Search by expo or company name..."
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
          {!loading && !error && allApps.length === 0 && (
            <div className={`text-center py-xl-token ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}>
              <p className="text-base-token font-medium mb-xs-token">No applications yet</p>
              <p className="text-sm-token">Browse expos and apply to exhibit.</p>
            </div>
          )}

          {/* No results */}
          {!loading && !error && allApps.length > 0 && filteredAndSortedApps.length === 0 && (
            <div className={`text-center py-xl-token ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}>
              <p className="text-base-token font-medium mb-xs-token">No matching applications</p>
              <p className="text-sm-token">Try adjusting your search or filter.</p>
            </div>
          )}

          {/* Application Card Grid */}
          {!loading && !error && filteredAndSortedApps.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md-token md:gap-lg-token">
              {filteredAndSortedApps.map((app: any) => (
                <ExhibitorApplicationCard
                  key={app._id}
                  application={app}
                  onWithdraw={(target) => setWithdrawTarget(target)}
                  onOpenMessages={(a) => setMessageApp(a)}
                />
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

      {/* Application message thread */}
      {messageApp && (
        <ApplicationMessageThread
          isOpen={!!messageApp}
          applicationId={messageApp._id}
          expoName={messageApp.expoName ?? 'Expo'}
          onClose={() => setMessageApp(null)}
        />
      )}
    </div>
  );
}
