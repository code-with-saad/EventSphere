import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, FileText, CheckCircle, Clock, Compass, BarChart3, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { applicationService } from '../../services/applicationService';
import { expoService } from '../../services/expoService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { BentoCard } from '../../components/common/BentoCard';
import ApplicationStatusBadge from '../../components/application/ApplicationStatusBadge';
import LiveEventBanner from '../../components/dashboard/LiveEventBanner';
import ChartWrapper from '../../components/analytics/ChartWrapper';

interface EnrichedApplication {
  _id: string;
  expoId: string;
  companyName: string;
  companyDescription?: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  submittedAt: string;
  boothLabel?: string;
  expoName?: string;
  startDate?: string;
  endDate?: string;
  expoStatus?: string;
  venueName?: string;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ExhibitorDashboard() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadExhibitorData() {
      setLoading(true);
      setError(null);
      try {
        const rawApps = await applicationService.listAllMine();
        const appList: any[] = Array.isArray(rawApps) ? rawApps : (rawApps?.applications ?? []);

        // Fetch expos for names if not directly attached
        let exposMap: Record<string, any> = {};
        try {
          const exposData = await expoService.list({ limit: 100 });
          const exposList: any[] = exposData?.expos ?? [];
          exposList.forEach((e) => {
            if (e._id) exposMap[e._id.toString()] = e;
          });
        } catch {
          // Continue if expo lookup fails
        }

        // Secondary individual fetch fallback for any expoIds missing from bulk list
        const missingExpoIds = new Set<string>();
        appList.forEach((app) => {
          const rawEid = typeof app.expoId === 'object' ? app.expoId?._id : app.expoId;
          const eid = rawEid ? rawEid.toString() : '';
          if (eid && !exposMap[eid]) {
            missingExpoIds.add(eid);
          }
        });

        if (missingExpoIds.size > 0) {
          await Promise.all(
            Array.from(missingExpoIds).map(async (eid) => {
              try {
                const singleExpo = await expoService.getById(eid);
                if (singleExpo) {
                  exposMap[eid] = singleExpo;
                }
              } catch {
                // Ignore individual lookup failure
              }
            })
          );
        }

        const enriched: EnrichedApplication[] = appList.map((app) => {
          const rawEid = typeof app.expoId === 'object' ? app.expoId?._id : app.expoId;
          const eid = rawEid ? rawEid.toString() : '';
          const expoInfo = exposMap[eid];
          return {
            _id: app._id,
            expoId: eid,
            companyName: app.companyName,
            companyDescription: app.companyDescription,
            category: app.category,
            status: app.status,
            submittedAt: app.submittedAt,
            boothLabel: app.boothLabel,
            expoName: app.expoName || expoInfo?.name || 'Expo',
            startDate: app.startDate || expoInfo?.startDate,
            endDate: app.endDate || expoInfo?.endDate,
            expoStatus: app.expoStatus || expoInfo?.status,
            venueName: app.venueName || expoInfo?.venueName,
          };
        });

        if (!cancelled) {
          setApplications(enriched);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load exhibitor applications');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadExhibitorData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Compute status counts client-side
  const totalCount = applications.length;
  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;
  const withdrawnCount = applications.filter((a) => a.status === 'withdrawn').length;

  const ongoingApp = applications.find((a) => a.expoStatus === 'ongoing');

  // Chart data
  const statusPieData = [
    { name: 'Approved', value: approvedCount, color: '#10B981' },
    { name: 'Pending', value: pendingCount, color: '#F59E0B' },
    { name: 'Rejected', value: rejectedCount, color: '#EF4444' },
    { name: 'Withdrawn', value: withdrawnCount, color: '#8A8A8E' },
  ].filter((d) => d.value > 0);

  // Recent applications preview (up to 6, sorted by submission date descending)
  const recentApplications = [...applications]
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 6);

  // ── Shared button styles matching OrganizerDashboard ─────────────────────
  const secondaryBtnBase = [
    'inline-flex items-center gap-xs-token',
    'px-md-token py-sm-token rounded-md-token',
    'text-sm-token font-medium',
    'bg-transparent border',
    'transition-colors duration-[120ms]',
  ].join(' ');

  const secondaryBtnDark = 'border-border-strong-dark text-text-primary-dark hover:bg-bg-hover-dark';
  const secondaryBtnLight = 'border-border-strong-light text-text-primary-light hover:bg-bg-hover-light';

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Dashboard" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">

          {/* Live Ongoing Event Highlight */}
          {ongoingApp && (
            <LiveEventBanner
              expoId={ongoingApp.expoId}
              expoName={ongoingApp.expoName || 'Ongoing Expo'}
              startDate={ongoingApp.startDate}
              endDate={ongoingApp.endDate}
              venueName={ongoingApp.venueName}
              role="exhibitor"
              hasActiveApplication={ongoingApp.status === 'pending' || ongoingApp.status === 'approved'}
            />
          )}

          {/* 1. Welcome heading + Integrated quick actions */}
          <div className="flex flex-wrap items-center justify-between gap-md-token mb-lg-token">
            <div>
              <h2
                className={`text-xl-token font-semibold leading-tight-token ${
                  isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                }`}
              >
                Welcome, {user?.fullName ?? 'Exhibitor'}!
              </h2>
              <p
                className={`text-sm-token mt-xs-token ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                Overview of your booth applications and exhibition status
              </p>
            </div>

            {/* Quick-action buttons */}
            <div className="flex flex-wrap items-center gap-sm-token">
              <button
                type="button"
                onClick={() => navigate('/exhibitor/analytics')}
                className={`${secondaryBtnBase} ${isDarkMode ? secondaryBtnDark : secondaryBtnLight}`}
              >
                <BarChart3 className="w-4 h-4" aria-hidden="true" />
                Reports & Analytics
              </button>
              <button
                type="button"
                onClick={() => navigate('/expos')}
                className={`${secondaryBtnBase} ${isDarkMode ? secondaryBtnDark : secondaryBtnLight}`}
              >
                <Compass className="w-4 h-4" aria-hidden="true" />
                Browse Expos
              </button>
              <button
                type="button"
                onClick={() => navigate('/exhibitor/applications')}
                className={`${secondaryBtnBase} ${isDarkMode ? secondaryBtnDark : secondaryBtnLight}`}
              >
                <FileText className="w-4 h-4" aria-hidden="true" />
                My Applications
              </button>
            </div>
          </div>

          {/* 2. Stats row */}
          <div className="mb-xl-token">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md-token">
                {[0, 1, 2].map((i) => (
                  <BentoCard key={i}>
                    <div className="flex flex-col gap-md-token animate-pulse">
                      <div className="flex items-center gap-sm-token">
                        <div className={`w-6 h-6 rounded-md-token ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                        <div className={`h-3 w-24 rounded-sm-token ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                      </div>
                      <div className={`h-8 w-16 rounded-md-token ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                    </div>
                  </BentoCard>
                ))}
              </div>
            ) : error ? (
              <BentoCard>
                <p className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  {error}. Refresh the page to try again.
                </p>
              </BentoCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md-token">
                <BentoCard>
                  <div className="flex flex-col gap-md-token">
                    <div className="flex items-center gap-sm-token">
                      <FileText
                        className={`w-6 h-6 flex-shrink-0 ${
                          isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
                        }`}
                        aria-hidden="true"
                      />
                      <span className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                        Total Applications
                      </span>
                    </div>
                    <span className={`text-2xl-token font-bold leading-tight-token ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}>
                      {totalCount}
                    </span>
                  </div>
                </BentoCard>

                <BentoCard>
                  <div className="flex flex-col gap-md-token">
                    <div className="flex items-center gap-sm-token">
                      <Clock
                        className={`w-6 h-6 flex-shrink-0 ${
                          isDarkMode ? 'text-text-warning-dark' : 'text-text-warning-light'
                        }`}
                        aria-hidden="true"
                      />
                      <span className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                        Pending Review
                      </span>
                    </div>
                    <span className={`text-2xl-token font-bold leading-tight-token ${
                      isDarkMode ? 'text-text-warning-dark' : 'text-text-warning-light'
                    }`}>
                      {pendingCount}
                    </span>
                  </div>
                </BentoCard>

                <BentoCard>
                  <div className="flex flex-col gap-md-token">
                    <div className="flex items-center gap-sm-token">
                      <CheckCircle
                        className={`w-6 h-6 flex-shrink-0 ${
                          isDarkMode ? 'text-text-success-dark' : 'text-text-success-light'
                        }`}
                        aria-hidden="true"
                      />
                      <span className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                        Approved
                      </span>
                    </div>
                    <span className={`text-2xl-token font-bold leading-tight-token ${
                      isDarkMode ? 'text-text-success-dark' : 'text-text-success-light'
                    }`}>
                      {approvedCount}
                    </span>
                  </div>
                </BentoCard>
              </div>
            )}
          </div>

          {/* Inline Chart Widget if applications exist */}
          {statusPieData.length > 0 && (
            <div className="mb-xl-token">
              <ChartWrapper
                title="Application Status Overview"
                subtitle="Live breakdown of your application outcomes"
                loading={loading}
                minHeight={200}
                headerAction={
                  <button
                    type="button"
                    onClick={() => navigate('/exhibitor/analytics')}
                    className={`inline-flex items-center gap-1 text-xs-token font-medium hover:opacity-80 transition-opacity ${
                      isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
                    }`}
                  >
                    <span>Detailed Analytics</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                }
              >
                <div className="flex flex-col sm:flex-row items-center justify-around h-full w-full py-2">
                  <div className="w-full sm:w-1/2 h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {statusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDarkMode ? '#18181B' : '#FFFFFF',
                            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                            borderRadius: '8px',
                            fontSize: '11px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap sm:flex-col gap-2 sm:gap-3 w-full sm:w-1/2 justify-center px-4">
                    {statusPieData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs-token min-w-[120px]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className={isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}>
                            {item.name}
                          </span>
                        </div>
                        <span className={`font-semibold ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartWrapper>
            </div>
          )}

