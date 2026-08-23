import toast, { Toaster, Toast, resolveValue } from 'react-hot-toast';
import { useEffect, useState } from 'react';

const toastBg: Record<string, string> = {
  success: '#4ADE80',
  error:   '#F87171',
  loading: '#818CF8',
  custom:  '#818CF8',
  blank:   '#FBBF24',
};


const ToastItem = ({ t }: { t: Toast }) => {
  const [paused, setPaused] = useState(false);
  const bg  = toastBg[t.type]   ?? '#818CF8';
  const dur = t.duration ?? 5000;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: bg,
        color: '#fff',
        borderRadius: '12px',
        padding: '0.75rem 1rem 1.35rem',
        fontWeight: 500,
        fontSize: '14px',
        minWidth: '260px',
        maxWidth: '360px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        cursor: 'default',
        opacity: t.visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <span style={{ flex: 1 }}>{resolveValue(t.message, t)}</span>
      <button
        onClick={() => toast.dismiss(t.id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.75)',
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: 1,
          padding: '0',
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        x
      </button>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.25)' }}>
        <div style={{
          height: '100%',
          background: 'rgba(255,255,255,0.85)',
          animationName: 'toast-shrink',
          animationDuration: dur + 'ms',
          animationTimingFunction: 'linear',
          animationFillMode: 'forwards',
          animationPlayState: paused ? 'paused' : 'running',
        }} />
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