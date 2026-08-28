import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ToastContainer } from './ToastContainer';

// vi.mock factory runs in hoisted context - cannot use JSX here, use React.createElement
vi.mock('react-hot-toast', () => ({
  Toaster: ({ position, toastOptions, gapClassName }: any) =>
    React.createElement('div', {
      'data-testid':    'toaster',
      'data-position':  position,
      'data-gap-class': gapClassName,
      'data-duration':  String(toastOptions?.duration ?? ''),
    }, 'Toaster'),
  resolveValue: (v: any) => v,
  toast: { dismiss: vi.fn() },
}));

describe('ToastContainer', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true, configurable: true, value: originalInnerWidth,
    });
  });

  it('should render the Toaster component', () => {
    render(<ToastContainer />);
    expect(screen.getByTestId('toaster')).toBeInTheDocument();
  });

  it('should position toasts at top-right on desktop viewport (>=768px)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    render(<ToastContainer />);
    expect(screen.getByTestId('toaster').getAttribute('data-position')).toBe('top-right');
  });

  it('should position toasts at bottom-center on mobile viewport (<768px)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
    render(<ToastContainer />);
    expect(screen.getByTestId('toaster').getAttribute('data-position')).toBe('bottom-center');
  });

  it('should configure 5000ms auto-dismiss duration', () => {
    render(<ToastContainer />);
    expect(screen.getByTestId('toaster').getAttribute('data-duration')).toBe('5000');
  });

  it('should update position on viewport resize', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    const { rerender } = render(<ToastContainer />);
    expect(screen.getByTestId('toaster').getAttribute('data-position')).toBe('top-right');

    act(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
      window.dispatchEvent(new Event('resize'));
    });
    rerender(<ToastContainer />);
    expect(screen.getByTestId('toaster').getAttribute('data-position')).toBe('bottom-center');
  });

  it('should remove resize listener on unmount', () => {
    const spy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<ToastContainer />);
    unmount();
    expect(spy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});