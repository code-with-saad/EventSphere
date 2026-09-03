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
        // ── Voltage dark-mode tokens (primary experience) ──────────────────
        'bg-base-dark':    '#0A0A0C',
        'bg-surface-dark': '#151517',
        'bg-hover-dark':   '#1C1C1F',
        'bg-success-dark': 'rgba(93,202,165,0.12)',
        'bg-warning-dark': 'rgba(239,159,39,0.12)',
        'bg-danger-dark':  'rgba(226,75,74,0.12)',

        // ── Light mode fallbacks ────────────────────────────────────────────
        'bg-base-light':    '#F5F5F4',
        'bg-surface-light': '#FFFFFF',
        'bg-hover-light':   'rgba(255,77,46,0.05)',
        'bg-success-light': '#DCFCE7',
        'bg-warning-light': '#FEF3C7',
        'bg-danger-light':  '#FEE2E2',

        // ── Text dark ──────────────────────────────────────────────────────
        'text-primary-dark':    '#F2F1ED',
        'text-secondary-dark':  '#8A8A8E',
        'text-muted-dark':      '#5C5C60',
        'text-success-dark':    '#5DCAA5',
        'text-warning-dark':    '#EF9F27',
        'text-danger-dark':     '#E24B4A',
        'text-on-primary-dark': '#2C0B03',

        // ── Text light ─────────────────────────────────────────────────────
        'text-primary-light':    '#111110',
        'text-secondary-light':  '#6B7280',
        'text-muted-light':      '#9CA3AF',
        'text-success-light':    '#065F46',
        'text-warning-light':    '#92400E',
        'text-danger-light':     '#991B1B',
        'text-on-primary-light': '#2C0B03',

        // ── Borders ────────────────────────────────────────────────────────
        'border-base-dark':    '#26262A',
        'border-strong-dark':  '#3A3A3F',
        'border-base-light':   '#E5E7EB',
        'border-strong-light': '#D1D5DB',

        // ── Accent (replaces indigo brand-primary) ─────────────────────────
        'brand-primary-dark':  '#FF4D2E',
        'brand-primary-light': '#E8451F',
        'accent-hover-dark':   '#E8451F',   // --accent-hover
        'accent-hover-light':  '#D13D18',   // slightly darker for light bg
        'accent-bg-dark':      '#2C0B03',
        'accent-bg-light':     '#FFF0ED',
        'brand-secondary-dark':  '#3A3A3F',
        'brand-secondary-light': '#9CA3AF',

        // ── Glass (sidebar/header backdrop-blur) ───────────────────────────
        'glass-dark':         'rgba(10,10,12,0.55)',
        'glass-light':        'rgba(245,245,244,0.65)',
        'glass-border-dark':  'rgba(38,38,42,0.70)',
        'glass-border-light': 'rgba(229,231,235,0.60)',
      },
      fontFamily: {
        'sans':    ['Inter', 'system-ui', 'sans-serif'],
        'display': ['"Space Grotesk"', 'Inter', 'sans-serif'],
        'mono':    ['"Fira Code"', 'monospace'],
      },
      fontSize: {
        'xs-token':      ['12px', '1.5'],
        'sm-token':      ['14px', '1.5'],
        'base-token':    ['16px', '1.5'],
        'lg-token':      ['18px', '1.5'],
        'xl-token':      ['24px', '1.2'],
        '2xl-token':     ['28px', '1.2'],
        'display-token': ['40px', '1.1'],
      },
      fontWeight: {
        'regular':  '400',
        'medium':   '500',
        'semibold': '600',
        'bold':     '700',
      },
      lineHeight: {
        'tight-token':  '1.2',
        'normal-token': '1.5',
        'loose-token':  '1.75',
      },
      spacing: {
        'xs-token':  '4px',
        'sm-token':  '8px',
        'md-token':  '16px',
        'lg-token':  '24px',
        'xl-token':  '32px',
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
