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
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyApplicationsPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawnApps, setWithdrawnApps] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Withdraw dialog state
  const [withdrawTarget, setWithdrawTarget] = useState<{ expoId: string; appId: string } | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

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
          exposMap[e._id] = e;
        });
      } catch {
        // Continue if expo lookup fails
      }

      const enriched = rawList.map((app) => {
        const eid = typeof app.expoId === 'object' ? app.expoId?._id : app.expoId;
        const expoInfo = exposMap[eid];
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

  const filteredAndSortedApps = useMemo(() => {
    const statusOrder: Record<string, number> = {
      pending: 1,
      approved: 2,
      rejected: 3,
      withdrawn: 4,
    };

    return [...allApps]
      .filter((app) => {
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
        // Secondary sort: most recent submittedAt first
        const dateA = new Date(a.submittedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.submittedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
  }, [allApps, searchTerm]);

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

          {/* Search bar */}
          {!loading && !error && allApps.length > 0 && (
            <div className="mb-lg-token relative max-w-md">
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
                    ? 'bg-bg-glass-dark border-border-base-dark text-text-primary-dark placeholder-text-tertiary-dark focus:border-brand-primary-dark'
                    : 'bg-bg-glass-light border-border-base-light text-text-primary-light placeholder-text-tertiary-light focus:border-brand-primary-light'
                }`}
              />
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

          {/* No search results */}
          {!loading && !error && allApps.length > 0 && filteredAndSortedApps.length === 0 && (
            <div className={`text-center py-xl-token ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}>
              <p className="text-base-token font-medium mb-xs-token">No matching applications</p>
              <p className="text-sm-token">Try adjusting your search query.</p>
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
    </div>
  );
}
