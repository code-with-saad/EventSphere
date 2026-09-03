import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { BentoCard } from '../../components/common/BentoCard';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { showError } from '../../utils/toast';
import api from '../../services/api';

/**
 * AllOrganizersPage — SuperAdmin page for viewing all organizer accounts
 *
 * Features:
 * - Fetches organizers via GET /api/admin/organizers with optional ?status= filter
 * - Filter tabs: All | Pending | Active | Rejected
 * - Read-only table with status badge (no action buttons)
 * - Loading spinner, empty state, and responsive table/card-list layout
 * - All colors use design tokens; supports dark/light mode
 *
 * Validates Requirements: 11.1, 11.2
 */

type StatusFilter = 'all' | 'pending' | 'active' | 'rejected';

const FILTER_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Active', value: 'active' },
  { label: 'Rejected', value: 'rejected' },
];

interface Organizer {
  id: string;
  email: string;
  fullName: string;
  status: string;
  createdAt: string;
}

interface OrganizersResponse {
  success: boolean;
  data: {
    organizers: Organizer[];
    count: number;
    filter: string;
  };
}

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({
  status,
  isDarkMode,
}: {
  status: string;
  isDarkMode: boolean;
}) {
  const normalized = status.toLowerCase() as StatusFilter;

  const colorClass = (() => {
    switch (normalized) {
      case 'active':
        return isDarkMode
          ? 'bg-bg-success-dark text-text-success-dark'
          : 'bg-bg-success-light text-text-success-light';
      case 'rejected':
        return isDarkMode
          ? 'bg-bg-danger-dark text-text-danger-dark'
          : 'bg-bg-danger-light text-text-danger-light';
      default: // pending
        return isDarkMode
          ? 'bg-bg-warning-dark text-text-warning-dark'
          : 'bg-bg-warning-light text-text-warning-light';
    }
  })();

  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return (
    <span className={`inline-block px-2 py-0.5 rounded-sm-token text-xs-token font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export function AllOrganizersPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  // ── Fetch organizers ───────────────────────────────────────────────────
  const fetchOrganizers = useCallback(async (filter: StatusFilter) => {
    setIsLoading(true);
    try {
      const url =
        filter === 'all'
          ? '/api/admin/organizers'
          : `/api/admin/organizers?status=${filter}`;
      const response = await api.get<OrganizersResponse>(url);
      setOrganizers(response.data.data.organizers);
    } catch {
      showError('Failed to load organizers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizers(activeFilter);
  }, [activeFilter, fetchOrganizers]);

  // ── Formatting helpers ─────────────────────────────────────────────────
  const formatDate = (isoString: string) =>
    new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  // ── Spinner ────────────────────────────────────────────────────────────
  const Spinner = () => (
    <svg
      className={`animate-spin w-8 h-8 ${
        isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
      }`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  // ── Empty state subtext ────────────────────────────────────────────────
  const emptySubtext = () => {
    switch (activeFilter) {
      case 'pending':
        return 'No pending organizers at this time.';
      case 'active':
        return 'No active organizers at this time.';
      case 'rejected':
        return 'No rejected organizers at this time.';
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
      <div className="mb-lg-token">
        <h1
          className={`text-xl-token font-semibold mb-xs-token ${
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
          Complete view of all organizer accounts
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-sm-token flex-wrap mb-lg-token" role="tablist" aria-label="Filter organizers by status">
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.value;
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveFilter(tab.value)}
              className={`
                px-md-token py-sm-token
                rounded-lg-token
                text-sm-token font-medium
                border transition-colors
                focus:outline-none focus:ring-2 focus:ring-offset-2
                ${
                  isActive
                    ? isDarkMode
                      ? 'bg-brand-primary-dark text-text-on-primary-dark border-brand-primary-dark focus:ring-brand-primary-dark focus:ring-offset-bg-base-dark'
                      : 'bg-brand-primary-light text-text-on-primary-dark border-brand-primary-light focus:ring-brand-primary-light focus:ring-offset-bg-base-light'
                    : isDarkMode
                    ? 'border-border-base-dark text-text-secondary-dark hover:bg-bg-hover-dark focus:ring-brand-primary-dark focus:ring-offset-bg-base-dark'
                    : 'border-border-base-light text-text-secondary-light hover:bg-bg-hover-light focus:ring-brand-primary-light focus:ring-offset-bg-base-light'
                }
              `}
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
            <Spinner />
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
            {/* Users / inbox icon */}
            <svg
              className={`w-16 h-16 ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
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
                    {(['Email', 'Full Name', 'Status', 'Registration Date'] as const).map(
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
                        className={`py-md-token pr-md-token text-sm-token ${
                          isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                        }`}
                      >
                        {organizer.email}
                      </td>
                      <td
                        className={`py-md-token pr-md-token text-sm-token ${
                          isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                        }`}
                      >
                        {organizer.fullName}
                      </td>
                      <td className="py-md-token pr-md-token">
                        <StatusBadge status={organizer.status} isDarkMode={isDarkMode} />
                      </td>
                      <td
                        className={`py-md-token text-sm-token ${
                          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                        }`}
                      >
                        {formatDate(organizer.createdAt)}
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
                    className={`text-xs-token ${
                      isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                    }`}
                  >
                    Registered: {formatDate(organizer.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </BentoCard>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export default AllOrganizersPage;
