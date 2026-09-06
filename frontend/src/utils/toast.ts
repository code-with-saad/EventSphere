import React from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * Toast notification utility functions
 *
 * Uses the app's actual Tailwind design-token colors (from tailwind.config.js).
 * Dark/light mode is detected at call-time via the `dark` class on <html>.
 *
 * Validates Requirements 18.7, 18.8, 18.9
 */

const isDark = () => document.documentElement.classList.contains('dark');

const BASE_STYLE = {
  borderRadius: '12px',
  padding: '0.875rem 1rem',
  fontWeight: '500',
  fontSize: '14px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
};

export const showSuccess = (message: string) => {
  const dark = isDark();
  return toast(message, {
    icon: React.createElement(CheckCircle2, {
      size: 16,
      color: dark ? '#5DCAA5' : '#065F46',
    }),
    style: {
      ...BASE_STYLE,
      background: dark ? 'rgba(93,202,165,0.12)' : '#DCFCE7',
      color: dark ? '#5DCAA5' : '#065F46',
      border: `1px solid ${dark ? 'rgba(93,202,165,0.25)' : 'rgba(6,95,70,0.2)'}`,
    },
  });
};

export const showError = (message: string) => {
  const dark = isDark();
  return toast(message, {
    icon: React.createElement(XCircle, {
      size: 16,
      color: dark ? '#E24B4A' : '#991B1B',
    }),
    style: {
      ...BASE_STYLE,
      background: dark ? 'rgba(226,75,74,0.12)' : '#FEE2E2',
      color: dark ? '#E24B4A' : '#991B1B',
      border: `1px solid ${dark ? 'rgba(226,75,74,0.25)' : 'rgba(153,27,27,0.2)'}`,
    },
  });
};

export const showWarning = (message: string) => {
  const dark = isDark();
  return toast(message, {
    icon: React.createElement(AlertTriangle, {
      size: 16,
      color: dark ? '#EF9F27' : '#92400E',
    }),
    style: {
      ...BASE_STYLE,
      background: dark ? 'rgba(239,159,39,0.12)' : '#FEF3C7',
      color: dark ? '#EF9F27' : '#92400E',
      border: `1px solid ${dark ? 'rgba(239,159,39,0.25)' : 'rgba(146,64,14,0.2)'}`,
    },
  });
};

export const showInfo = (message: string) => {
  // No dedicated info token — uses brand-primary (app accent) tint
  const dark = isDark();
  return toast(message, {
    icon: React.createElement(Info, {
      size: 16,
      color: dark ? '#FF4D2E' : '#E8451F',
    }),
    style: {
      ...BASE_STYLE,
      background: dark ? 'rgba(255,77,46,0.10)' : '#FFF0ED',
      color: dark ? '#FF4D2E' : '#E8451F',
      border: `1px solid ${dark ? 'rgba(255,77,46,0.25)' : 'rgba(232,69,31,0.2)'}`,
    },
  });
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

export const dismissAllToasts = () => {
  toast.dismiss();
};

