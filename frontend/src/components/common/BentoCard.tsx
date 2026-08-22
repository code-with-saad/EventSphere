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
 * - Dark/light mode support
 * - Optional hover effect
 * - Customizable via className prop
 * 
 * Design system tokens used:
 * - bg-bg-surface-dark / bg-bg-surface-light
 * - border-border-base-dark / border-border-base-light
 * - rounded-xl-token (16px)
 */
export function BentoCard({ children, className = '', hover = false }: BentoCardProps) {
  return (
    <div
      className={`
        bg-bg-surface-dark
        border border-border-base-dark
        rounded-xl-token
        p-6
        ${hover ? 'hover:shadow-lg transition-shadow duration-200' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
