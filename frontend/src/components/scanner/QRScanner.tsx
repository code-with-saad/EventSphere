import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  /** Called with the decoded ticket ID string within 300ms of a successful scan */
  onScan: (decodedText: string) => void;
  /**
   * When false the scanner does not start (used when no expo is selected yet).
   * Defaults to true.
   */
  isActive?: boolean;
}

// Unique DOM id for the html5-qrcode mount target — must be stable across renders
const QR_READER_ID = 'qr-reader';

// How long (ms) the same ticketId is suppressed after its first successful scan (REQ-8.13)
const DEBOUNCE_MS = 5_000;

export default function QRScanner({ onScan, isActive = true }: QRScannerProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Tracks the last scan timestamp per ticketId for the 5-second debounce
  const lastScanTime = useRef<Map<string, number>>(new Map());

  // Holds the Html5Qrcode instance so cleanup can reach it
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // Don't start if caller says not to (e.g. no expo selected yet)
    if (!isActive) return;

    // Reset error state each time we (re-)activate
    setCameraError(null);
    setIsStarting(true);

    const html5QrCode = new Html5Qrcode(QR_READER_ID);
    html5QrCodeRef.current = html5QrCode;

    const onScanSuccess = (decodedText: string) => {
      const now = Date.now();
      const lastScan = lastScanTime.current.get(decodedText) ?? 0;

      // 5-second debounce — ignore re-scans of the same ticketId (REQ-8.13)
      if (now - lastScan < DEBOUNCE_MS) return;

      lastScanTime.current.set(decodedText, now);

      // Call parent handler within 300ms (REQ-8.3) — synchronous after the guard above
      onScan(decodedText);
    };

    // Scan failures are expected (partial/blurry frames) — keep silent
    const onScanFailure = (_error: string) => {
      /* intentionally silent */
    };

    html5QrCode
      .start(
        { facingMode: 'environment' }, // prefer rear camera on mobile
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        onScanFailure,
      )
      .then(() => {
        setIsStarting(false);
      })
      .catch((err: unknown) => {
        setIsStarting(false);
        const message = err instanceof Error ? err.message : String(err);
        // Detect camera permission denial (REQ-8.2)
        if (
          message.includes('NotAllowedError') ||
          message.includes('Permission denied') ||
          message.includes('PermissionDeniedError')
        ) {
          setCameraError('permission_denied');
        } else {
          setCameraError(message || 'Unable to start camera');
        }
      });

    // Cleanup: stop camera stream and release resources on unmount (REQ-8.15)
    return () => {
      html5QrCode
        .stop()
        .then(() => html5QrCode.clear())
        .catch(() => {
          // Best-effort — clear even if stop fails
          try {
            html5QrCode.clear();
          } catch {
            /* ignore */
          }
        });
      html5QrCodeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]); // re-run only when isActive changes; onScan is stable via caller's useCallback

  // ── Permission denied state (REQ-8.2) ──────────────────────────────────────
  if (cameraError === 'permission_denied') {
    return (
      <div
        className="
          flex flex-col items-center justify-center
          min-h-[60vh] md:min-h-[400px]
          bg-bg-base-dark rounded-lg-token
          border border-border-base-dark
          p-lg-token text-center
        "
        role="alert"
        aria-live="assertive"
      >
        {/* Camera blocked icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-12 h-12 mb-md-token text-text-danger-dark"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M4 8h8a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2z"
          />
          <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </svg>

        <h3 className="text-lg-token font-semibold text-text-primary-dark mb-sm-token">
          Can't access your camera
        </h3>

        <p className="text-sm-token text-text-secondary-dark mb-md-token max-w-xs">
          To scan tickets, allow camera access:
        </p>

        <ol className="text-sm-token text-text-secondary-dark text-left space-y-xs-token list-decimal list-inside max-w-xs">
          <li>Click the camera or lock icon in your browser's address bar</li>
          <li>Select "Allow" for camera access</li>
          <li>Refresh this page</li>
        </ol>
      </div>
    );
  }

  // ── Generic camera error ────────────────────────────────────────────────────
  if (cameraError) {
    return (
      <div
        className="
          flex flex-col items-center justify-center
          min-h-[60vh] md:min-h-[400px]
          bg-bg-base-dark rounded-lg-token
          border border-border-base-dark
          p-lg-token text-center
        "
        role="alert"
        aria-live="assertive"
      >
        <p className="text-sm-token text-text-danger-dark">
          Camera error: {cameraError}
        </p>
      </div>
    );
  }

  // ── Scanner UI ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-md-token w-full">
      {/* Inactive state — waiting for expo selection */}
      {!isActive && (
        <div
          className="
            flex items-center justify-center
            min-h-[60vh] md:min-h-[400px] w-full
            bg-bg-base-dark rounded-lg-token
            border border-border-base-dark
          "
          aria-label="Scanner inactive"
        >
          <p className="text-sm-token text-text-muted-dark">
            Select an expo above to activate the scanner
          </p>
        </div>
      )}

      {/* Camera starting spinner — only show while isActive and starting */}
      {isActive && isStarting && (
        <div
          className="
            flex flex-col items-center justify-center gap-sm-token
            min-h-[60vh] md:min-h-[400px] w-full
            bg-bg-base-dark rounded-lg-token
            border border-border-base-dark
          "
          aria-live="polite"
          aria-label="Starting camera"
        >
          <div
            className="w-8 h-8 rounded-full border-2 border-brand-primary-dark border-t-transparent animate-spin"
            role="progressbar"
            aria-label="Loading camera"
          />
          <p className="text-sm-token text-text-secondary-dark">
            Starting camera…
          </p>
        </div>
      )}

      {/*
       * html5-qrcode mounts its viewfinder into this div.
       * It must be in the DOM before Html5Qrcode.start() is called.
       * We keep it visible only when isActive and not yet errored.
       * The min-h ensures the viewport fills correctly on mobile (REQ-8.11).
       */}
      <div
        id={QR_READER_ID}
        className={[
          'w-full rounded-lg-token overflow-hidden',
          'min-h-[60vh] md:min-h-[400px]',
          // Hide the div (but keep it in DOM) when inactive or still starting
          !isActive || isStarting ? 'hidden' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="QR code scanner viewfinder"
      />

      {/* Debounce notice */}
      {isActive && !isStarting && !cameraError && (
        <p className="text-xs-token text-text-muted-dark text-center">
          Same ticket will not trigger a duplicate scan within 5 seconds
        </p>
      )}
    </div>
  );
}
