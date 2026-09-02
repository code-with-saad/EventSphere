import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ScanLine } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganizerStats } from '../../hooks/useOrganizerStats';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { BentoCard } from '../../components/common/BentoCard';
import { OrganizerStatsPanel } from '../../components/dashboard/OrganizerStatsPanel';
import { ExpoStatCard } from '../../components/dashboard/ExpoStatCard';
import PendingApprovalScreen from '../../components/dashboard/PendingApprovalScreen';

// ── Inline status text color — mirrors ExpoStatusBadge logic without the pill ─

type ExpoStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';

function statusTextClass(status: ExpoStatus, isDarkMode: boolean): string {
  switch (status) {
    case 'published':
      return isDarkMode ? 'text-text-success-dark' : 'text-text-success-light';
    case 'ongoing':
      return isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light';
    case 'completed':
      return isDarkMode ? 'text-text-warning-dark' : 'text-text-warning-light';
    case 'archived':
      return isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light';
    case 'draft':
    default:
      return isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light';
  }
}

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

  const selectedExpo = recentExpos.find((e) => e._id === selectedExpoId) ?? null;

  function handleRowClick(expoId: string) {
    setSelectedExpoId((prev) => (prev === expoId ? null : expoId));
  }

  function handleRowKeyDown(e: React.KeyboardEvent<HTMLLIElement>, expoId: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick(expoId);
    }
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

  const dividerClass = isDarkMode ? 'border-border-base-dark' : 'border-border-base-light';

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Dashboard" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">

          {/* 1. Welcome heading */}
          <h2
            className={`text-xl-token font-semibold mb-lg-token leading-tight-token ${
              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
            }`}
          >
            Welcome, {user?.fullName ?? 'Organizer'}!
          </h2>

          {/* 2. Quick-action buttons */}
          <div className="flex flex-wrap gap-sm-token mb-lg-token">
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

          {/* 3. Stats panel */}
          <div className="mb-lg-token">
            <OrganizerStatsPanel />
          </div>

          {/* 4. Recent expos section */}
          {recentExpos.length > 0 && (
            <section aria-label="Recent expos">
              <h3
                className={`text-base-token font-semibold mb-sm-token ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                Recent expos
              </h3>

              <BentoCard>
                <ul role="list">
                  {recentExpos.map((expo, index) => {
                    const isLast = index === recentExpos.length - 1;
                    const isSelected = selectedExpoId === expo._id;

                    return (
                      <li
                        key={expo._id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => handleRowClick(expo._id)}
                        onKeyDown={(e) => handleRowKeyDown(e, expo._id)}
                        className={[
                          'flex justify-between items-center py-sm-token cursor-pointer',
                          'transition-colors duration-[120ms] rounded-sm-token px-xs-token -mx-xs-token',
                          isDarkMode ? 'hover:bg-bg-hover-dark' : 'hover:bg-bg-hover-light',
                          isSelected
                            ? isDarkMode
                              ? 'bg-bg-hover-dark'
                              : 'bg-bg-hover-light'
                            : '',
                          !isLast ? `border-b ${dividerClass}` : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {/* Expo name */}
                        <span
                          className={`text-sm-token font-medium leading-normal-token ${
                            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                          }`}
                        >
                          {expo.name}
                        </span>

                        {/* Status label */}
                        <span
                          className={`text-xs-token ${statusTextClass(
                            expo.status,
                            isDarkMode
                          )}`}
                        >
                          {statusLabel(expo.status)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </BentoCard>

              {/* 5. ExpoStatCard — shown inline below the list when an expo is selected */}
              {selectedExpo && (
                <div className="mt-md-token">
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
