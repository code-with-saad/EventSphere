import React from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Info } from 'lucide-react';

/**
 * Toast notification utility functions
 *
 * Validates Requirements 18.7, 18.8, 18.9
 */

export const showSuccess = (message: string) => {
  return toast.success(message);
};

export const showError = (message: string) => {
  return toast.error(message);
};

export const showWarning = (message: string) => {
  return toast(message, {
    icon: React.createElement(AlertTriangle, {
      size: 16,
      color: '#FFFFFF',
    }),
    style: {
      background: '#92400E',
      color: '#FFFFFF',
      borderRadius: '12px',
      padding: '1rem',
      fontWeight: '500',
    },
  });
};

export const showInfo = (message: string) => {
  return toast(message, {
    icon: React.createElement(Info, {
      size: 16,
      color: '#FFFFFF',
    }),
    style: {
      background: '#818CF8',
      color: '#FFFFFF',
      borderRadius: '12px',
      padding: '1rem',
      fontWeight: '500',
    },
  });
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

export const dismissAllToasts = () => {
  toast.dismiss();
};
