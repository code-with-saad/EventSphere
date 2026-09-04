import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { BarChart3, Loader2 } from 'lucide-react';

interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  loading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  minHeight?: number | string;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
  title,
  subtitle,
  loading = false,
  isEmpty = false,
  emptyMessage = 'No data available to display',
  headerAction,
  children,
  className = '',
  minHeight = 280,
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div
      className={`rounded-xl-token border p-md-token md:p-lg-token backdrop-blur-md transition-all duration-150 flex flex-col ${
        isDarkMode
          ? 'bg-glass-dark border-glass-border-dark shadow-elevation-1-dark'
          : 'bg-glass-light border-glass-border-light shadow-elevation-1-light'
      } ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-sm-token mb-md-token">
        <div>
          <h3
            className={`text-base-token font-semibold leading-tight-token ${
              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
            }`}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              className={`text-xs-token mt-0.5 ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              {subtitle}
            </p>
          )}
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>

      {/* Content Area */}
      <div
        className="flex-1 w-full flex items-center justify-center relative min-w-0"
        style={{ minHeight }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-sm-token py-8">
            <Loader2 className="w-7 h-7 animate-spin text-brand-primary-dark" />
            <span
              className={`text-xs-token font-medium ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              Loading chart data...
            </span>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-xs-token py-8 text-center px-4">
            <BarChart3
              className={`w-8 h-8 opacity-40 mb-1 ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            />
            <p
              className={`text-xs-token font-medium ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              {emptyMessage}
            </p>
          </div>
        ) : (
          <div className="w-full h-full min-w-0">{children}</div>
        )}
      </div>
    </div>
  );
};

export default ChartWrapper;
