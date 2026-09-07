import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { ticketService } from '../../services/ticketService';
import { expoService } from '../../services/expoService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { BentoCard } from '../../components/common/BentoCard';
import { 
  History, 
  Calendar, 
  MapPin, 
  Search, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  ExternalLink,
  Ticket
} from 'lucide-react';

interface CheckInEntry {
  checkedInAt: string;
}

interface AttendedExpoSummary {
  expoId: string;
  expoName: string;
  startDate?: string;
  endDate?: string;
  venueName?: string;
  venueAddress?: string;
  bannerUrl?: string;
  category?: string;
  totalCheckIns: number;
  checkInHistory: {
    ticketId: string;
    checkedInAt: string;
  }[];
  ticketIds: string[];
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeWithDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function EventHistoryPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [attendedExpos, setAttendedExpos] = useState<AttendedExpoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedExpoIds, setExpandedExpoIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function loadHistory() {
      try {
        const [rawTickets, rawExpos] = await Promise.all([
          ticketService.getMine(),
          expoService.list({ limit: 100 }).catch(() => ({ expos: [] })),
        ]);

        const ticketList: any[] = rawTickets?.tickets ?? (Array.isArray(rawTickets) ? rawTickets : []);
        const exposList: any[] = rawExpos?.expos ?? [];

        const exposMap = new Map<string, any>();
        exposList.forEach((e) => {
          if (e._id) exposMap.set(e._id.toString(), e);
        });

        // Filter tickets to those that have actual check-ins
        const checkedInTickets = ticketList.filter((t) => {
          const hasCheckInsArray = Array.isArray(t.checkIns) && t.checkIns.length > 0;
          const hasCheckedInAt = Boolean(t.checkedInAt);
          const isCheckedInStatus = t.status === 'checked_in';
          return hasCheckInsArray || hasCheckedInAt || isCheckedInStatus;
        });

        // Group & Dedup by expoId
        const expoGroupMap = new Map<string, AttendedExpoSummary>();

        checkedInTickets.forEach((t) => {
          const rawEid = typeof t.expoId === 'object' ? t.expoId?._id : t.expoId;
          const eid = rawEid ? rawEid.toString() : (t._id || 'unknown');
          const expoInfo = exposMap.get(eid);

          // Build check-in history entries for this ticket
          const ticketCheckIns: { ticketId: string; checkedInAt: string }[] = [];
          if (Array.isArray(t.checkIns) && t.checkIns.length > 0) {
            t.checkIns.forEach((ci: CheckInEntry) => {
              if (ci.checkedInAt) {
                ticketCheckIns.push({
                  ticketId: t.ticketId,
                  checkedInAt: typeof ci.checkedInAt === 'string' ? ci.checkedInAt : new Date(ci.checkedInAt).toISOString(),
                });
              }
            });
          } else if (t.checkedInAt) {
            ticketCheckIns.push({
              ticketId: t.ticketId,
              checkedInAt: typeof t.checkedInAt === 'string' ? t.checkedInAt : new Date(t.checkedInAt).toISOString(),
            });
          } else {
            ticketCheckIns.push({
              ticketId: t.ticketId,
              checkedInAt: typeof t.updatedAt === 'string' ? t.updatedAt : new Date().toISOString(),
            });
          }

          if (!expoGroupMap.has(eid)) {
            expoGroupMap.set(eid, {
              expoId: eid,
              expoName: t.expoName || expoInfo?.name || 'Attended Expo',
              startDate: t.startDate || expoInfo?.startDate,
              endDate: t.endDate || expoInfo?.endDate,
              venueName: t.venueName || expoInfo?.venueName,
              venueAddress: expoInfo?.venueAddress,
              bannerUrl: expoInfo?.bannerUrl,
              category: expoInfo?.category,
              totalCheckIns: ticketCheckIns.length,
              checkInHistory: ticketCheckIns,
              ticketIds: [t.ticketId],
            });
          } else {
            const existing = expoGroupMap.get(eid)!;
            existing.totalCheckIns += ticketCheckIns.length;
            existing.checkInHistory.push(...ticketCheckIns);
            if (!existing.ticketIds.includes(t.ticketId)) {
              existing.ticketIds.push(t.ticketId);
            }
          }
        });

        // Sort check-in history inside each expo most recent first
        expoGroupMap.forEach((summary) => {
          summary.checkInHistory.sort(
            (a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime()
          );
        });

        const list = Array.from(expoGroupMap.values());
        if (!cancelled) {
          setAttendedExpos(list);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load attended events history');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalCheckInsAcrossAll = useMemo(() => {
    return attendedExpos.reduce((acc, curr) => acc + curr.totalCheckIns, 0);
  }, [attendedExpos]);

  const filteredExpos = useMemo(() => {
    if (!searchTerm.trim()) return attendedExpos;
    const q = searchTerm.toLowerCase().trim();
    return attendedExpos.filter((item) =>
      item.expoName.toLowerCase().includes(q) ||
      (item.venueName && item.venueName.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
  }, [attendedExpos, searchTerm]);

  const toggleAccordion = (expoId: string) => {
    setExpandedExpoIds((prev) => {
      const next = new Set(prev);
      if (next.has(expoId)) {
        next.delete(expoId);
      } else {
        next.add(expoId);
      }
      return next;
    });
  };

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Events Attended" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token max-w-6xl mx-auto w-full">
          {/* Header & KPI Metrics */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md-token mb-lg-token">
            <div>
              <h1 className={`text-xl-token md:text-2xl-token font-bold flex items-center gap-2 ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}>
                <History className="w-6 h-6 text-brand-primary-dark" />
                Events Attended
              </h1>
              <p className={`text-xs-token md:text-sm-token mt-xs-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}>
                Your complete verified attendance record and multi-day check-in history.
              </p>
            </div>

            {/* Quick Stat Badges */}
            {!loading && attendedExpos.length > 0 && (
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1.5 rounded-lg-token border text-xs-token font-semibold ${
                  isDarkMode ? 'bg-glass-dark border-glass-border-dark text-text-primary-dark' : 'bg-glass-light border-glass-border-light text-text-primary-light'
                }`}>
                  <span className="text-brand-primary-dark font-bold">{attendedExpos.length}</span> {attendedExpos.length === 1 ? 'Event' : 'Events'} Attended
                </div>
                <div className={`px-3 py-1.5 rounded-lg-token border text-xs-token font-semibold ${
                  isDarkMode ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  <span className="font-bold">{totalCheckInsAcrossAll}</span> Total Check-Ins
                </div>
              </div>
            )}
          </div>

          {/* Search bar */}
          {!loading && attendedExpos.length > 0 && (
            <div className="relative mb-lg-token max-w-md">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`} />
              <input
                type="text"
                placeholder="Search attended events by name, venue, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-lg-token border text-xs-token outline-none transition-colors ${
                  isDarkMode
                    ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark focus:border-brand-primary-dark'
                    : 'bg-white border-border-base-light text-text-primary-light focus:border-brand-primary-light'
                }`}
              />
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-lg-token p-md-token rounded-lg-token bg-red-500/10 border border-red-500/20 text-red-500 text-xs-token">
              {error}
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="space-y-md-token">
              {[1, 2, 3].map((n) => (
                <div key={n} className={`h-32 rounded-xl-token animate-pulse ${
                  isDarkMode ? 'bg-gray-800/50' : 'bg-gray-200'
                }`} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && attendedExpos.length === 0 && (
            <BentoCard className="p-xl-token text-center my-lg-token">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-md-token flex items-center justify-center bg-brand-primary-dark/10 text-brand-primary-dark">
                <History className="w-7 h-7" />
              </div>
              <h2 className={`text-base-token md:text-lg-token font-bold mb-xs-token ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}>
                No Attended Events Yet
              </h2>
              <p className={`text-xs-token md:text-sm-token max-w-sm mx-auto mb-lg-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}>
                Events will appear here once you attend an expo and scan your digital QR ticket at the check-in desk.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-sm-token">
                <Link
                  to="/attendee/tickets"
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md-token text-xs-token font-semibold transition-colors ${
                    isDarkMode
                      ? 'bg-brand-primary-dark text-text-on-primary-dark hover:bg-accent-hover-dark'
                      : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light'
                  }`}
                >
                  <Ticket className="w-4 h-4" />
                  View My Registered Tickets
                </Link>
                <Link
                  to="/expos"
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md-token text-xs-token font-medium border transition-colors ${
                    isDarkMode
                      ? 'border-border-strong-dark text-text-primary-dark hover:bg-bg-hover-dark'
                      : 'border-border-strong-light text-text-primary-light hover:bg-bg-hover-light'
                  }`}
                >
                  Browse Upcoming Expos
                </Link>
              </div>
            </BentoCard>
          )}

          {/* Search Empty State */}
          {!loading && !error && attendedExpos.length > 0 && filteredExpos.length === 0 && (
            <div className={`p-12 text-center rounded-xl-token border ${
              isDarkMode ? 'bg-glass-dark border-glass-border-dark text-text-secondary-dark' : 'bg-glass-light border-glass-border-light text-text-secondary-light'
            }`}>
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm-token font-semibold">No attended events match &ldquo;{searchTerm}&rdquo;</p>
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-xs-token text-brand-primary-dark underline cursor-pointer"
              >
                Clear search filter
              </button>
            </div>
          )}

          {/* List of Attended Expos */}
          {!loading && !error && filteredExpos.length > 0 && (
            <div className="space-y-md-token">
              {filteredExpos.map((expo) => {
                const isExpanded = expandedExpoIds.has(expo.expoId);

                return (
                  <BentoCard key={expo.expoId} className="p-0 overflow-hidden border">
                    {/* Main Row */}
                    <div className="p-md-token md:p-lg-token flex flex-col md:flex-row md:items-center justify-between gap-md-token">
                      {/* Left Block: Banner preview + Info */}
                      <div className="flex items-start gap-md-token min-w-0 flex-1">
                        {expo.bannerUrl ? (
                          <img
                            src={expo.bannerUrl}
                            alt={expo.expoName}
                            className="w-16 h-16 md:w-20 md:h-20 rounded-lg-token object-cover shrink-0 border border-glass-border-dark/40"
                          />
                        ) : (
                          <div className={`w-16 h-16 md:w-20 md:h-20 rounded-lg-token shrink-0 flex items-center justify-center border font-bold text-xs-token text-center p-1 ${
                            isDarkMode
                              ? 'bg-bg-hover-dark border-border-base-dark text-brand-primary-dark'
                              : 'bg-bg-hover-light border-border-base-light text-brand-primary-light'
                          }`}>
                            {expo.expoName.slice(0, 8)}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h2 className={`text-base-token md:text-lg-token font-bold truncate ${
                              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                            }`}>
                              {expo.expoName}
                            </h2>
                            {expo.category && (
                              <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${
                                isDarkMode ? 'bg-bg-hover-dark border-border-base-dark text-text-secondary-dark' : 'bg-bg-hover-light border-border-base-light text-text-secondary-light'
                              }`}>
                                {expo.category}
                              </span>
                            )}
                          </div>

                          {/* Metadata */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs-token text-text-secondary-dark">
                            {expo.startDate && (
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-brand-primary-dark shrink-0" />
                                {formatDate(expo.startDate)}
                                {expo.endDate && ` – ${formatDate(expo.endDate)}`}
                              </span>
                            )}
                            {expo.venueName && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-brand-primary-dark shrink-0" />
                                <span className="truncate max-w-[200px]">{expo.venueName}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Check-In Badge & Accordion Toggle */}
                      <div className="flex items-center justify-between md:justify-end gap-sm-token shrink-0 pt-sm-token md:pt-0 border-t md:border-t-0 border-glass-border-dark/30">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs-token font-semibold border ${
                            isDarkMode
                              ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>
                              {expo.totalCheckIns} {expo.totalCheckIns === 1 ? 'Check-In' : 'Check-Ins'}
                            </span>
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleAccordion(expo.expoId)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md-token text-xs-token font-medium border transition-colors cursor-pointer ${
                              isDarkMode
                                ? 'bg-bg-hover-dark border-border-base-dark text-text-primary-dark hover:border-brand-primary-dark'
                                : 'bg-white border-border-base-light text-text-primary-light hover:border-brand-primary-light'
                            }`}
                            aria-expanded={isExpanded}
                          >
                            <span>{isExpanded ? 'Hide History' : 'View Timestamps'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <Link
                          to={`/expos/${expo.expoId}`}
                          className={`p-1.5 rounded-md-token border text-text-secondary-dark hover:text-brand-primary-dark transition-colors ${
                            isDarkMode ? 'border-border-base-dark hover:bg-bg-hover-dark' : 'border-border-base-light hover:bg-bg-hover-light'
                          }`}
                          title="View Expo Detail Page"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>

                    {/* Expandable Check-in Timestamps Section */}
                    {isExpanded && (
                      <div className={`px-md-token md:px-lg-token py-md-token border-t text-xs-token ${
                        isDarkMode ? 'bg-black/30 border-glass-border-dark/60' : 'bg-black/[0.02] border-glass-border-light/60'
                      }`}>
                        <div className="flex items-center justify-between mb-sm-token">
                          <h3 className={`font-semibold flex items-center gap-1.5 ${
                            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                          }`}>
                            <Clock className="w-3.5 h-3.5 text-brand-primary-dark" />
                            Verified Check-In Log ({expo.checkInHistory.length})
                          </h3>
                          <span className="text-[11px] text-text-secondary-dark">
                            Ticket Ref: {expo.ticketIds.map(id => id.slice(0, 8)).join(', ')}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {expo.checkInHistory.map((entry, idx) => (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-md-token border flex items-center justify-between gap-2 ${
                                isDarkMode
                                  ? 'bg-bg-surface-dark/90 border-border-base-dark text-text-secondary-dark'
                                  : 'bg-white border-border-base-light text-text-secondary-light'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  isDarkMode ? 'bg-brand-primary-dark/20 text-brand-primary-dark' : 'bg-brand-primary-light/20 text-brand-primary-light'
                                }`}>
                                  #{expo.checkInHistory.length - idx}
                                </span>
                                <span className={`font-medium ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                                  {formatTimeWithDate(entry.checkedInAt)}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-emerald-500 font-semibold flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Valid
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </BentoCard>
                );
              })}
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
