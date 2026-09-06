import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { applicationService } from '../../services/applicationService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { BentoCard } from '../../components/common/BentoCard';
import {
  Store,
  Star,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface ExhibitorOverviewItem {
  _id: string;
  expoId: string;
  expoName: string;
  expoStatus: string;
  companyName: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  phoneNumber: string;
  websiteUrl?: string;
  logoUrl?: string;
  boothLabel?: string;
  submittedAt: string;
  averageRating?: number;
  reviewCount?: number;
}

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: 'Pending', bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
  approved: { label: 'Approved', bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
  rejected: { label: 'Rejected', bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
  withdrawn: { label: 'Withdrawn', bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
};

export default function OrganizerExhibitorsPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [applications, setApplications] = useState<ExhibitorOverviewItem[]>([]);
  const [expos, setExpos] = useState<Array<{ _id: string; name: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedExpoId, setSelectedExpoId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await applicationService.listOrganizerOverview({
        expoId: selectedExpoId !== 'all' ? selectedExpoId : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      });
      setApplications(data?.applications || []);
      if (data?.expos) {
        setExpos(data.expos);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load exhibitors');
    } finally {
      setLoading(false);
    }
  }, [selectedExpoId, selectedStatus]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Search filter
  const filteredApplications = useMemo(() => {
    if (!searchQuery.trim()) return applications;
    const q = searchQuery.toLowerCase();
    return applications.filter(
      (app) =>
        app.companyName.toLowerCase().includes(q) ||
        app.expoName.toLowerCase().includes(q) ||
        (app.boothLabel && app.boothLabel.toLowerCase().includes(q)) ||
        (app.category && app.category.toLowerCase().includes(q))
    );
  }, [applications, searchQuery]);

  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  const bgCard = isDarkMode
    ? 'bg-glass-dark border-glass-border-dark'
    : 'bg-glass-light border-glass-border-light';

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Exhibitors Directory" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">
          
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-md-token mb-lg-token">
            <div>
              <h1 className={`text-xl-token md:text-2xl-token font-bold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                Cross-Expo Exhibitor Directory
              </h1>
              <p className={`text-xs-token md:text-sm-token mt-1 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                Overview of all exhibitors, booth allocations, and attendee feedback ratings across your expos
              </p>
            </div>
          </div>

          {/* Metrics summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-md-token mb-lg-token">
            <BentoCard className="p-md-token flex items-center gap-3">
              <div className={`p-2.5 rounded-xl-token ${isDarkMode ? 'bg-bg-hover-dark text-text-primary-dark' : 'bg-bg-hover-light text-text-primary-light'}`}>
                <Store className="w-5 h-5 text-brand-primary-dark" />
              </div>
              <div>
                <div className={`text-2xl-token font-bold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                  {applications.length}
                </div>
                <div className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  Total Exhibitor Applications
                </div>
              </div>
            </BentoCard>

            <BentoCard className="p-md-token flex items-center gap-3">
              <div className="p-2.5 rounded-xl-token bg-green-500/10 text-green-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl-token font-bold text-green-500">
                  {approvedCount}
                </div>
                <div className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  Approved &amp; Placed Exhibitors
                </div>
              </div>
            </BentoCard>

            <BentoCard className="p-md-token flex items-center gap-3">
              <div className="p-2.5 rounded-xl-token bg-amber-500/10 text-amber-500">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl-token font-bold text-amber-500">
                  {pendingCount}
                </div>
                <div className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  Pending Review
                </div>
              </div>
            </BentoCard>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row gap-sm-token mb-lg-token">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                type="text"
                placeholder="Search by company name, booth, expo…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-lg-token border text-xs-token outline-none transition-colors ${
                  isDarkMode
                    ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark placeholder:text-text-secondary-dark'
                    : 'bg-white border-border-base-light text-text-primary-light placeholder:text-text-secondary-light'
                }`}
              />
            </div>

            {/* Expo Filter */}
            <select
              value={selectedExpoId}
              onChange={(e) => setSelectedExpoId(e.target.value)}
              className={`px-3 py-2 rounded-lg-token border text-xs-token font-medium outline-none ${
                isDarkMode
                  ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark'
                  : 'bg-white border-border-base-light text-text-primary-light'
              }`}
            >
              <option value="all">All Expos ({expos.length})</option>
              {expos.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name} ({e.status})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`px-3 py-2 rounded-lg-token border text-xs-token font-medium outline-none ${
                isDarkMode
                  ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark'
                  : 'bg-white border-border-base-light text-text-primary-light'
              }`}
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Exhibitor Table */}
          {loading ? (
            <div className="py-20 text-center text-xs opacity-60">Loading exhibitors overview…</div>
          ) : error ? (
            <div className="p-4 rounded-lg-token bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
              {error}
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl-token border backdrop-blur-md ${bgCard}`}>
              <Store className="w-10 h-10 mx-auto mb-2 opacity-40 text-text-secondary-dark" />
              <p className="text-base-token font-semibold">No exhibitors found</p>
              <p className={`text-xs-token mt-1 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                {searchQuery
                  ? 'No applications match your search query.'
                  : 'No exhibitor applications have been submitted for the selected filter.'}
              </p>
            </div>
          ) : (
            <div className={`rounded-xl-token border backdrop-blur-md overflow-hidden ${bgCard}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs-token border-collapse">
                  <thead>
                    <tr
                      className={`border-b font-semibold ${
                        isDarkMode
                          ? 'border-border-base-dark bg-bg-surface-dark/40 text-text-secondary-dark'
                          : 'border-border-base-light bg-bg-surface-light/40 text-text-secondary-light'
                      }`}
                    >
                      <th className="px-4 py-3">Exhibitor / Company</th>
                      <th className="px-4 py-3">Expo Name</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Booth</th>
                      <th className="px-4 py-3">Attendee Rating</th>
                      <th className="px-4 py-3">Submitted</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredApplications.map((app) => {
                      const badge = STATUS_BADGE[app.status] || STATUS_BADGE.pending;
                      const hasRating = typeof app.reviewCount === 'number' && app.reviewCount > 0;

                      return (
                        <tr
                          key={app._id}
                          className={`transition-colors hover:bg-black/5 ${
                            isDarkMode ? 'hover:bg-white/5' : ''
                          }`}
                        >
                          {/* Company Name & Logo */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              {app.logoUrl ? (
                                <img
                                  src={app.logoUrl}
                                  alt={app.companyName}
                                  className="w-8 h-8 rounded-md-token object-contain bg-white/5 shrink-0"
                                />
                              ) : (
                                <div
                                  className={`w-8 h-8 rounded-md-token flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isDarkMode
                                      ? 'bg-brand-primary-dark/20 text-brand-primary-dark'
                                      : 'bg-brand-primary-light/20 text-brand-primary-light'
                                  }`}
                                >
                                  {app.companyName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className={`font-semibold truncate ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                                  {app.companyName}
                                </div>
                                <div className={`text-[11px] ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                                  {app.category || 'Exhibitor'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Expo */}
                          <td className="px-4 py-3.5">
                            <div className={`font-medium ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                              {app.expoName}
                            </div>
                            <span className={`text-[10px] capitalize opacity-60`}>
                              {app.expoStatus}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                              {badge.label}
                            </span>
                          </td>

                          {/* Booth */}
                          <td className="px-4 py-3.5">
                            {app.boothLabel ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-brand-primary-dark/15 text-brand-primary-dark font-mono font-bold text-[11px]">
                                {app.boothLabel}
                              </span>
                            ) : (
                              <span className="text-[11px] opacity-40">—</span>
                            )}
                          </td>

                          {/* Attendee Rating Aggregate */}
                          <td className="px-4 py-3.5">
                            {hasRating ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 text-amber-500 font-bold text-xs">
                                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                  <span>{app.averageRating}</span>
                                </span>
                                <span className={`text-[11px] ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                                  ({app.reviewCount} {app.reviewCount === 1 ? 'review' : 'reviews'})
                                </span>
                              </div>
                            ) : (
                              <span className={`text-[11px] ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'} opacity-60`}>
                                No ratings yet
                              </span>
                            )}
                          </td>

                          {/* Submitted Date */}
                          <td className="px-4 py-3.5 text-[11px] opacity-70">
                            {new Date(app.submittedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => navigate(`/organizer/expos/${app.expoId}/applications`)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                                isDarkMode
                                  ? 'text-brand-primary-dark hover:bg-brand-primary-dark/10'
                                  : 'text-brand-primary-light hover:bg-brand-primary-light/10'
                              }`}
                              title="Go to expo application review page"
                            >
                              <span>Review</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
