import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ScanResultDisplay, { ScanResult } from './ScanResultDisplay';

// Use fake timers so we can control the 3-second auto-dismiss
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('ScanResultDisplay', () => {
  // ── null — render nothing ────────────────────────────────────────────────
  it('renders nothing when result is null', () => {
    const { container } = render(
      <ScanResultDisplay result={null} onDismiss={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  // ── checked_in (REQ-8.5) ────────────────────────────────────────────────
  describe('checked_in', () => {
    it('renders "Checked in" headline with success styling', () => {
      render(
        <ScanResultDisplay
          result="checked_in"
          onDismiss={vi.fn()}
          attendeeName="Jane Doe"
        />,
      );
      expect(screen.getByText('Checked in')).toBeInTheDocument();
    });

    it('displays the attendee name when provided', () => {
      render(
        <ScanResultDisplay
          result="checked_in"
          onDismiss={vi.fn()}
          attendeeName="Jane Doe"
        />,
      );
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('uses role="status" and aria-live="polite"', () => {
      render(<ScanResultDisplay result="checked_in" onDismiss={vi.fn()} />);
      const el = screen.getByRole('status');
      expect(el).toHaveAttribute('aria-live', 'polite');
    });

    it('calls onDismiss after 3 seconds', () => {
      const onDismiss = vi.fn();
      render(<ScanResultDisplay result="checked_in" onDismiss={onDismiss} />);
      expect(onDismiss).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(3000));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  // ── already_checked_in (REQ-8.7) ────────────────────────────────────────
  describe('already_checked_in', () => {
    it('renders "Already checked in" headline', () => {
      render(
        <ScanResultDisplay result="already_checked_in" onDismiss={vi.fn()} />,
      );
      expect(screen.getByText('Already checked in')).toBeInTheDocument();
    });

    it('displays formatted original check-in timestamp', () => {
      const iso = '2025-06-15T10:30:00.000Z';
      render(
        <ScanResultDisplay
          result="already_checked_in"
          onDismiss={vi.fn()}
          checkedInAt={iso}
        />,
      );
      // The formatted string contains "First checked in at" prefix
      expect(screen.getByText(/First checked in at/i)).toBeInTheDocument();
    });

    it('uses role="status" and aria-live="polite"', () => {
      render(
        <ScanResultDisplay result="already_checked_in" onDismiss={vi.fn()} />,
      );
      const el = screen.getByRole('status');
      expect(el).toHaveAttribute('aria-live', 'polite');
    });

    it('calls onDismiss after 3 seconds', () => {
      const onDismiss = vi.fn();
      render(
        <ScanResultDisplay result="already_checked_in" onDismiss={onDismiss} />,
      );
      act(() => vi.advanceTimersByTime(3000));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  // ── invalid_ticket (REQ-8.6) ─────────────────────────────────────────────
  describe('invalid_ticket', () => {
    it('renders "Invalid ticket" headline', () => {
      render(<ScanResultDisplay result="invalid_ticket" onDismiss={vi.fn()} />);
      expect(screen.getByText('Invalid ticket')).toBeInTheDocument();
    });

    it('uses role="alert" and aria-live="assertive"', () => {
      render(<ScanResultDisplay result="invalid_ticket" onDismiss={vi.fn()} />);
      const el = screen.getByRole('alert');
      expect(el).toHaveAttribute('aria-live', 'assertive');
    });

    it('calls onDismiss after 3 seconds', () => {
      const onDismiss = vi.fn();
      render(<ScanResultDisplay result="invalid_ticket" onDismiss={onDismiss} />);
      act(() => vi.advanceTimersByTime(3000));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  // ── cancelled_ticket (REQ-8.8) ───────────────────────────────────────────
  describe('cancelled_ticket', () => {
    it('renders "Ticket cancelled" headline', () => {
      render(
        <ScanResultDisplay result="cancelled_ticket" onDismiss={vi.fn()} />,
      );
      expect(screen.getByText('Ticket cancelled')).toBeInTheDocument();
    });

    it('uses role="alert" and aria-live="assertive"', () => {
      render(
        <ScanResultDisplay result="cancelled_ticket" onDismiss={vi.fn()} />,
      );
      const el = screen.getByRole('alert');
      expect(el).toHaveAttribute('aria-live', 'assertive');
    });

    it('calls onDismiss after 3 seconds', () => {
      const onDismiss = vi.fn();
      render(
        <ScanResultDisplay result="cancelled_ticket" onDismiss={onDismiss} />,
      );
      act(() => vi.advanceTimersByTime(3000));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  // ── wrong_event (REQ-8.9) ────────────────────────────────────────────────
  describe('wrong_event', () => {
    it('renders "Wrong event" headline', () => {
      render(<ScanResultDisplay result="wrong_event" onDismiss={vi.fn()} />);
      expect(screen.getByText('Wrong event')).toBeInTheDocument();
    });

    it('uses role="alert" and aria-live="assertive"', () => {
      render(<ScanResultDisplay result="wrong_event" onDismiss={vi.fn()} />);
      const el = screen.getByRole('alert');
      expect(el).toHaveAttribute('aria-live', 'assertive');
    });

    it('calls onDismiss after 3 seconds', () => {
      const onDismiss = vi.fn();
      render(<ScanResultDisplay result="wrong_event" onDismiss={onDismiss} />);
      act(() => vi.advanceTimersByTime(3000));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  // ── Timer reset on result change ─────────────────────────────────────────
  it('resets the 3-second timer when result changes before dismissal', () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <ScanResultDisplay result="checked_in" onDismiss={onDismiss} />,
    );

    // Advance to 2 seconds — not dismissed yet
    act(() => vi.advanceTimersByTime(2000));
    expect(onDismiss).not.toHaveBeenCalled();

    // Change result — timer should reset
    rerender(
      <ScanResultDisplay result="invalid_ticket" onDismiss={onDismiss} />,
    );

    // Advance 2 more seconds — still within the fresh 3s window
    act(() => vi.advanceTimersByTime(2000));
    expect(onDismiss).not.toHaveBeenCalled();

    // Advance 1 more second — now the new 3s window is complete
    act(() => vi.advanceTimersByTime(1000));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  // ── Does not dismiss before 3 seconds ────────────────────────────────────
  it('does not call onDismiss before 3 seconds have elapsed', () => {
    const onDismiss = vi.fn();
    render(<ScanResultDisplay result="checked_in" onDismiss={onDismiss} />);
    act(() => vi.advanceTimersByTime(2999));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  // ── All non-null results render content ──────────────────────────────────
  const allResults: Exclude<ScanResult, null>[] = [
    'checked_in',
    'already_checked_in',
    'invalid_ticket',
    'cancelled_ticket',
    'wrong_event',
  ];

  it.each(allResults)('renders visible content for result "%s"', (result) => {
    const { container } = render(
      <ScanResultDisplay result={result} onDismiss={vi.fn()} />,
    );
    expect(container.firstChild).not.toBeNull();
  });
});
