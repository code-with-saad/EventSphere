import { useNavigate } from 'react-router-dom';
import { Calendar, Store, Edit3, XCircle, MessageSquare } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ApplicationStatusBadge from './ApplicationStatusBadge';

interface ExhibitorApplicationCardProps {
  application: {
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
    venueName?: string;
    venueMapUrl?: string;
  };
  onWithdraw?: (target: { expoId: string; appId: string }) => void;
  onOpenMessages?: (application: any) => void;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ExhibitorApplicationCard({
  application,
  onWithdraw,
  onOpenMessages,
}: ExhibitorApplicationCardProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const navigate = useNavigate();

  const isApproved = application.status === 'approved';
  const isPending = application.status === 'pending';
  const isWithdrawn = application.status === 'withdrawn';
  const isRejected = application.status === 'rejected';

  const actionBtnClass = `flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md-token text-xs-token font-medium border transition-colors ${
    isDarkMode
      ? 'border-border-base-dark text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark hover:border-border-strong-dark'
      : 'border-border-base-light text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light hover:border-border-strong-light'
  }`;

  return (
    <div
      className={`group relative flex flex-col rounded-lg-token overflow-hidden transition-all duration-200 backdrop-blur-md ${
        isDarkMode
          ? 'bg-glass-dark border border-glass-border-dark hover:border-border-strong-dark shadow-elevation-1-dark'
          : 'bg-glass-light border border-glass-border-light hover:border-border-strong-light shadow-elevation-1-light'
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
          : isWithdrawn
          ? 'opacity-60'
          : ''
      }`}
    >
      {/* Header Row: Expo Name & Status Badge */}
      <div
        className={`relative w-full p-md-token pb-sm-token flex items-start justify-between gap-sm-token border-b ${
          isDarkMode ? 'border-border-base-dark/30 bg-bg-surface-dark/40' : 'border-border-base-light/30 bg-bg-surface-light/40'
        }`}
      >
        <div className="flex flex-col flex-1 min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/expos/${application.expoId}`)}
            className={`text-left text-base-token font-semibold hover:underline truncate transition-colors ${
              isDarkMode ? 'text-text-primary-dark hover:text-brand-primary-dark' : 'text-text-primary-light hover:text-brand-primary-light'
            }`}
            title={application.expoName ?? 'View Expo'}
          >
            {application.expoName ?? 'Expo Application'}
          </button>
          <span
            className={`text-xs-token font-medium truncate mt-0.5 ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}
          >
            {application.companyName} · {application.category}
          </span>
        </div>

        <div className="shrink-0 flex items-center">
          <ApplicationStatusBadge status={application.status} />
        </div>
      </div>

      {/* Card Body */}
      <div className="flex-1 flex flex-col p-md-token gap-sm-token">
        {/* Submitted date & Schedule */}
        <div className="flex flex-col gap-1.5 text-xs-token">
          <div
            className={`flex items-center gap-1.5 ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>Submitted {formatDate(application.submittedAt)}</span>
          </div>

          {application.startDate && (
            <div
              className={`flex items-center gap-1.5 ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span>Event Date: {formatDate(application.startDate)}</span>
            </div>
          )}
        </div>

        {/* Booth assignment badge if approved */}
        {application.boothLabel && (
          <div className="mt-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs-token font-semibold border shadow-sm ${
                isDarkMode
                  ? 'bg-bg-success-dark/30 text-text-success-dark border-text-success-dark/40'
                  : 'bg-bg-success-light text-text-success-light border-text-success-light/40'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Booth: {application.boothLabel}</span>
            </span>
          </div>
        )}

        {/* Action strip at bottom */}
        <div className="mt-auto pt-sm-token border-t border-border-base-dark/30 flex items-center gap-2">
          {onOpenMessages && (
            <button
              type="button"
              onClick={() => onOpenMessages(application)}
              className={actionBtnClass}
              title="Open Messages"
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>Discussion</span>
            </button>
          )}
          
          {isPending && (
            <>
              <button
                type="button"
                onClick={() =>
                  navigate(`/expos/${application.expoId}/apply`, {
                    state: { editing: true, applicationId: application._id },
                  })
                }
                className={actionBtnClass}
                title="Edit Application"
              >
                <Edit3 className="w-3.5 h-3.5 shrink-0" />
                <span>Edit</span>
              </button>

              {onWithdraw && (
                <button
                  type="button"
                  onClick={() =>
                    onWithdraw({ expoId: application.expoId, appId: application._id })
                  }
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md-token text-xs-token font-medium border transition-colors ${
                    isDarkMode
                      ? 'border-text-danger-dark text-text-danger-dark hover:bg-bg-danger-dark'
                      : 'border-text-danger-light text-text-danger-light hover:bg-bg-danger-light'
                  }`}
                  title="Withdraw Application"
                >
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Withdraw</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Approved auxiliary links (e.g. Venue Map) */}
        {isApproved && application.venueMapUrl && (
          <div className="mt-auto pt-sm-token border-t border-border-base-dark/30 flex items-center justify-end">
            <a
              href={application.venueMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs-token underline transition-colors ${
                isDarkMode ? 'text-brand-primary-dark hover:opacity-80' : 'text-brand-primary-light hover:opacity-80'
              }`}
            >
              View Venue Map
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
