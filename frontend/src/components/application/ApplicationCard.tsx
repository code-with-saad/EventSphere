import { useTheme } from '../../contexts/ThemeContext';
import { Link } from 'react-router-dom';
import ApplicationStatusBadge from './ApplicationStatusBadge';

interface ApplicationCardProps {
  application: {
    _id: string;
    companyName: string;
    companyDescription?: string;
    category: string;
    status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
    submittedAt: string;
    boothLabel?: string;
    rejectionReason?: string;
    expoId?: string;
    expoName?: string;
  };
  onClick?: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ApplicationCard({ application, onClick }: ApplicationCardProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={`w-full text-left border p-md-token transition-colors rounded-r-xl rounded-bl-xl ${
        isDarkMode
          ? 'bg-bg-surface-dark border-border-base-dark' + (onClick ? ' hover:bg-bg-hover-dark' : '')
          : 'bg-bg-surface-light border-border-base-light' + (onClick ? ' hover:bg-bg-hover-light' : '')
      } ${
        application.status === 'pending'
          ? isDarkMode ? 'border-l-[3px] border-l-text-warning-dark' : 'border-l-[3px] border-l-text-warning-light'
          : application.status === 'approved'
            ? isDarkMode ? 'border-l-[3px] border-l-text-success-dark' : 'border-l-[3px] border-l-text-success-light'
            : application.status === 'rejected'
              ? isDarkMode ? 'border-l-[3px] border-l-text-danger-dark' : 'border-l-[3px] border-l-text-danger-light'
              : isDarkMode ? 'border-l-[3px] border-l-border-strong-dark' : 'border-l-[3px] border-l-border-strong-light'
      }`}
    >
      {/* Top row: company name + status badge */}
      <div className="flex flex-wrap items-start justify-between gap-sm-token mb-xs-token">
        <span
          className={`text-sm-token font-semibold ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}
        >
          {application.companyName}
        </span>
        <ApplicationStatusBadge status={application.status} />
      </div>

      {/* Expo link */}
      {application.expoId && (
        <div className="mb-xs-token">
          <Link
            to={`/expos/${application.expoId}`}
            onClick={(e) => e.stopPropagation()}
            className={`text-xs-token underline transition-colors ${
              isDarkMode ? 'text-brand-primary-dark hover:opacity-80' : 'text-brand-primary-light hover:opacity-80'
            }`}
          >
            {application.expoName ?? 'View Expo'}
          </Link>
        </div>
      )}

      {/* Category + date */}
      <div
        className={`flex flex-wrap gap-sm-token text-xs-token ${
          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
        }`}
      >
        <span>{application.category}</span>
        <span>·</span>
        <span>Submitted {formatDate(application.submittedAt)}</span>
      </div>

      {/* Booth label (approved) */}
      {application.boothLabel && (
        <div
          className={`mt-xs-token text-xs-token font-medium ${
            isDarkMode ? 'text-text-success-dark' : 'text-text-success-light'
          }`}
        >
          Booth: {application.boothLabel}
        </div>
      )}

      {/* Rejection reason */}
      {application.rejectionReason && (
        <div
          className={`mt-xs-token text-xs-token ${
            isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
          }`}
        >
          Reason: {application.rejectionReason}
        </div>
      )}
    </Wrapper>
  );
}
