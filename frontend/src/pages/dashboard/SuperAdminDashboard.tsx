import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Users, FileText, ScanLine, CheckCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { statsService } from '../../services/statsService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { BentoCard } from '../../components/common/BentoCard';
import ExpoStatusBadge from '../../components/expo/ExpoStatusBadge';

// ── Types ─────────────────────────────────────────────────────────────────────

type ExpoStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';

interface RecentExpo {
  _id: string;
  name: string;
  organizerName: string;
  status: ExpoStatus;
  createdAt: string;
}

interface SuperAdminStats {
  totalExpos: number;
  totalAttendees: number;
  totalApplications: number;
  totalCheckIns: number;
  recentExpos: RecentExpo[];
}

// ── Skeleton shimmer ──────────────────────────────────────────────────────────

function StatSkeleton({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <BentoCard>
      <div className="flex flex-col gap-md-token animate-pulse">
        <div className="flex items-center gap-sm-token">
          <div
            className={`w-6 h-6 rounded-md-token ${
              isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'
            }`}
          />
          <div
            className={`h-3 w-24 rounded-sm-token ${
              isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'
            }`}
          />
        </div>
        <div
          className={`h-8 w-16 rounded-md-token ${
            isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'
          }`}
        />
      </div>
    </BentoCard>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  isDarkMode: boolean;
}

function StatCard({ label, value, icon: Icon, isDarkMode }: StatCardProps) {
  return (
    <BentoCard>
      <div className="flex flex-col gap-md-token">
        <div className="flex items-center gap-sm-token">
          <Icon
            className={`w-6 h-6 flex-shrink-0 ${
              isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
            }`}
            aria-hidden
          />
          <span
            className={`text-sm-token leading-normal-token ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}
          >
            {label}
          </span>
        </div>
        <span
          className={`text-2xl-token font-bold leading-tight-token ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}
        >
          {value}
        </span>
      </div>
    </BentoCard>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    statsService
      .getSuperAdminDashboard()
      .then((data: SuperAdminStats) => {
        setStats(data);
        setError(null);
      })
      .catch((err: any) => {
        setError(
          err?.response?.data?.message || err?.message || 'Failed to load platform stats'
        );
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Shared class fragments ─────────────────────────────────────────────────
  const dividerClass = isDarkMode ? 'border-border-base-dark' : 'border-border-base-light';

  const iconCls = `w-8 h-8 ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`;

  // ── Stat card definitions ──────────────────────────────────────────────────
  const statItems: StatCardProps[] = [
    {
      label: 'Total expos',
      value: stats ? stats.totalExpos.toLocaleString() : '—',
      icon: CalendarDays,
      isDarkMode,
    },
    {
      label: 'Total attendees',
      value: stats ? stats.totalAttendees.toLocaleString() : '—',
      icon: Users,
      isDarkMode,
    },
    {
      label: 'Total applications',
      value: stats ? stats.totalApplications.toLocaleString() : '—',
      icon: FileText,
      isDarkMode,
    },
    {
      label: 'Total check-ins',
      value: stats ? stats.totalCheckIns.toLocaleString() : '—',
      icon: ScanLine,
      isDarkMode,
    },
  ];

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Dashboard" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">

          {/* Welcome heading */}
          <h2
            className={`text-xl-token font-semibold mb-lg-token leading-tight-token ${
              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
            }`}
          >
            Welcome, {user?.fullName ?? 'Admin'}!
          </h2>

          {/* 64a — Platform-wide stats (REQ-11.1) */}
          <section aria-label="Platform statistics" className="mb-lg-token">
            <h3
              className={`text-base-token font-semibold mb-sm-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              Platform overview
            </h3>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md-token">
                {Array.from({ length: 4 }).map((_, i) => (
                  <StatSkeleton key={i} isDarkMode={isDarkMode} />
                ))}
              </div>
            ) : error ? (
              <BentoCard>
                <p
                  className={`text-sm-token leading-normal-token ${
                    isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                  }`}
                >
                  {error}. Refresh the page to try again.
                </p>
              </BentoCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md-token">
                {statItems.map((item) => (
                  <StatCard key={item.label} {...item} />
                ))}
              </div>
            )}
          </section>

          {/* 64b — Recent expos table (REQ-11.2) */}
          {!loading && !error && stats && stats.recentExpos.length > 0 && (
            <section aria-label="Recent expos" className="mb-lg-token">
              <h3
                className={`text-base-token font-semibold mb-sm-token ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                Recent expos
              </h3>

              <BentoCard className="overflow-hidden p-0 md:p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm-token border-collapse">
                    <thead>
                      <tr
                        className={`border-b ${dividerClass} ${
                          isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'
                        }`}
                      >
                        {['Name', 'Organizer', 'Status', 'Created'].map((heading) => (
                          <th
                            key={heading}
                            scope="col"
                            className={`px-md-token py-sm-token text-left font-medium text-xs-token uppercase tracking-wide ${
                              isDarkMode
                                ? 'text-text-secondary-dark'
                                : 'text-text-secondary-light'
                            }`}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentExpos.map((expo, index) => {
                        const isLast = index === stats.recentExpos.length - 1;
                        return (
                          <tr
                            key={expo._id}
                            className={[
                              !isLast ? `border-b ${dividerClass}` : '',
                              'transition-colors duration-[120ms]',
                              isDarkMode
                                ? 'hover:bg-bg-hover-dark'
                                : 'hover:bg-bg-hover-light',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {/* Name */}
                            <td
                              className={`px-md-token py-sm-token font-medium leading-normal-token ${
                                isDarkMode
                                  ? 'text-text-primary-dark'
                                  : 'text-text-primary-light'
                              }`}
                            >
                              {expo.name}
                            </td>

                            {/* Organizer */}
                            <td
                              className={`px-md-token py-sm-token leading-normal-token ${
                                isDarkMode
                                  ? 'text-text-secondary-dark'
                                  : 'text-text-secondary-light'
                              }`}
                            >
                              {expo.organizerName}
                            </td>

                            {/* Status */}
                            <td className="px-md-token py-sm-token">
                              <ExpoStatusBadge status={expo.status} />
                            </td>

                            {/* Created at */}
                            <td
                              className={`px-md-token py-sm-token leading-normal-token ${
                                isDarkMode
                                  ? 'text-text-muted-dark'
                                  : 'text-text-muted-light'
                              }`}
                            >
                              {new Date(expo.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </BentoCard>
            </section>
          )}

          {/* Action tiles — retained from original */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md-token items-stretch">
            <div
              onClick={() => navigate('/admin/approvals')}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/approvals')}
              aria-label="Navigate to Organizer Approvals"
            >
              <BentoCard hover>
                <div className="flex flex-col gap-sm-token">
                  <CheckCircle className={iconCls} aria-hidden="true" />
                  <h3
                    className={`text-base-token font-semibold leading-tight-token ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}
                  >
                    Organizer approvals
                  </h3>
                  <p
                    className={`text-sm-token leading-normal-token ${
                      isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                    }`}
                  >
                    Review and approve pending organizer accounts
                  </p>
                </div>
              </BentoCard>
            </div>

            <div
              onClick={() => navigate('/admin/organizers')}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/organizers')}
              aria-label="Navigate to All Organizers"
            >
              <BentoCard hover>
                <div className="flex flex-col gap-sm-token">
                  <Users className={iconCls} aria-hidden="true" />
                  <h3
                    className={`text-base-token font-semibold leading-tight-token ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}
                  >
                    All organizers
                  </h3>
                  <p
                    className={`text-sm-token leading-normal-token ${
                      isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                    }`}
                  >
                    View all registered organizers
                  </p>
                </div>
              </BentoCard>
            </div>
          </div>

        </main>
      </div>
      <BottomNav />
    </div>
  );
}
