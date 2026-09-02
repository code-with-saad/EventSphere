import { useNavigate } from 'react-router-dom';
import { CalendarDays, Users, ScanLine, Store } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useOrganizerStats } from '../../hooks/useOrganizerStats';
import { BentoCard } from '../common/BentoCard';

// ── Skeleton shimmer block ────────────────────────────────────────────────────

function StatSkeleton({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <BentoCard>
      <div className="flex flex-col gap-md-token animate-pulse">
        {/* icon + label row */}
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
        {/* value placeholder */}
        <div
          className={`h-8 w-16 rounded-md-token ${
            isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'
          }`}
        />
      </div>
    </BentoCard>
  );
}

// ── Individual stat card ──────────────────────────────────────────────────────

interface StatItem {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

function StatCard({ label, value, icon: Icon, isDarkMode }: StatItem & { isDarkMode: boolean }) {
  return (
    <BentoCard>
      <div className="flex flex-col gap-md-token">
        {/* icon + label */}
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
        {/* numeric value */}
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

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ isDarkMode }: { isDarkMode: boolean }) {
  const navigate = useNavigate();

  return (
    <BentoCard>
      <div className="flex flex-col items-center text-center py-xl-token gap-md-token">
        {/* Icon container */}
        <div
          className={`w-16 h-16 rounded-xl-token flex items-center justify-center ${
            isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'
          }`}
        >
          <CalendarDays
            className={`w-8 h-8 ${
              isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
            }`}
            aria-hidden
          />
        </div>

        {/* Heading */}
        <h3
          className={`text-base-token font-semibold leading-tight-token ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}
        >
          No active expos yet
        </h3>

        {/* Explanation */}
        <p
          className={`text-sm-token leading-normal-token max-w-xs ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}
        >
          Create your first expo to start tracking attendees, check-ins, and booth occupancy.
        </p>

        {/* CTA — one filled accent button per REQ-10.6 */}
        <button
          type="button"
          onClick={() => navigate('/organizer/expos/new')}
          className={`
            mt-sm-token px-md-token py-sm-token rounded-md-token
            text-sm-token font-medium
            transition-colors duration-150
            ${
              isDarkMode
                ? 'bg-brand-primary-dark text-accent-bg-dark hover:bg-accent-hover-dark'
                : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light'
            }
          `}
        >
          Create your first expo
        </button>
      </div>
    </BentoCard>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * OrganizerStatsPanel
 *
 * Aggregated overview cards for the organizer dashboard.
 * Refreshes automatically every 60 s via useOrganizerStats().
 *
 * States:
 *   loading  → 4 shimmer skeleton BentoCards
 *   error    → error message in secondary text
 *   empty    → REQ-10.6 empty state with CTA
 *   stats    → 4 stat cards (active expos, attendees, check-ins, booth fill rate)
 */
export function OrganizerStatsPanel() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { stats, loading, error } = useOrganizerStats();

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md-token">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatSkeleton key={i} isDarkMode={isDarkMode} />
        ))}
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <BentoCard>
        <p
          className={`text-sm-token leading-normal-token ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}
        >
          {error}. Refresh the page to try again.
        </p>
      </BentoCard>
    );
  }

  // ── Empty state (REQ-10.6) ────────────────────────────────────────────────
  if (!stats || stats.activeExpoCount === 0) {
    return <EmptyState isDarkMode={isDarkMode} />;
  }

  // ── Stats grid ────────────────────────────────────────────────────────────
  const statItems: StatItem[] = [
    {
      label: 'Active expos',
      value: String(stats.activeExpoCount),
      icon: CalendarDays,
    },
    {
      label: 'Total attendees',
      value: stats.totalAttendees.toLocaleString(),
      icon: Users,
    },
    {
      label: 'Check-ins',
      value: stats.totalCheckIns.toLocaleString(),
      icon: ScanLine,
    },
    {
      label: 'Booth fill rate',
      value: `${stats.aggregateBoothFillRate.toFixed(1)}%`,
      icon: Store,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md-token">
      {statItems.map((item) => (
        <StatCard key={item.label} {...item} isDarkMode={isDarkMode} />
      ))}
    </div>
  );
}
