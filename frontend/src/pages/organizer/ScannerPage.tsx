import { useState, useEffect, useCallback } from 'react';
import QRScanner from '../../components/scanner/QRScanner';
import ScanResultDisplay, { ScanResult } from '../../components/scanner/ScanResultDisplay';
import { expoService } from '../../services/expoService';
import { ticketService } from '../../services/ticketService';

interface OngoingExpo {
  _id: string;
  name: string;
  status: string;
}

/**
 * ScannerPage
 *
 * Organizer-only ticket check-in scanner page.
 * Always rendered in dark mode (REQ-8.10) — no ThemeContext dependency.
 * Mobile-first, flat fills only, no glassmorphism, no box shadows.
 */
export default function ScannerPage() {
  // ── Expo list state ────────────────────────────────────────────────────────
  const [expos, setExpos] = useState<OngoingExpo[]>([]);
  const [exposLoading, setExposLoading] = useState(true);
  const [exposError, setExposError] = useState<string | null>(null);

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectedExpoId, setSelectedExpoId] = useState<string>('');

  // ── Scan result state ──────────────────────────────────────────────────────
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [attendeeName, setAttendeeName] = useState<string | undefined>(undefined);
  const [checkedInAt, setCheckedInAt] = useState<string | undefined>(undefined);

  // ── In-flight guard (prevents double-submission during processing) ─────────
  const [isChecking, setIsChecking] = useState(false);

  // ── Fetch organizer's expos on mount, filter to ongoing ───────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchExpos = async () => {
      setExposLoading(true);
      setExposError(null);
      try {
        const all: OngoingExpo[] = await expoService.listMine();
        if (!cancelled) {
          setExpos(all.filter((e) => e.status === 'ongoing'));
        }
      } catch {
        if (!cancelled) {
          setExposError('Failed to load expos. Please refresh the page.');
        }
      } finally {
        if (!cancelled) {
          setExposLoading(false);
        }
      }
    };

    fetchExpos();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Scan handler ───────────────────────────────────────────────────────────
  const handleScan = useCallback(
    async (ticketId: string) => {
      // Guard: ignore if no expo selected or another check-in is in flight
      if (!selectedExpoId || isChecking) return;

      setIsChecking(true);
      // Clear previous result before showing new one
      setScanResult(null);
      setAttendeeName(undefined);
      setCheckedInAt(undefined);

      try {
        const data = await ticketService.checkIn(ticketId, selectedExpoId);
        // Success: data = { attendeeName, checkedInAt }
        setAttendeeName(data?.attendeeName ?? undefined);
        setCheckedInAt(data?.checkedInAt ?? undefined);
        setScanResult('checked_in');
      } catch (err: unknown) {
        // Map API error codes to ScanResult values
        const code: string =
          (err as any)?.response?.data?.error ??
          (err as any)?.response?.data?.code ??
          '';

        let result: ScanResult;
        switch (code) {
          case 'TICKET_ALREADY_CHECKED_IN':
            result = 'already_checked_in';
            // The already_checked_in response may carry checkedInAt in error data
            setCheckedInAt(
              (err as any)?.response?.data?.data?.checkedInAt ?? undefined
            );
            break;
          case 'TICKET_NOT_FOUND':
          case 'TICKET_INVALID':
            result = 'invalid_ticket';
            break;
          case 'TICKET_CANCELLED':
            result = 'cancelled_ticket';
            break;
          case 'TICKET_WRONG_EXPO':
            result = 'wrong_event';
            break;
          default:
            result = 'invalid_ticket';
        }
        setScanResult(result);
      } finally {
        setIsChecking(false);
      }
    },
    [selectedExpoId, isChecking]
  );

  // ── Derived values ─────────────────────────────────────────────────────────
  const selectedExpo = expos.find((e) => e._id === selectedExpoId);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-base-dark">
      <div className="max-w-2xl mx-auto px-md-token py-lg-token flex flex-col gap-lg-token">

        {/* Page title */}
        <h2 className="text-2xl font-medium text-text-primary-dark">
          Ticket scanner
        </h2>

        {/* ── Expo selector section ─────────────────────────────────────── */}
        <div className="flex flex-col gap-sm-token">
          <label
            htmlFor="expo-select"
            className="text-sm-token font-medium text-text-secondary-dark"
          >
            Expo
          </label>

          {/* Loading state */}
          {exposLoading && (
            <div className="flex items-center gap-sm-token">
              <div
                className="w-4 h-4 rounded-full border-2 border-brand-primary-dark border-t-transparent animate-spin"
                role="progressbar"
                aria-label="Loading expos"
              />
              <span className="text-sm-token text-text-muted-dark">
                Loading expos…
              </span>
            </div>
          )}

          {/* Error state */}
          {!exposLoading && exposError && (
            <p className="text-sm-token text-text-danger-dark" role="alert">
              {exposError}
            </p>
          )}

          {/* No ongoing expos empty state */}
          {!exposLoading && !exposError && expos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-xl-token gap-xs-token text-center">
              <p className="text-base-token font-medium text-text-secondary-dark">
                No active expos
              </p>
              <p className="text-sm-token text-text-secondary-dark">
                Only ongoing expos can be scanned
              </p>
            </div>
          )}

          {/* Expo select dropdown */}
          {!exposLoading && !exposError && expos.length > 0 && (
            <select
              id="expo-select"
              value={selectedExpoId}
              onChange={(e) => {
                setSelectedExpoId(e.target.value);
                // Reset scan state when switching expos
                setScanResult(null);
                setAttendeeName(undefined);
                setCheckedInAt(undefined);
              }}
              className="
                bg-bg-surface1-dark
                border border-border-base-dark
                text-text-primary-dark
                rounded-lg-token
                px-md-token py-sm-token
                focus:border-brand-primary-dark focus:outline-none
                w-full
              "
            >
              <option value="" disabled>
                Select an expo to start scanning
              </option>
              {expos.map((expo) => (
                <option key={expo._id} value={expo._id}>
                  {expo.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ── Scanner area ─────────────────────────────────────────────── */}
        {/*
         * Only show the scanner section when there are expos to pick from
         * (or one is already selected). The QRScanner itself handles the
         * inactive state when selectedExpoId is empty.
         */}
        {!exposLoading && !exposError && (expos.length > 0 || selectedExpoId) && (
          <div className="flex flex-col gap-md-token">
            {/* Instruction when no expo selected yet */}
            {!selectedExpoId && (
              <div
                className="
                  flex items-center justify-center
                  min-h-[60vh] md:min-h-[400px]
                  rounded-lg-token
                  border border-border-base-dark
                  bg-bg-base-dark
                "
              >
                <p className="text-sm-token text-text-muted-dark text-center px-md-token">
                  Select an expo above to activate the scanner
                </p>
              </div>
            )}

            {/* Active scanner — only mount QRScanner when there's an expo to scan for */}
            {selectedExpoId && (
              <>
                {/* Selected expo context */}
                {selectedExpo && (
                  <p className="text-sm-token text-text-secondary-dark">
                    Scanning for:{' '}
                    <span className="text-text-primary-dark font-medium">
                      {selectedExpo.name}
                    </span>
                  </p>
                )}

                {/* QR scanner viewfinder — min-h-[60vh] handled inside QRScanner (REQ-8.11) */}
                <QRScanner
                  isActive={!!selectedExpoId}
                  onScan={handleScan}
                />

                {/* Scan result feedback banner */}
                <ScanResultDisplay
                  result={scanResult}
                  onDismiss={() => setScanResult(null)}
                  attendeeName={attendeeName}
                  checkedInAt={checkedInAt}
                  expoName={selectedExpo?.name}
                />

                {/* Processing indicator */}
                {isChecking && (
                  <div
                    className="flex items-center justify-center gap-sm-token py-sm-token"
                    aria-live="polite"
                  >
                    <div
                      className="w-4 h-4 rounded-full border-2 border-brand-primary-dark border-t-transparent animate-spin"
                      role="progressbar"
                      aria-label="Processing check-in"
                    />
                    <span className="text-sm-token text-text-secondary-dark">
                      Processing…
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
