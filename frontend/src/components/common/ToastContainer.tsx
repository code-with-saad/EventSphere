import toast, { Toaster, Toast, resolveValue } from 'react-hot-toast';
import React, { useEffect, useState } from 'react';

const ToastItem = ({ t }: { t: Toast }) => {
  const [paused, setPaused] = useState(false);
  const dur = t.duration ?? 5000;
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  // Fallback styling based on type and dark/light tokens if not explicitly in t.style
  const typeStr = t.type as string;
  const fallbackBg = typeStr === 'success' ? (isDarkMode ? 'rgba(93,202,165,0.14)' : '#DCFCE7')
    : typeStr === 'error' ? (isDarkMode ? 'rgba(226,75,74,0.14)' : '#FEE2E2')
    : typeStr === 'warning' ? (isDarkMode ? 'rgba(239,159,39,0.14)' : '#FEF3C7')
    : (isDarkMode ? '#151517' : '#FFFFFF');

  const fallbackColor = typeStr === 'success' ? (isDarkMode ? '#5DCAA5' : '#065F46')
    : typeStr === 'error' ? (isDarkMode ? '#E24B4A' : '#991B1B')
    : typeStr === 'warning' ? (isDarkMode ? '#EF9F27' : '#92400E')
    : (isDarkMode ? '#F2F1ED' : '#111110');

  const fallbackBorder = typeStr === 'success' ? (isDarkMode ? '1px solid rgba(93,202,165,0.25)' : '1px solid rgba(6,95,70,0.2)')
    : typeStr === 'error' ? (isDarkMode ? '1px solid rgba(226,75,74,0.25)' : '1px solid rgba(153,27,27,0.2)')
    : typeStr === 'warning' ? (isDarkMode ? '1px solid rgba(239,159,39,0.25)' : '1px solid rgba(146,64,14,0.2)')
    : (isDarkMode ? '1px solid #26262A' : '1px solid #E5E7EB');

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    background: t.style?.background || fallbackBg,
    color: t.style?.color || fallbackColor,
    border: t.style?.border || fallbackBorder,
    borderRadius: t.style?.borderRadius || '12px',
    padding: t.style?.padding || '0.875rem 1rem 1.25rem',
    fontWeight: t.style?.fontWeight || 500,
    fontSize: t.style?.fontSize || '14px',
    minWidth: '280px',
    maxWidth: '400px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: t.style?.boxShadow || '0 4px 20px rgba(0,0,0,0.25)',
    cursor: 'default',
    opacity: t.visible ? 1 : 0,
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    backdropFilter: 'blur(8px)',
  };

  const accentColor = (t.style?.color as string) || fallbackColor;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={containerStyle}
    >
      {t.icon && (
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {resolveValue(t.icon, t)}
        </span>
      )}
      <span style={{ flex: 1, lineHeight: '1.4' }}>{resolveValue(t.message, t)}</span>
      <button
        onClick={() => toast.dismiss(t.id)}
        style={{
          background: 'none',
          border: 'none',
          color: accentColor,
          opacity: 0.7,
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: 1,
          padding: '0.2rem',
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'rgba(128,128,128,0.2)' }}>
        <div
          style={{
            height: '100%',
            background: accentColor,
            animationName: 'toast-shrink',
            animationDuration: dur + 'ms',
            animationTimingFunction: 'linear',
            animationFillMode: 'forwards',
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      </div>
    </div>
  );
};

export const ToastContainer = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <Toaster
      position={isMobile ? 'bottom-center' : 'top-right'}
      toastOptions={{ duration: 5000 }}
      containerStyle={isMobile ? { bottom: '80px' } : {}}
    >
      {(t) => <ToastItem t={t} />}
    </Toaster>
  );
};