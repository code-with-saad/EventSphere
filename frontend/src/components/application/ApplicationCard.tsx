import { useTheme } from '../../contexts/ThemeContext';
import ApplicationStatusBadge from './ApplicationStatusBadge';

interface ApplicationCardProps {
  application: {
    _id: string;
    companyName: string;
    companyDescription?: string;
    category: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: string;
    boothLabel?: string;
    rejectionReason?: string;
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
      className={`w-full text-left rounded-lg-token border p-md-token transition-colors ${
        isDarkMode
          ? 'bg-bg-surface-dark border-border-base-dark' + (onClick ? ' hover:bg-bg-hover-dark' : '')
          : 'bg-bg-surface-light border-border-base-light' + (onClick ? ' hover:bg-bg-hover-light' : '')
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
