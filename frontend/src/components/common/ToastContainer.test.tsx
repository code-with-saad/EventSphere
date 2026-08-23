import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastContainer } from './ToastContainer';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  Toaster: ({ position, toastOptions, gapClassName, containerStyle: _containerStyle }: any) => (
    <div 
      data-testid="toaster"
      data-position={position}
      data-gap-class={gapClassName}
      data-success-bg={toastOptions?.success?.style?.background}
      data-error-bg={toastOptions?.error?.style?.background}
      data-duration={toastOptions?.duration}
    >
      Toaster Component
    </div>
  ),
}));

describe('ToastContainer', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    // Store original window.innerWidth
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    // Restore original window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('should render the Toaster component', () => {
    render(<ToastContainer />);
    expect(screen.getByTestId('toaster')).toBeInTheDocument();
  });

  it('should position toasts at top-right on desktop (>=768px)', () => {
    // Set desktop viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    render(<ToastContainer />);
    const toaster = screen.getByTestId('toaster');
    
    // Initial render should be top-right for desktop
    expect(toaster.getAttribute('data-position')).toBe('top-right');
  });

  it('should position toasts at bottom-center on mobile (<768px)', () => {
    // Set mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<ToastContainer />);
    const toaster = screen.getByTestId('toaster');
    
    // Should be bottom-center for mobile
    expect(toaster.getAttribute('data-position')).toBe('bottom-center');
  });

  it('should configure 5 second (5000ms) auto-dismiss duration', () => {
    render(<ToastContainer />);
    const toaster = screen.getByTestId('toaster');
    
    expect(toaster.getAttribute('data-duration')).toBe('5000');
  });

  it('should configure success toast with green background', () => {
    render(<ToastContainer />);
    const toaster = screen.getByTestId('toaster');
    
    // Success color should be green-500
    expect(toaster.getAttribute('data-success-bg')).toBe('#22C55E');
  });

  it('should configure error toast with red background', () => {
    render(<ToastContainer />);
    const toaster = screen.getByTestId('toaster');
    
    // Error color should be red-500
    expect(toaster.getAttribute('data-error-bg')).toBe('#EF4444');
  });

  it('should configure vertical stacking with gap-2 class (8px spacing)', () => {
    render(<ToastContainer />);
    const toaster = screen.getByTestId('toaster');
    
    // gap-2 in Tailwind = 8px spacing
    expect(toaster.getAttribute('data-gap-class')).toBe('gap-2');
  });

  it('should handle viewport resize events', () => {
    // Set initial desktop viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { rerender } = render(<ToastContainer />);
    let toaster = screen.getByTestId('toaster');
    
    // Should start at top-right
    expect(toaster.getAttribute('data-position')).toBe('top-right');

    // Change to mobile viewport and trigger resize
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
    });

    rerender(<ToastContainer />);
    
    toaster = screen.getByTestId('toaster');
    // Should now be bottom-center
    expect(toaster.getAttribute('data-position')).toBe('bottom-center');
  });

  it('should cleanup resize event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    const { unmount } = render(<ToastContainer />);
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
