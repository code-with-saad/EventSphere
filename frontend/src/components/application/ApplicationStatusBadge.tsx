import { useTheme } from '../../contexts/ThemeContext';

type ApplicationStatus = 'pending' | 'approved' | 'rejected';

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
}

export default function ApplicationStatusBadge({ status }: ApplicationStatusBadgeProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const config: Record<ApplicationStatus, { label: string; classes: string }> = {
    pending: {
      label: 'Pending',
      classes: isDarkMode
        ? 'bg-bg-warning-dark text-text-warning-dark'
        : 'bg-bg-warning-light text-text-warning-light',
    },
    approved: {
      label: 'Approved',
      classes: isDarkMode
        ? 'bg-bg-success-dark text-text-success-dark'
        : 'bg-bg-success-light text-text-success-light',
    },
    rejected: {
      label: 'Rejected',
      classes: isDarkMode
        ? 'bg-bg-danger-dark text-text-danger-dark'
        : 'bg-bg-danger-light text-text-danger-light',
    },
  };

  const { label, classes } = config[status] ?? config.pending;

  return (
    <span
      className={`inline-flex items-center px-sm-token py-xs-token rounded-sm-token text-xs-token font-medium ${classes}`}
    >
      {label}
    </span>
  );
}
