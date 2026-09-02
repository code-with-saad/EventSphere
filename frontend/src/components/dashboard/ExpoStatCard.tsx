import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { statsService } from '../../services/statsService';
import { BentoCard } from '../common/BentoCard';

// ── Data shape ────────────────────────────────────────────────────────────────

interface ExpoStatsDTO {
  totalApplications: number;
  pendingApplications: number;
  approvedExhibitors: number;
  rejectedApplications: number;
  totalAttendees: number;
  confirmedCheckIns: number;
  boothFillRate: number; // 0–100
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ExpoStatCardProps {
  expoId: string;
  expoName: string;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ExpoStatSkeleton({ isDarkMode }: { isDarkMode: boolean }) {
  const shimmer = isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light';
  return (
    <BentoCard>
      <div className="flex flex-col gap-md-token animate-pulse">
        {/* title */}
        <div className={`h-4 w-40 rounded-sm-token ${shimmer}`} />
        {/* grid placeholder */}
        <div className="grid grid-cols-2 gap-sm-token">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-xs-token">
              <div className={`h-3 w-20 rounded-sm-token ${shimmer}`} />
              <div className={`h-5 w-12 rounded-sm-token ${shimmer}`} />
            </div>
          ))}
        </div>
        {/* progress bar track */}
        <div className={`h-1.5 w-full rounded-full ${shimmer}`} />
      </div>
    </BentoCard>
  );
}

// ── Stat cell ─────────────────────────────────────────────────────────────────

interface StatCellProps {
  label: string;
  value: string;
  valueClass: string;
  isDarkMode: boolean;
}

function StatCell({ label, value, valueClass, isDarkMode }: StatCellProps) {
  return (
    <div className="flex flex-col gap-xs-token">
      <span
        className={`text-xs-token leading-normal-token ${
          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
        }`}
      >
        {label}
      </span>
      <span className={`text-base-token font-semibold leading-tight-token ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * ExpoStatCard
 *
 * Per-expo stats breakdown: applications by status, registrations,
 * check-ins, booth fill rate, and a fill-rate progress bar.
 *
 * Fetches data independently via statsService.getExpoStats(expoId).
 */
export function ExpoStatCard({ expoId, expoName }: ExpoStatCardProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [stats, setStats] = useState<ExpoStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    statsService
      .getExpoStats(expoId)
      .then((data: ExpoStatsDTO) => {
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid stats received');
        }
        setStats(data);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : (err as { response?: { data?: { message?: string } } })?.response?.data
                ?.message ?? 'Failed to load expo stats';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [expoId]);

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return <ExpoStatSkeleton isDarkMode={isDarkMode} />;
  }

  // ── Error / Fallback Card ────────────────────────────────────────────────
  if (error || !stats) {
    return (
      <BentoCard>
        <h3
          className={`text-base-token font-semibold mb-sm-token ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}
        >
          {expoName}
        </h3>
        <p
          className={`text-sm-token leading-normal-token ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}
        >
          {error ?? 'Stats unavailable.'}
        </p>
      </BentoCard>
    );
  }

  // ── Fill rate bar width, capped at 100% ─────────────────────────────────
  const fillPct = Math.min(100, Math.max(0, stats.boothFillRate ?? 0));

  // ── Token class helpers ──────────────────────────────────────────────────
  const warningVal = isDarkMode ? 'text-text-warning-dark' : 'text-text-warning-light';
  const successVal = isDarkMode ? 'text-text-success-dark' : 'text-text-success-light';
  const dangerVal  = isDarkMode ? 'text-text-danger-dark'  : 'text-text-danger-light';
  const primaryVal = isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light';
  const brandVal   = isDarkMode ? 'text-brand-primary-dark': 'text-brand-primary-light';

  const statCells: StatCellProps[] = [
    {
      label: 'Pending',
      value: (stats.pendingApplications ?? 0).toLocaleString(),
      valueClass: warningVal,
      isDarkMode,
    },
    {
      label: 'Approved',
      value: (stats.approvedExhibitors ?? 0).toLocaleString(),
      valueClass: successVal,
      isDarkMode,
    },
    {
      label: 'Rejected',
      value: (stats.rejectedApplications ?? 0).toLocaleString(),
      valueClass: dangerVal,
      isDarkMode,
    },
    {
      label: 'Registrations',
      value: (stats.totalAttendees ?? 0).toLocaleString(),
      valueClass: primaryVal,
      isDarkMode,
    },
    {
      label: 'Check-ins',
      value: (stats.confirmedCheckIns ?? 0).toLocaleString(),
      valueClass: primaryVal,
      isDarkMode,
    },
    {
      label: 'Booth fill rate',
      value: `${fillPct.toFixed(1)}%`,
      valueClass: brandVal,
      isDarkMode,
    },
  ];

  return (
    <BentoCard>
      {/* Header */}
      <h3
        className={`text-base-token font-semibold leading-tight-token mb-md-token ${
          isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
        }`}
      >
        {expoName}
      </h3>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-sm-token mb-md-token">
        {statCells.map((cell) => (
          <StatCell key={cell.label} {...cell} />
        ))}
      </div>

      {/* Booth fill rate progress bar */}
      <div
        className={`w-full h-1.5 rounded-full overflow-hidden ${
          isDarkMode ? 'bg-border-base-dark' : 'bg-border-base-light'
        }`}
        role="progressbar"
        aria-valuenow={fillPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Booth fill rate: ${fillPct.toFixed(1)}%`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            isDarkMode ? 'bg-brand-primary-dark' : 'bg-brand-primary-light'
          }`}
          style={{ width: `${fillPct}%` }}
        />
      </div>
    </BentoCard>
  );
}
