import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { BentoCard } from '../../components/common/BentoCard';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { showSuccess, showError } from '../../utils/toast';
import { adminService, OrganizerItem } from '../../services/adminService';
import { ShieldAlert, ShieldCheck, ArrowUpRight, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * AllOrganizersPage — SuperAdmin page for viewing and managing all organizer accounts
 */

type StatusFilter = 'all' | 'pending' | 'active' | 'suspended' | 'rejected';

const FILTER_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Active', value: 'active' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Rejected', value: 'rejected' },
];

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({
  status,
  isDarkMode,
}: {
  status: string;
  isDarkMode: boolean;
}) {
  const normalized = status.toLowerCase();

  const colorClass = (() => {
    switch (normalized) {
      case 'active':
        return isDarkMode
          ? 'bg-bg-success-dark text-text-success-dark border border-text-success-dark/20'
          : 'bg-bg-success-light text-text-success-light border border-text-success-light/20';
      case 'suspended':
        return isDarkMode
          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
          : 'bg-red-100 text-red-700 border border-red-300';
      case 'rejected':
        return isDarkMode
          ? 'bg-bg-danger-dark text-text-danger-dark border border-text-danger-dark/20'
          : 'bg-bg-danger-light text-text-danger-light border border-text-danger-light/20';
      default: // pending
        return isDarkMode
          ? 'bg-bg-warning-dark text-text-warning-dark border border-text-warning-dark/20'
          : 'bg-bg-warning-light text-text-warning-light border border-text-warning-light/20';
    }
  })();

  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs-token font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export function AllOrganizersPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const navigate = useNavigate();

  const [organizers, setOrganizers] = useState<OrganizerItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  // Suspension Modal State
  const [suspendTarget, setSuspendTarget] = useState<OrganizerItem | null>(null);
  const [isActing, setIsActing] = useState(false);

  // ── Fetch organizers ───────────────────────────────────────────────────
  const fetchOrganizers = useCallback(async (filter: StatusFilter) => {
    setIsLoading(true);
    try {
      const data = await adminService.getOrganizers(filter);
      setOrganizers(data.organizers || []);
    } catch {
      showError('Failed to load organizers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizers(activeFilter);
  }, [activeFilter, fetchOrganizers]);

  // ── Actions ────────────────────────────────────────────────────────────
  const handleConfirmSuspend = async () => {
    if (!suspendTarget) return;
    setIsActing(true);
    try {
      await adminService.suspendOrganizer(suspendTarget.id);
      showSuccess(`Organizer "${suspendTarget.fullName}" has been suspended.`);
      setSuspendTarget(null);
      fetchOrganizers(activeFilter);
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Failed to suspend organizer');
    } finally {
      setIsActing(false);
    }
  };

  const handleReactivate = async (org: OrganizerItem) => {
    setIsActing(true);
    try {
      await adminService.reactivateOrganizer(org.id);
      showSuccess(`Organizer "${org.fullName}" reactivated successfully.`);
      fetchOrganizers(activeFilter);
    } catch (err: any) {
      showError(err?.response?.data?.message || 'Failed to reactivate organizer');
    } finally {
      setIsActing(false);
    }
  };

  // ── Formatting helpers ─────────────────────────────────────────────────
  const formatDate = (isoString: string) =>
    new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  // ── Empty state subtext ────────────────────────────────────────────────
  const emptySubtext = () => {
    switch (activeFilter) {
      case 'pending':
        return 'No pending organizers awaiting approval.';
      case 'active':
        return 'No active organizers at this time.';
      case 'suspended':
        return 'No suspended organizers.';
      case 'rejected':
        return 'No rejected organizers.';
      default:
        return 'No organizer accounts have been created yet.';
    }
  };

  const emptyHeading =
    activeFilter === 'all' ? 'No organizers yet' : 'No organizers found';

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="All Organizers" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">
          {/* Page header */}
          <div className="mb-lg-token flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1
                className={`text-xl-token font-bold mb-xs-token ${
                  isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                }`}
              >
                All Organizers
              </h1>
              <p
                className={`text-sm-token ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                Manage organizer accounts, review applications, and control access permissions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/admin/approvals')}
              className={`inline-flex items-center gap-1.5 px-md-token py-2 rounded-md-token text-sm-token font-semibold transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-brand-primary-dark text-text-on-primary-dark hover:opacity-90'
                  : 'bg-brand-primary-light text-text-on-primary-light hover:opacity-90'
              }`}
            >
              <span>Pending Approvals</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Filter tabs */}
          <div
            className="flex gap-sm-token flex-wrap mb-lg-token"
            role="tablist"
            aria-label="Filter organizers by status"
          >
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveFilter(tab.value)}
                  className={`px-md-token py-sm-token rounded-lg-token text-sm-token font-medium border transition-colors cursor-pointer focus:outline-none ${
                    isActive
                      ? isDarkMode
                        ? 'bg-brand-primary-dark text-text-on-primary-dark border-brand-primary-dark'
                        : 'bg-brand-primary-light text-text-on-primary-dark border-brand-primary-light'
                      : isDarkMode
                      ? 'border-border-base-dark text-text-secondary-dark hover:bg-bg-hover-dark'
                      : 'border-border-base-light text-text-secondary-light hover:bg-bg-hover-light'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content card */}
          <BentoCard>
            {/* Loading state */}
            {isLoading && (
              <div
                className="flex flex-col items-center justify-center py-xxl-token gap-4"
                aria-busy="true"
              >
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary-dark" />
                <p
                  className={`text-sm-token ${
                    isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                  }`}
                >
                  Loading organizers…
                </p>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && organizers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-xxl-token gap-4 text-center">
                <ShieldAlert
                  className={`w-16 h-16 opacity-40 ${
                    isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                  }`}
                />
                <div>
                  <h2
                    className={`text-lg-token font-semibold mb-xs-token ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}
                  >
                    {emptyHeading}
                  </h2>
                  <p
                    className={`text-sm-token ${
                      isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                    }`}
                  >
                    {emptySubtext()}
                  </p>
                </div>
              </div>
            )}

            {/* Table (md+) / card list (mobile) */}
            {!isLoading && organizers.length > 0 && (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr
                        className={`border-b ${
                          isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'
                        }`}
                      >
                        {(['Organizer', 'Email', 'Status', 'Registered', 'Actions'] as const).map(
                          (col) => (
                            <th
                              key={col}
                              scope="col"
                              className={`pb-sm-token text-left text-xs-token font-semibold uppercase tracking-wide ${
                                isDarkMode
                                  ? 'text-text-secondary-dark'
                                  : 'text-text-secondary-light'
                              }`}
                            >
                              {col}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {organizers.map((organizer) => (
                        <tr
                          key={organizer.id}
                          className={`border-b last:border-b-0 ${
                            isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'
                          }`}
                        >
                          <td
                            className={`py-md-token pr-md-token text-sm-token font-semibold ${
                              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                            }`}
                          >
                            {organizer.fullName}
                          </td>
                          <td
                            className={`py-md-token pr-md-token text-sm-token ${
                              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                            }`}
                          >
                            {organizer.email}
                          </td>
                          <td className="py-md-token pr-md-token">
                            <StatusBadge status={organizer.status} isDarkMode={isDarkMode} />
                          </td>
                          <td
                            className={`py-md-token pr-md-token text-sm-token ${
                              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                            }`}
                          >
                            {formatDate(organizer.createdAt)}
                          </td>
                          <td className="py-md-token text-sm-token">
                            {organizer.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => setSuspendTarget(organizer)}
                                disabled={isActing}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-red-500 hover:bg-red-500/10 border border-red-500/30 transition-colors cursor-pointer"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>Suspend</span>
                              </button>
                            )}
                            {organizer.status === 'suspended' && (
                              <button
                                type="button"
                                onClick={() => handleReactivate(organizer)}
                                disabled={isActing}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/30 transition-colors cursor-pointer"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Reactivate</span>
                              </button>
                            )}
                            {organizer.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => navigate('/admin/approvals')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-brand-primary-dark hover:bg-brand-primary-dark/10 border border-brand-primary-dark/30 transition-colors cursor-pointer"
                              >
                                <span>Review Approval</span>
                              </button>
                            )}
                            {organizer.status === 'rejected' && (
                              <button
                                type="button"
                                onClick={() => handleReactivate(organizer)}
                                disabled={isActing}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-text-secondary-dark hover:bg-white/10 border border-border-base-dark transition-colors cursor-pointer"
                              >
                                <span>Reactivate</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="flex flex-col gap-md-token md:hidden">
                  {organizers.map((organizer) => (
                    <div
                      key={organizer.id}
                      className={`rounded-lg-token border p-md-token ${
                        isDarkMode
                          ? 'border-border-base-dark bg-bg-hover-dark'
                          : 'border-border-base-light bg-bg-hover-light'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-xs-token">
                        <p
                          className={`text-sm-token font-semibold ${
                            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                          }`}
                        >
                          {organizer.fullName}
                        </p>
                        <StatusBadge status={organizer.status} isDarkMode={isDarkMode} />
                      </div>
                      <p
                        className={`text-xs-token mb-xs-token ${
                          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                        }`}
                      >
                        {organizer.email}
                      </p>
                      <p
                        className={`text-xs-token mb-md-token ${
                          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                        }`}
                      >
                        Registered: {formatDate(organizer.createdAt)}
                      </p>

                      <div className="flex items-center gap-2 pt-2 border-t border-border-base-dark/20">
                        {organizer.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => setSuspendTarget(organizer)}
                            disabled={isActing}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold text-red-500 hover:bg-red-500/10 border border-red-500/30 transition-colors cursor-pointer"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Suspend</span>
                          </button>
                        )}
                        {organizer.status === 'suspended' && (
                          <button
                            type="button"
                            onClick={() => handleReactivate(organizer)}
                            disabled={isActing}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/30 transition-colors cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Reactivate</span>
                          </button>
                        )}
                        {organizer.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => navigate('/admin/approvals')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold text-brand-primary-dark hover:bg-brand-primary-dark/10 border border-brand-primary-dark/30 transition-colors cursor-pointer"
                          >
                            <span>Review</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </BentoCard>
        </main>
      </div>
      <BottomNav />

      {/* ── Suspend Confirmation Modal ─────────────────────────────────────── */}
      {suspendTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="suspend-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-md-token"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isActing) setSuspendTarget(null);
          }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
          <div
            className={`relative z-10 w-full max-w-md rounded-xl-token border p-lg-token shadow-2xl ${
              isDarkMode
                ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark'
                : 'bg-bg-surface-light border-border-base-light text-text-primary-light'
            }`}
          >
            <div className="flex items-center gap-3 mb-md-token">
              <div className="p-2 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 id="suspend-modal-title" className="text-base-token font-bold">
                  Suspend Organizer Account?
                </h2>
                <p className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  {suspendTarget.fullName} ({suspendTarget.email})
                </p>
              </div>
            </div>

            <div
              className={`p-md-token rounded-md-token text-xs-token mb-lg-token leading-relaxed border ${
                isDarkMode
                  ? 'bg-black/30 border-border-base-dark text-text-secondary-dark'
                  : 'bg-black/5 border-border-base-light text-text-secondary-light'
              }`}
            >
              <p className="font-semibold mb-1 text-text-primary-dark dark:text-text-primary-dark">
                This will have the following effects:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Immediately invalidates all active login sessions for this organizer.</li>
                <li>Blocks the organizer from logging in or creating/editing expos.</li>
                <li>Existing published expos remain visible to attendees and exhibitors.</li>
                <li>You can reactivate this organizer account at any time.</li>
              </ul>
            </div>

            <div className="flex gap-sm-token justify-end">
              <button
                type="button"
                onClick={() => setSuspendTarget(null)}
                disabled={isActing}
                className={`px-md-token py-2 rounded-md-token text-sm-token font-medium border transition-colors disabled:opacity-60 cursor-pointer ${
                  isDarkMode
                    ? 'border-border-base-dark text-text-primary-dark hover:bg-bg-hover-dark'
                    : 'border-border-base-light text-text-primary-light hover:bg-bg-hover-light'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={isActing}
                className="px-md-token py-2 rounded-md-token text-sm-token font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5 shadow-md"
              >
                {isActing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                <span>{isActing ? 'Suspending…' : 'Suspend Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AllOrganizersPage;

