import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  const displayName = user?.fullName ?? user?.email ?? '';

  return (
    <header
      className={[
        'sticky top-0 z-40 flex items-center justify-between',
        'px-md-token md:px-lg-token py-sm-token md:py-md-token',
        'glass-surface',
        isDarkMode
          ? 'bg-glass-dark border-glass-border-dark text-text-primary-dark'
          : 'bg-glass-light border-glass-border-light text-text-primary-light',
        'border-b backdrop-blur-md',
      ].join(' ')}
    >
      <h1
        className={[
          'text-lg-token font-semibold leading-tight-token truncate',
          isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light',
        ].join(' ')}
      >
        {title}
      </h1>

      <div className="flex items-center gap-sm-token md:gap-md-token shrink-0 ml-md-token">
        {/* Theme toggle — desktop only */}
        <button
          onClick={toggleTheme}
          className={[
            'hidden md:flex items-center justify-center',
            'w-9 h-9 rounded-md-token',
            'transition-colors duration-150',
            isDarkMode
              ? 'text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
              : 'text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light',
          ].join(' ')}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode
            ? <Sun  className="w-4 h-4" aria-hidden="true" />
            : <Moon className="w-4 h-4" aria-hidden="true" />
          }
        </button>

        {/* User badge */}
        {displayName && (
          <div
            className={[
              'flex items-center gap-sm-token px-sm-token py-xs-token',
              'rounded-md-token border text-sm-token font-medium',
              isDarkMode
                ? 'bg-bg-hover-dark border-border-base-dark text-text-secondary-dark'
                : 'bg-bg-hover-light border-border-base-light text-text-secondary-light',
            ].join(' ')}
          >
            <span
              className={[
                'inline-flex items-center justify-center w-6 h-6 rounded-sm-token text-xs-token font-bold',
                isDarkMode
                  ? 'bg-brand-primary-dark text-text-on-primary-dark'
                  : 'bg-brand-primary-light text-text-on-primary-light',
              ].join(' ')}
              aria-hidden="true"
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className="max-w-[120px] md:max-w-[200px] truncate">{displayName}</span>
          </div>
        )}
      </div>
    </header>
  );
}
