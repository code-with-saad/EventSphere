import { useState, useEffect, useCallback } from 'react';
import QRScanner from '../../components/scanner/QRScanner';
import ScanResultDisplay, { ScanResult } from '../../components/scanner/ScanResultDisplay';
import { expoService } from '../../services/expoService';
import { ticketService } from '../../services/ticketService';
import { BentoCard } from '../../components/common/BentoCard';
import { ScanLine, Calendar, AlertCircle } from 'lucide-react';

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
 * Mobile-first, card-structured layout with BentoCard containment.
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
        // ticketService.checkIn returns data object directly: { result, attendeeName, checkedInAt, expoName }
        const result: ScanResult = data?.result ?? 'invalid_ticket';
        setAttendeeName(data?.attendeeName || undefined);
        setCheckedInAt(data?.checkedInAt || undefined);
        setScanResult(result);
      } catch (err: unknown) {
        setScanResult('invalid_ticket');
      } finally {
        setIsChecking(false);
      }
    },
    [selectedExpoId, isChecking]
  );

  // ── Derived values ─────────────────────────────────────────────────────────
  const selectedExpo = expos.find((e) => e._id === selectedExpoId);

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-md-token py-lg-token md:py-xl-token flex flex-col gap-lg-token">

        {/* Page Header Block */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-sm-token">
            <div className="w-10 h-10 rounded-lg-token bg-brand-primary-dark/20 border border-brand-primary-dark/30 flex items-center justify-center text-brand-primary-dark">
              <ScanLine className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl-token md:text-2xl-token font-bold text-text-primary-dark leading-tight-token">
                Ticket Scanner
              </h1>
              <p className="text-xs-token text-text-secondary-dark">
                Validate attendee QR passes in real time
              </p>
            </div>
          </div>
        </div>

        {/* ── Expo selector section inside BentoCard ─────────────────────── */}
        <BentoCard>
          <div className="flex flex-col gap-sm-token p-xs-token">
            <label
              htmlFor="expo-select"
              className="text-xs-token font-semibold uppercase tracking-wider text-text-secondary-dark"
            >
              Select Active Event
            </label>

            {/* Loading state */}
            {exposLoading && (
              <div className="flex items-center gap-sm-token py-sm-token">
                <div
                  className="w-4 h-4 rounded-full border-2 border-brand-primary-dark border-t-transparent animate-spin"
                  role="progressbar"
                  aria-label="Loading expos"
                />
                <span className="text-sm-token text-text-muted-dark">
                  Loading active expos…
                </span>
              </div>
            )}

            {/* Error state */}
            {!exposLoading && exposError && (
              <div className="p-sm-token rounded-md-token bg-bg-danger-dark border border-text-danger-dark/40 flex items-center gap-xs-token text-sm-token text-text-danger-dark">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{exposError}</span>
              </div>
            )}

            {/* No ongoing expos empty state */}
            {!exposLoading && !exposError && expos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-lg-token gap-sm-token text-center">
                <div className="w-12 h-12 rounded-xl-token bg-bg-hover-dark flex items-center justify-center text-text-muted-dark">
                  <Calendar className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-base-token font-semibold text-text-primary-dark">
                  No Live Expos Available
                </h3>
                <p className="text-xs-token text-text-secondary-dark max-w-xs">
                  Only ongoing events are eligible for QR check-ins. Make sure your expo is set to 'Ongoing' status.
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
                  bg-bg-surface-dark
                  border border-border-base-dark
                  text-text-primary-dark
                  rounded-md-token
                  px-md-token py-sm-token
                  text-sm-token font-medium
                  focus:border-brand-primary-dark focus:outline-none
                  w-full transition-colors cursor-pointer
                "
              >
                <option value="" disabled>
                  Select an expo to activate viewfinder…
                </option>
                {expos.map((expo) => (
                  <option key={expo._id} value={expo._id}>
                    {expo.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </BentoCard>

        {/* ── Scanner Viewfinder and Results Area inside BentoCard ───────── */}
        {!exposLoading && !exposError && expos.length > 0 && (
          <BentoCard>
            <div className="flex flex-col gap-md-token p-xs-token">
              
              {/* Header inside card when active */}
              {selectedExpo ? (
                <div className="flex items-center justify-between border-b border-glass-border-dark/60 pb-sm-token">
                  <span className="text-xs-token text-text-secondary-dark">
                    Active Station
                  </span>
                  <span className="text-sm-token font-semibold text-brand-primary-dark truncate max-w-[280px]">
                    {selectedExpo.name}
                  </span>
                </div>
              ) : (
                <div className="text-xs-token text-text-secondary-dark border-b border-glass-border-dark/60 pb-sm-token">
                  Camera Viewfinder
                </div>
              )}

              {/* Viewfinder or instruction placeholder */}
              {!selectedExpoId ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] md:min-h-[360px] rounded-lg-token border border-dashed border-border-base-dark bg-bg-surface-dark/40 text-center p-lg-token gap-sm-token">
                  <ScanLine className="w-10 h-10 text-text-muted-dark animate-pulse" aria-hidden="true" />
                  <p className="text-sm-token font-medium text-text-secondary-dark">
                    Camera is currently standby
                  </p>
                  <p className="text-xs-token text-text-muted-dark max-w-xs">
                    Choose an ongoing expo from the dropdown above to initialize the QR camera reader.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-md-token">
                  {/* QR scanner viewfinder */}
                  <div className="rounded-lg-token overflow-hidden border border-border-base-dark">
                    <QRScanner
                      isActive={!!selectedExpoId}
                      onScan={handleScan}
                    />
                  </div>

                  {/* Processing indicator */}
                  {isChecking && (
                    <div
                      className="flex items-center justify-center gap-sm-token py-sm-token bg-brand-primary-dark/10 rounded-md-token border border-brand-primary-dark/20"
                      aria-live="polite"
                    >
                      <div
                        className="w-4 h-4 rounded-full border-2 border-brand-primary-dark border-t-transparent animate-spin"
                        role="progressbar"
                        aria-label="Processing check-in"
                      />
                      <span className="text-sm-token font-medium text-brand-primary-dark">
                        Verifying ticket…
                      </span>
                    </div>
                  )}

                  {/* Scan result feedback banner */}
                  <ScanResultDisplay
                    result={scanResult}
                    onDismiss={() => setScanResult(null)}
                    attendeeName={attendeeName}
                    checkedInAt={checkedInAt}
                    expoName={selectedExpo?.name}
                  />
                </div>
              )}

            </div>
          </BentoCard>
        )}

      </div>
    </div>
  );
}
