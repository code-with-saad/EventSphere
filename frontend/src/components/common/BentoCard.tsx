import { useTheme } from '../../contexts/ThemeContext';

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

/**
 * BentoCard component - Content container with EventSphere design system styling
 *
 * Features:
 * - Uses design tokens for all colors
 * - Dark/light mode support via useTheme()
 * - Optional hover effect
 * - Customizable via className prop
 *
 * Design system tokens used:
 * - bg-bg-surface-dark / bg-bg-surface-light
 * - border-border-base-dark / border-border-base-light
 * - rounded-xl-token (16px)
 */
export function BentoCard({ children, className = '', hover = false }: BentoCardProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <div
      className={[
        isDarkMode
          ? 'bg-bg-surface-dark border-border-base-dark'
          : 'bg-bg-surface-light border-border-base-light',
        'border rounded-xl-token p-6',
        hover
          ? isDarkMode
            ? 'hover:bg-bg-hover-dark transition-colors duration-200 cursor-pointer'
            : 'hover:bg-bg-hover-light transition-colors duration-200 cursor-pointer'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
