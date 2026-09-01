import { useTheme } from '../../contexts/ThemeContext';
import BackButton from './BackButton';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backFallback?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, backFallback, backLabel, actions }: PageHeaderProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div className="mb-lg-token">
      {backFallback && (
        <div className="mb-sm-token">
          <BackButton fallback={backFallback} label={backLabel} />
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-sm-token">
        <div>
          <h1 className={`text-xl-token font-semibold leading-tight-token ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}>
            {title}
          </h1>
          {subtitle && (
            <p className={`mt-xs-token text-sm-token ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-sm-token">{actions}</div>}
      </div>
    </div>
  );
}
