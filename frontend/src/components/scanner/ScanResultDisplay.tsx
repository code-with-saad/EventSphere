import { useEffect } from 'react';

export type ScanResult =
  | 'checked_in'
  | 'already_checked_in'
  | 'invalid_ticket'
  | 'cancelled_ticket'
  | 'wrong_event'
  | null;

interface ScanResultDisplayProps {
  result: ScanResult;
  /** Called after the 3-second auto-dismiss timer fires */
  onDismiss: () => void;
  /** Attendee full name — shown on checked_in */
  attendeeName?: string;
  /** Expo name — available for context but not currently shown in the indicator */
  expoName?: string;
  /** ISO timestamp of original check-in — shown on already_checked_in */
  checkedInAt?: string;
  /** ISO timestamp when next check-in is allowed */
  canCheckInAt?: string;
  /** Total check-in count for this ticket */
  checkInCount?: number;
}

/** Formats an ISO timestamp into a readable local date/time string */
function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

/**
 * ScanResultDisplay
 *
 * Renders a full-width feedback banner beneath the QR scanner viewfinder.
 * Always rendered in dark scanner style (no ThemeContext dependency — REQ-8.10).
 * Auto-dismisses after 3 seconds by calling `onDismiss`.
 *
 * - checked_in        → success color, attendee name, "Checked in" (REQ-8.5)
 * - already_checked_in → warning color, timestamp (REQ-8.7)
 * - invalid_ticket    → danger color, "Invalid ticket" (REQ-8.6)
 * - cancelled_ticket  → danger color, "Ticket cancelled" (REQ-8.8)
 * - wrong_event       → danger color, "Wrong event" (REQ-8.9)
 * - null              → renders nothing
 */
export default function ScanResultDisplay({
  result,
  onDismiss,
  attendeeName,
  checkedInAt,
  canCheckInAt,
  checkInCount,
}: ScanResultDisplayProps) {
  // Auto-dismiss after 3 seconds whenever result changes to a non-null value
  useEffect(() => {
    if (!result) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, 3000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]); // onDismiss is stable via caller's useCallback

  if (!result) return null;

  // ── Resolve per-state values ─────────────────────────────────────────────
  type StateConfig = {
    role: 'status' | 'alert';
    ariaLive: 'polite' | 'assertive';
    /** Tailwind token class for the left border accent */
    borderColorClass: string;
    /** Tailwind token class for the icon + headline color */
    textColorClass: string;
    /** Tailwind token class for the tinted background */
    bgColorClass: string;
    icon: React.ReactNode;
    headline: string;
    detail?: string;
  };

  const config: StateConfig = (() => {
    switch (result) {
      case 'checked_in':
        return {
          role: 'status' as const,
          ariaLive: 'polite' as const,
          borderColorClass: 'border-l-text-success-dark',
          textColorClass: 'text-text-success-dark',
          bgColorClass: 'bg-bg-success-dark',
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ),
          headline: checkInCount && checkInCount > 1 ? `Checked in (Day ${checkInCount})` : 'Checked in',
          detail: attendeeName || undefined,
        };

      case 'already_checked_in':
        return {
          role: 'status' as const,
          ariaLive: 'polite' as const,
          borderColorClass: 'border-l-text-warning-dark',
          textColorClass: 'text-text-warning-dark',
          bgColorClass: 'bg-bg-warning-dark',
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          ),
          headline: 'Already checked in today',
          detail: checkedInAt
            ? `Last check-in at ${formatTimestamp(checkedInAt)}${canCheckInAt ? ` · Next check-in eligible after ${formatTimestamp(canCheckInAt)}` : ''}`
            : undefined,
        };

      case 'invalid_ticket':
        return {
          role: 'alert' as const,
          ariaLive: 'assertive' as const,
          borderColorClass: 'border-l-text-danger-dark',
          textColorClass: 'text-text-danger-dark',
          bgColorClass: 'bg-bg-danger-dark',
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ),
          headline: 'Invalid ticket',
        };

      case 'cancelled_ticket':
        return {
          role: 'alert' as const,
          ariaLive: 'assertive' as const,
          borderColorClass: 'border-l-text-danger-dark',
          textColorClass: 'text-text-danger-dark',
          bgColorClass: 'bg-bg-danger-dark',
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          ),
          headline: 'Ticket cancelled',
        };

      case 'wrong_event':
        return {
          role: 'alert' as const,
          ariaLive: 'assertive' as const,
          borderColorClass: 'border-l-text-danger-dark',
          textColorClass: 'text-text-danger-dark',
          bgColorClass: 'bg-bg-danger-dark',
          icon: (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4" opacity={0.4} />
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
            </svg>
          ),
          headline: 'Wrong event',
        };
    }
  })();

  return (
    <div
      role={config.role}
      aria-live={config.ariaLive}
      className={[
        // Flat fill — dark surface, no shadow, no glassmorphism (REQ-8.10)
        'w-full rounded-md-token',
        'border border-border-base-dark',
        // Left-border status accent (3px, no rounding on that edge)
        'border-l-4',
        config.borderColorClass,
        config.bgColorClass,
        'px-md-token py-md-token',
        'flex items-start gap-md-token',
      ].join(' ')}
    >
      {/* Icon */}
      <span className={config.textColorClass} aria-hidden="true">
        {config.icon}
      </span>

      {/* Text content */}
      <div className="flex flex-col gap-xs-token min-w-0">
        <p className={`text-lg-token font-semibold leading-tight-token ${config.textColorClass}`}>
          {config.headline}
        </p>
        {config.detail && (
          <p className="text-sm-token text-text-secondary-dark leading-normal-token">
            {config.detail}
          </p>
        )}
      </div>
    </div>
  );
}
