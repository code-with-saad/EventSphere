import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ScanLine, BarChart3, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganizerStats } from '../../hooks/useOrganizerStats';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { OrganizerStatsPanel } from '../../components/dashboard/OrganizerStatsPanel';
import { ExpoStatCard } from '../../components/dashboard/ExpoStatCard';
import LiveEventBanner from '../../components/dashboard/LiveEventBanner';
import PendingApprovalScreen from '../../components/dashboard/PendingApprovalScreen';
import ChartWrapper from '../../components/analytics/ChartWrapper';

type ExpoStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';

function statusLabel(status: ExpoStatus): string {
  switch (status) {
    case 'published': return 'Published';
    case 'ongoing':   return 'Ongoing';
    case 'completed': return 'Completed';
    case 'archived':  return 'Archived';
    case 'draft':
    default:          return 'Draft';
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RecentExpo {
  _id: string;
  name: string;
  status: ExpoStatus;
  startDate: string;
  endDate: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function OrganizerDashboard() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user } = useAuth();
  const navigate = useNavigate();

  // Used for the recent expos list; OrganizerStatsPanel manages its own call.
  const { stats } = useOrganizerStats();

  const [selectedExpoId, setSelectedExpoId] = useState<string | null>(null);

  if (user?.status === 'pending') {
    return <PendingApprovalScreen />;
  }

  const recentExpos: RecentExpo[] = stats?.recentExpos ?? [];
  const ongoingExpo = recentExpos.find((e) => e.status === 'ongoing');

  const selectedExpo = recentExpos.find((e) => e._id === selectedExpoId) ?? null;

  function handleRowClick(expoId: string) {
    setSelectedExpoId((prev) => (prev === expoId ? null : expoId));
  }

  // ── Shared class fragments ─────────────────────────────────────────────────
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

          {/* Live Ongoing Expo Highlight */}
          {ongoingExpo && (
            <LiveEventBanner
              expoId={ongoingExpo._id}
              expoName={ongoingExpo.name}
              startDate={ongoingExpo.startDate}
              endDate={ongoingExpo.endDate}
              role="organizer"
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
                Welcome, {user?.fullName ?? 'Organizer'}!
              </h2>
              <p
                className={`text-sm-token mt-xs-token ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                Overview of your expos, registrations, and check-in activity
              </p>
            </div>

            {/* Quick-action buttons */}
            <div className="flex flex-wrap items-center gap-sm-token">
              <button
                type="button"
                onClick={() => navigate('/organizer/analytics')}
                className={`${secondaryBtnBase} ${isDarkMode ? secondaryBtnDark : secondaryBtnLight}`}
              >
                <BarChart3 className="w-4 h-4" aria-hidden />
                Reports & Analytics
              </button>
              <button
                type="button"
                onClick={() => navigate('/organizer/expos')}
                className={`${secondaryBtnBase} ${isDarkMode ? secondaryBtnDark : secondaryBtnLight}`}
              >
                <CalendarDays className="w-4 h-4" aria-hidden />
                Manage expos
              </button>
              <button
                type="button"
                onClick={() => navigate('/organizer/scanner')}
                className={`${secondaryBtnBase} ${isDarkMode ? secondaryBtnDark : secondaryBtnLight}`}
              >
                <ScanLine className="w-4 h-4" aria-hidden />
                Scanner
              </button>
            </div>
          </div>

          {/* 2. Stats panel */}
          <div className="mb-lg-token">
            <OrganizerStatsPanel />
          </div>

          {/* 2b. Aggregate Booth Occupancy Donut Chart */}
          {stats && (
            <div className="mb-xl-token max-w-2xl">
              <ChartWrapper
                title="Overall Booth Occupancy"
                subtitle="Aggregate booth allocation across all active expos"
                minHeight={260}
              >
                {(() => {
                  const total = stats.totalBooths ?? 0;
                  const occupied = stats.occupiedBooths ?? Math.round((total * (stats.aggregateBoothFillRate || 0)) / 100);
                  const available = Math.max(0, total - occupied);

                  const chartData = [
                    { name: 'Occupied', value: occupied, color: isDarkMode ? '#FF4D2E' : '#E03D1E' },
                    { name: 'Available', value: available, color: isDarkMode ? '#2A2A30' : '#E2E0D8' },
                  ];

                  return (
                    <div className="flex flex-col gap-md-token">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-lg-token">
                        {/* Donut Chart */}
                        <div className="w-full sm:w-1/2 h-[180px] relative flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: isDarkMode ? '#1C1C20' : '#FFFFFF',
                                  borderColor: isDarkMode ? '#3A3A42' : '#E2E0D8',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                }}
                              />
                              <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={52}
                                outerRadius={76}
                                paddingAngle={total > 0 ? 3 : 0}
                                dataKey="value"
                              >
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          {/* Inner Centered Percentage */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span
                              className={`text-xl-token font-bold leading-none ${
                                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                              }`}
                            >
                              {stats.aggregateBoothFillRate.toFixed(0)}%
                            </span>
                            <span
                              className={`text-[10px] uppercase font-semibold tracking-wider mt-0.5 ${
                                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                              }`}
                            >
                              Filled
                            </span>
                          </div>
                        </div>

                        {/* Breakdown & Legend */}
                        <div className="flex flex-col justify-center sm:w-1/2 gap-sm-token w-full">
                          <div className="flex items-center justify-between p-xs-token px-sm-token rounded-md-token border border-border-base-dark/30">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: chartData[0].color }}
                              />
                              <span
                                className={`text-xs-token font-medium ${
                                  isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                                }`}
                              >
                                Occupied
                              </span>
                            </div>
                            <span
                              className={`text-xs-token font-bold ${
                                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                              }`}
                            >
                              {occupied} booths
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-xs-token px-sm-token rounded-md-token border border-border-base-dark/30">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: chartData[1].color }}
                              />
                              <span
                                className={`text-xs-token font-medium ${
                                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                                }`}
                              >
                                Available
                              </span>
                            </div>
                            <span
                              className={`text-xs-token font-bold ${
                                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                              }`}
                            >
                              {available} booths
                            </span>
                          </div>

                          <span
                            className={`text-[11px] text-center sm:text-left ${
                              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                            }`}
                          >
                            Across {stats.activeExpoCount} active expo{stats.activeExpoCount === 1 ? '' : 's'} ({total} total booths)
                          </span>
                        </div>
                      </div>

                      {/* Link to Full Reports & Analytics */}
                      <div className="pt-sm-token border-t border-border-base-dark/20 flex justify-end">
                        <button
                          type="button"
                          onClick={() => navigate('/organizer/analytics')}
                          className={`inline-flex items-center gap-1.5 text-xs-token font-semibold transition-colors ${
                            isDarkMode
                              ? 'text-brand-primary-dark hover:underline'
                              : 'text-brand-primary-light hover:underline'
                          }`}
                        >
                          <span>View Full Reports & Analytics</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </ChartWrapper>
            </div>
          )}

          {/* 3. Recent expos section — compact interactive card grid */}
          {recentExpos.length > 0 && (
            <section aria-label="Recent expos">
              <div className="flex items-center justify-between mb-md-token">
                <h3
                  className={`text-base-token font-semibold ${
                    isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                  }`}
                >
                  Recent Expos
                </h3>
                <span className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  Click an expo card to view detailed analytics
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md-token">
                {recentExpos.map((expo) => {
                  const isSelected = selectedExpoId === expo._id;
                  const isOngoing = expo.status === 'ongoing';

                  return (
                    <div
                      key={expo._id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={() => handleRowClick(expo._id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleRowClick(expo._id);
                        }
                      }}
                      className={`text-left p-md-token rounded-lg-token border transition-all duration-150 backdrop-blur-md cursor-pointer ${
                        isDarkMode
                          ? 'bg-glass-dark border-glass-border-dark hover:border-brand-primary-dark'
                          : 'bg-glass-light border-glass-border-light hover:border-brand-primary-light'
                      } ${
                        isSelected
                          ? isDarkMode
                            ? 'ring-2 ring-brand-primary-dark border-brand-primary-dark shadow-elevation-2-dark'
                            : 'ring-2 ring-brand-primary-light border-brand-primary-light shadow-elevation-2-light'
                          : ''
                      } ${
                        isOngoing
                          ? isDarkMode
                            ? 'border-l-4 border-l-brand-primary-dark'
                            : 'border-l-4 border-l-brand-primary-light'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-sm-token mb-sm-token">
                        <h4
                          className={`text-sm-token font-semibold line-clamp-1 ${
                            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                          }`}
                          title={expo.name}
                        >
                          {expo.name}
                        </h4>
                        <span
                          className={`text-xs-token px-2 py-0.5 rounded-full font-medium shrink-0 border ${
                            expo.status === 'published'
                              ? isDarkMode
                                ? 'bg-bg-success-dark/20 text-text-success-dark border-text-success-dark/30'
                                : 'bg-bg-success-light text-text-success-light border-text-success-light/30'
                              : expo.status === 'ongoing'
                              ? isDarkMode
                                ? 'bg-brand-primary-dark/20 text-brand-primary-dark border-brand-primary-dark/30'
                                : 'bg-brand-primary-light/20 text-brand-primary-light border-brand-primary-light/30'
                              : expo.status === 'completed'
                              ? isDarkMode
                                ? 'bg-bg-warning-dark/20 text-text-warning-dark border-text-warning-dark/30'
                                : 'bg-bg-warning-light text-text-warning-light border-text-warning-light/30'
                              : isDarkMode
                              ? 'bg-bg-hover-dark text-text-secondary-dark border-border-base-dark'
                              : 'bg-bg-hover-light text-text-secondary-light border-border-base-light'
                          }`}
                        >
                          {statusLabel(expo.status)}
                        </span>
                      </div>

                      <div className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                        {expo.startDate && expo.endDate
                          ? `${new Date(expo.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(expo.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                          : 'Dates TBD'}
                      </div>

                      <div className="mt-md-token pt-xs-token border-t border-border-base-dark/20 flex items-center justify-between">
                        <span className={`text-[11px] font-medium ${isSelected ? (isDarkMode ? 'text-brand-primary-dark font-semibold' : 'text-brand-primary-light font-semibold') : (isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light')}`}>
                          {isSelected ? 'Analytics Expanded ▲' : 'View Analytics ▼'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 4. ExpoStatCard — drill-down stats panel displayed when an expo is selected */}
              {selectedExpo && (
                <div className="mt-lg-token animate-fadeIn">
                  <ExpoStatCard expoId={selectedExpo._id} expoName={selectedExpo.name} />
                </div>
              )}
            </section>
          )}

        </main>
      </div>
      <BottomNav />
    </div>
  );
}
