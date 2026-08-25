/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark mode colors
        'bg-base-dark': '#0B1120',
        'bg-surface-dark': '#1E293B',
        'bg-hover-dark': 'rgba(129, 140, 248, 0.08)',
        'bg-success-dark': 'rgba(74, 222, 128, 0.15)',
        'bg-warning-dark': 'rgba(251, 191, 36, 0.15)',
        'bg-danger-dark': 'rgba(248, 113, 113, 0.15)',
        
        // Light mode colors
        'bg-base-light': '#F8FAFC',
        'bg-surface-light': '#FFFFFF',
        'bg-hover-light': 'rgba(79, 70, 229, 0.05)',
        'bg-success-light': '#D1FAE5',
        'bg-warning-light': '#FEF3C7',
        'bg-danger-light': '#FEE2E2',
        
        // Text colors - Dark mode
        'text-primary-dark': '#F1F5F9',
        'text-secondary-dark': '#94A3B8',
        'text-success-dark': '#4ADE80',
        'text-warning-dark': '#FBBF24',
        'text-danger-dark': '#F87171',
        'text-on-primary-dark': '#FFFFFF',
        
        // Text colors - Light mode
        'text-primary-light': '#0F172A',
        'text-secondary-light': '#64748B',
        'text-success-light': '#065F46',
        'text-warning-light': '#92400E',
        'text-danger-light': '#991B1B',
        'text-on-primary-light': '#FFFFFF',
        
        // Border colors - Dark mode
        'border-base-dark': '#334155',
        
        // Border colors - Light mode
        'border-base-light': '#E2E8F0',
        
        // Brand colors - Dark mode
        'brand-primary-dark': '#818CF8',
        'brand-primary-glow-dark': 'rgba(129, 140, 248, 0.4)',
        'brand-secondary-dark': '#22D3EE',
        
        // Brand colors - Light mode
        'brand-primary-light': '#4F46E5',
        'brand-primary-glow-light': 'rgba(79, 70, 229, 0.2)',
        'brand-secondary-light': '#0891B2',

        // Glass effect tokens — semi-transparent rgba so backdrop-blur is visible
        'glass-dark': 'rgba(15, 23, 42, 0.65)',
        'glass-light': 'rgba(248, 250, 252, 0.72)',
        'glass-border-dark': 'rgba(51, 65, 85, 0.6)',
        'glass-border-light': 'rgba(226, 232, 240, 0.5)',
      },
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
        'mono': ['Fira Code', 'monospace'],
      },
      fontSize: {
        'xs-token': ['12px', '1.5'],
        'sm-token': ['14px', '1.5'],
        'base-token': ['16px', '1.5'],
        'lg-token': ['18px', '1.5'],
        'xl-token': ['24px', '1.2'],
      },
      fontWeight: {
        'regular': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
      },
      lineHeight: {
        'tight-token': '1.2',
        'normal-token': '1.5',
        'loose-token': '1.75',
      },
      spacing: {
        'xs-token': '4px',
        'sm-token': '8px',
        'md-token': '16px',
        'lg-token': '24px',
        'xl-token': '32px',
        'xxl-token': '48px',
      },
      borderRadius: {
        'sm-token': '4px',
        'md-token': '8px',
        'lg-token': '12px',
        'xl-token': '16px',
      },
    },
  },
  plugins: [],
}
