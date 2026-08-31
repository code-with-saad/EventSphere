import { useTheme } from '../../contexts/ThemeContext';

type ExpoStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';

interface ExpoStatusBadgeProps {
  status: ExpoStatus;
}

export default function ExpoStatusBadge({ status }: ExpoStatusBadgeProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const config: Record<ExpoStatus, { label: string; classes: string }> = {
    draft: {
      label: 'Draft',
      classes: isDarkMode
        ? 'bg-bg-surface-dark text-text-secondary-dark border border-border-base-dark'
        : 'bg-bg-surface-light text-text-secondary-light border border-border-base-light',
    },
    published: {
      label: 'Published',
      classes: isDarkMode
        ? 'bg-bg-success-dark text-text-success-dark'
        : 'bg-bg-success-light text-text-success-light',
    },
    ongoing: {
      label: 'Ongoing',
      classes: isDarkMode
        ? 'bg-bg-hover-dark text-brand-primary-dark'
        : 'bg-bg-hover-light text-brand-primary-light',
    },
    completed: {
      label: 'Completed',
      classes: isDarkMode
        ? 'bg-bg-warning-dark text-text-warning-dark'
        : 'bg-bg-warning-light text-text-warning-light',
    },
    archived: {
      label: 'Archived',
      classes: isDarkMode
        ? 'bg-bg-danger-dark text-text-danger-dark'
        : 'bg-bg-danger-light text-text-danger-light',
    },
  };

  const { label, classes } = config[status] ?? config.draft;

  return (
    <span
      className={`inline-flex items-center px-sm-token py-xs-token rounded-sm-token text-xs-token font-medium ${classes}`}
    >
      {label}
    </span>
  );
}