          {/* 3. Recent applications section — compact interactive card grid */}
          <section aria-label="Recent Applications">
            <div className="flex items-center justify-between mb-md-token">
              <h3
                className={`text-base-token font-semibold ${
                  isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                }`}
              >
                Recent Applications
              </h3>
              {recentApplications.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/exhibitor/applications')}
                  className={`text-xs-token font-medium underline hover:opacity-80 transition-opacity ${
                    isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
                  }`}
                >
                  View All ({totalCount})
                </button>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md-token">
                {[0, 1, 2].map((i) => (
                  <BentoCard key={i}>
                    <div className="flex flex-col gap-sm-token animate-pulse py-sm-token">
                      <div className={`h-4 w-48 rounded-sm-token ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                      <div className={`h-3 w-32 rounded-sm-token ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                    </div>
                  </BentoCard>
                ))}
              </div>
            ) : recentApplications.length === 0 ? (
              <BentoCard>
                <div className="flex flex-col items-center text-center py-xl-token gap-md-token">
                  <div
                    className={`w-16 h-16 rounded-xl-token flex items-center justify-center ${
                      isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'
                    }`}
                  >
                    <Store
                      className={`w-8 h-8 ${
                        isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                  <h4 className={`text-base-token font-semibold leading-tight-token ${
                    isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                  }`}>
                    No applications yet
                  </h4>
                  <p className={`text-sm-token max-w-xs ${
                    isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                  }`}>
                    Explore open expos and submit booth applications to showcase your business.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/expos')}
                    className={`
                      mt-sm-token px-md-token py-sm-token rounded-md-token
                      text-sm-token font-medium transition-colors duration-150
                      ${
                        isDarkMode
                          ? 'bg-brand-primary-dark text-accent-bg-dark hover:bg-accent-hover-dark'
                          : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light'
                      }
                    `}
                  >
                    Browse Expos
                  </button>
                </div>
              </BentoCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md-token">
                {recentApplications.map((app) => {
                  const isApproved = app.status === 'approved';
                  const isPending = app.status === 'pending';
                  const isRejected = app.status === 'rejected';

                  return (
                    <div
                      key={app._id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate('/exhibitor/applications')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate('/exhibitor/applications');
                        }
                      }}
                      className={`text-left p-md-token rounded-lg-token border transition-all duration-150 backdrop-blur-md cursor-pointer flex flex-col justify-between ${
                        isDarkMode
                          ? 'bg-glass-dark border-glass-border-dark hover:border-brand-primary-dark hover:shadow-elevation-1-dark'
                          : 'bg-glass-light border-glass-border-light hover:border-brand-primary-light hover:shadow-elevation-1-light'
                      } ${
                        isApproved
                          ? isDarkMode
                            ? 'border-l-4 border-l-text-success-dark'
                            : 'border-l-4 border-l-text-success-light'
                          : isPending
                          ? isDarkMode
                            ? 'border-l-4 border-l-text-warning-dark'
                            : 'border-l-4 border-l-text-warning-light'
                          : isRejected
                          ? isDarkMode
                            ? 'border-l-4 border-l-text-danger-dark'
                            : 'border-l-4 border-l-text-danger-light'
                          : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-sm-token mb-sm-token">
                          <h4
                            className={`text-sm-token font-semibold line-clamp-1 ${
                              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                            }`}
                            title={app.expoName}
                          >
                            {app.expoName}
                          </h4>
                          <ApplicationStatusBadge status={app.status} />
                        </div>

                        <div className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                          {app.companyName} · Submitted {formatDate(app.submittedAt)}
                        </div>

                        {app.boothLabel && (
                          <div className="mt-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                isDarkMode
                                  ? 'bg-bg-success-dark/30 text-text-success-dark border-text-success-dark/40'
                                  : 'bg-bg-success-light text-text-success-light border-text-success-light/40'
                              }`}
                            >
                              <Store className="w-3 h-3" />
                              Booth {app.boothLabel}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-md-token pt-xs-token border-t border-border-base-dark/20 flex items-center justify-between">
                        <span className={`text-[11px] font-medium ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`}>
                          View Details →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </main>
      </div>
      <BottomNav />
    </div>
  );
}
