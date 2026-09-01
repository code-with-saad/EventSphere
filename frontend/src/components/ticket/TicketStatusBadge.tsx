import { useTheme } from '../../contexts/ThemeContext';

type TicketStatus = 'active' | 'checked_in' | 'cancelled';

interface TicketStatusBadgeProps {
  status: TicketStatus;
}

export default function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const config: Record<TicketStatus, { label: string; classes: string }> = {
    active: {
      label: 'Active',
      classes: isDarkMode
        ? 'bg-bg-success-dark text-text-success-dark'
        : 'bg-bg-success-light text-text-success-light',
    },
    checked_in: {
      label: 'Checked In',
      classes: isDarkMode
        ? 'bg-bg-hover-dark text-brand-primary-dark'
        : 'bg-bg-hover-light text-brand-primary-light',
    },
    cancelled: {
      label: 'Cancelled',
      classes: isDarkMode
        ? 'bg-bg-danger-dark text-text-danger-dark'
        : 'bg-bg-danger-light text-text-danger-light',
    },
  };

  const { label, classes } = config[status] ?? config.active;

  return (
    <span className={`inline-flex items-center px-sm-token py-xs-token rounded-sm-token text-xs-token font-medium ${classes}`}>
      {label}
    </span>
  );
}
