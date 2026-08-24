import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { BentoCard } from '../../components/common';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { showSuccess, showError } from '../../utils/toast';
import api from '../../services/api';

/**
 * AdminApprovalsPage — SuperAdmin page for reviewing pending Organizer registrations
 *
 * Features:
 * - Fetches pending organizers via GET /api/admin/pending-organizers on mount
 * - Approve: PATCH /api/admin/organizers/:id/approve
 * - Reject: DELETE /api/admin/organizers/:id/reject (with inline confirmation)
 * - Loading spinner, empty state, and responsive table/card-list layout
 * - All colors use design tokens; supports dark/light mode
 *
 * Validates Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8
 */

interface PendingOrganizer {
  id: string;
  email: string;
  fullName: string;
  status: string;
  createdAt: string;
}

interface PendingOrganizersResponse {
  success: boolean;
  data: {
    organizers: PendingOrganizer[];
    count: number;
  };
}

export function AdminApprovalsPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [organizers, setOrganizers] = useState<PendingOrganizer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<PendingOrganizer | null>(null);

  // ── Fetch pending organizers ─────────────────────────────────────────────
  const fetchOrganizers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get<PendingOrganizersResponse>(
        '/api/admin/pending-organizers'
      );
      setOrganizers(response.data.data.organizers);
    } catch {
      showError('Failed to load pending organizers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizers();
  }, [fetchOrganizers]);

  // ── Approve action ───────────────────────────────────────────────────────
  const handleApprove = async (organizer: PendingOrganizer) => {
    setActionLoadingId(organizer.id);
    try {
      await api.patch(`/api/admin/organizers/${organizer.id}/approve`);
      showSuccess('Organizer approved successfully');
      await fetchOrganizers();
    } catch {
      showError('Failed to approve organizer');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Reject action ────────────────────────────────────────────────────────
  const handleRejectConfirm = async () => {
    if (!confirmReject) return;
    const target = confirmReject;
    setActionLoadingId(target.id);
    setConfirmReject(null);
    try {
      await api.delete(`/api/admin/organizers/${target.id}/reject`);
      showSuccess('Organizer rejected and account removed');
      await fetchOrganizers();
    } catch {
      showError('Failed to reject organizer');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── Formatting helpers ───────────────────────────────────────────────────
  const formatDate = (isoString: string) =>
    new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  // ── Spinner ──────────────────────────────────────────────────────────────
  const Spinner = ({ small = false }: { small?: boolean }) => (
    <svg
      className={`animate-spin ${small ? 'w-4 h-4' : 'w-8 h-8'} ${
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

  // ── Action buttons for a row ─────────────────────────────────────────────
  const RowActions = ({ organizer }: { organizer: PendingOrganizer }) => {
    const isRowLoading = actionLoadingId === organizer.id;
    const isConfirming = confirmReject?.id === organizer.id;

    if (isRowLoading) {
      return (
        <div className="flex items-center gap-2" aria-busy="true">
          <Spinner small />
          <span
            className={`text-xs-token ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}
          >
            Processing…
          </span>
        </div>
      );
    }

    if (isConfirming) {
      return (
        <div className="flex flex-col gap-1">
          <p
            className={`text-xs-token mb-1 ${
              isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
            }`}
          >
            This action will reject the application and cannot be undone.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRejectConfirm}
              className={`px-3 py-1.5 rounded-md-token text-xs-token font-semibold text-text-on-primary-dark transition-colors ${
                isDarkMode
                  ? 'bg-bg-danger-dark hover:opacity-90 text-text-danger-dark border border-text-danger-dark'
                  : 'bg-bg-danger-light hover:opacity-90 text-text-danger-light border border-text-danger-light'
              }`}
              aria-label={`Confirm rejection of ${organizer.fullName}`}
            >
              Confirm Reject
            </button>
            <button
              onClick={() => setConfirmReject(null)}
              className={`px-3 py-1.5 rounded-md-token text-xs-token font-medium border transition-colors ${
                isDarkMode
                  ? 'border-border-base-dark text-text-secondary-dark hover:bg-bg-hover-dark'
                  : 'border-border-base-light text-text-secondary-light hover:bg-bg-hover-light'
              }`}
              aria-label="Cancel rejection"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleApprove(organizer)}
          disabled={actionLoadingId !== null}
          className={`px-3 py-1.5 rounded-md-token text-xs-token font-semibold text-text-on-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isDarkMode
              ? 'bg-bg-success-dark hover:opacity-90 text-text-success-dark border border-text-success-dark'
              : 'bg-bg-success-light hover:opacity-90 text-text-success-light border border-text-success-light'
          }`}
          aria-label={`Approve ${organizer.fullName}`}
        >
          Approve
        </button>
        <button
          onClick={() => setConfirmReject(organizer)}
          disabled={actionLoadingId !== null}
          className={`px-3 py-1.5 rounded-md-token text-xs-token font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isDarkMode
              ? 'bg-bg-danger-dark hover:opacity-90 text-text-danger-dark border border-text-danger-dark'
              : 'bg-bg-danger-light hover:opacity-90 text-text-danger-light border border-text-danger-light'
          }`}
          aria-label={`Reject ${organizer.fullName}`}
        >
          Reject
        </button>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'}`}>
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Organizer Approvals" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">
      {/* Page header */}
      <div className="mb-lg-token">
        <h1
          className={`text-xl-token font-semibold mb-xs-token ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}
        >
          Organizer Approvals
        </h1>
        <p
          className={`text-sm-token ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}
        >
          Review and manage pending organizer registrations
        </p>
      </div>

      {/* Content card */}
      <BentoCard>
        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-xxl-token gap-4" aria-busy="true">
            <Spinner />
            <p
              className={`text-sm-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              Loading pending organizers…
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && organizers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-xxl-token gap-4 text-center">
            {/* Checkmark / inbox icon */}
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h2
                className={`text-lg-token font-semibold mb-xs-token ${
                  isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                }`}
              >
                No Pending Organizers
              </h2>
              <p
                className={`text-sm-token ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                All organizer applications have been reviewed.
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
                    {(['Email', 'Full Name', 'Registration Date', 'Actions'] as const).map(
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
                      <td
                        className={`py-md-token pr-md-token text-sm-token ${
                          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                        }`}
                      >
                        {formatDate(organizer.createdAt)}
                      </td>
                      <td className="py-md-token">
                        <RowActions organizer={organizer} />
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
                  <p
                    className={`text-sm-token font-semibold mb-xs-token ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}
                  >
                    {organizer.fullName}
                  </p>
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
                  <RowActions organizer={organizer} />
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

export default AdminApprovalsPage;
