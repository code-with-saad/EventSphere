import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRScanner from '../../components/scanner/QRScanner';
import ScanResultDisplay, { ScanResult } from '../../components/scanner/ScanResultDisplay';
import { ticketService } from '../../services/ticketService';
import { BentoCard } from '../../components/common/BentoCard';
import { ScanLine, ArrowLeft, Activity, ShieldCheck } from 'lucide-react';

interface CheckInLogItem {
  ticketId: string;
  attendeeName: string;
  expoName: string;
  checkedInAt: string;
  checkInCount: number;
}

/**
 * ScannerPage
 *
 * Fast-repeated organizer ticket scanner with automatic expo detection.
 * Always rendered in dark mode (REQ-8.10).
 */
export default function ScannerPage() {
  const navigate = useNavigate();

  // ── Scan result state ──────────────────────────────────────────────────────
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [attendeeName, setAttendeeName] = useState<string | undefined>(undefined);
  const [expoName, setExpoName] = useState<string | undefined>(undefined);
  const [checkedInAt, setCheckedInAt] = useState<string | undefined>(undefined);
  const [canCheckInAt, setCanCheckInAt] = useState<string | undefined>(undefined);
  const [checkInCount, setCheckInCount] = useState<number | undefined>(undefined);

  // ── Live Check-In Log state ─────────────────────────────────────────────────
  const [checkInLogs, setCheckInLogs] = useState<CheckInLogItem[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // ── Fetch recent check-ins across organizer's expos on mount ───────────────
  const fetchRecentLogs = useCallback(async () => {
    try {
      const data = await ticketService.getOrganizerAttendees({ status: 'checked_in' });
      const attendees: any[] = data?.attendees || [];
      const logs: CheckInLogItem[] = attendees
        .filter((a) => a.checkedInAt)
        .slice(0, 30)
        .map((a) => ({
          ticketId: a.ticketId,
          attendeeName: a.fullName,
          expoName: a.expoName,
          checkedInAt: a.checkedInAt,
          checkInCount: a.checkInCount || 1,
        }));
      setCheckInLogs(logs);
    } catch {
      // Quiet fail
    }
  }, []);

  useEffect(() => {
    fetchRecentLogs();
  }, [fetchRecentLogs]);

  // ── Scan handler (auto-detects expo) ────────────────────────────────────────
  const handleScan = useCallback(
    async (ticketId: string) => {
      if (isChecking) return;

      setIsChecking(true);
      setScanResult(null);
      setAttendeeName(undefined);
      setExpoName(undefined);
      setCheckedInAt(undefined);
      setCanCheckInAt(undefined);
      setCheckInCount(undefined);

      try {
        const data = await ticketService.checkIn(ticketId);
        const result: ScanResult = data?.result ?? 'invalid_ticket';
        setAttendeeName(data?.attendeeName || undefined);
        setExpoName(data?.expoName || undefined);
        setCheckedInAt(data?.checkedInAt || undefined);
        setCanCheckInAt(data?.canCheckInAt || undefined);
        setCheckInCount(data?.checkInCount || undefined);
        setScanResult(result);

        // Prepend to live log feed if valid check-in
        if (result === 'checked_in' && data?.attendeeName) {
          const newLog: CheckInLogItem = {
            ticketId,
            attendeeName: data.attendeeName,
            expoName: data.expoName || 'Event',
            checkedInAt: new Date().toISOString(),
            checkInCount: data.checkInCount || 1,
          };
          setCheckInLogs((prev) => [newLog, ...prev.slice(0, 29)]);
        }
      } catch (err: unknown) {
        setScanResult('invalid_ticket');
      } finally {
        setIsChecking(false);
      }
    },
    [isChecking]
  );

  return (
    <div className="min-h-screen bg-bg-root-dark text-text-primary-dark">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 flex flex-col gap-6">

        {/* Top Header Bar with Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-base-dark text-text-secondary-dark hover:text-text-primary-dark hover:bg-bg-hover-dark transition-colors text-sm font-medium"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-primary-dark/20 border border-brand-primary-dark/30 flex items-center justify-center text-brand-primary-dark">
              <ScanLine className="w-4 h-4" aria-hidden="true" />
            </div>
            <span className="text-sm font-bold text-text-primary-dark">
              EventSphere Scanner
            </span>
          </div>
        </div>

        {/* Viewfinder Container */}
        <BentoCard>
          <div className="flex flex-col gap-4 p-1">
            <div className="flex items-center justify-between border-b border-glass-border-dark/60 pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-secondary-dark">
                <ShieldCheck className="w-4 h-4 text-brand-primary-dark" />
                <span>Auto-Detect Viewfinder</span>
              </div>
              <span className="text-xs text-text-muted-dark">
                Ready for next pass
              </span>
            </div>

            {/* QR Scanner Component */}
            <div className="rounded-lg overflow-hidden border border-border-base-dark">
              <QRScanner isActive={true} onScan={handleScan} />
            </div>

            {/* In-flight verification indicator */}
            {isChecking && (
              <div
                className="flex items-center justify-center gap-2 py-2 bg-brand-primary-dark/10 rounded-md border border-brand-primary-dark/20"
                aria-live="polite"
              >
                <div
                  className="w-4 h-4 rounded-full border-2 border-brand-primary-dark border-t-transparent animate-spin"
                  role="progressbar"
                  aria-label="Processing check-in"
                />
                <span className="text-sm font-medium text-brand-primary-dark">
                  Verifying pass…
                </span>
              </div>
            )}

            {/* Result banner */}
            <ScanResultDisplay
              result={scanResult}
              onDismiss={() => setScanResult(null)}
              attendeeName={attendeeName}
              checkedInAt={checkedInAt}
              canCheckInAt={canCheckInAt}
              checkInCount={checkInCount}
              expoName={expoName}
            />
          </div>
        </BentoCard>

        {/* Live rolling check-in activity stream */}
        <BentoCard>
          <div className="flex flex-col gap-2 p-1">
            <div className="flex items-center justify-between border-b border-glass-border-dark/60 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary-dark">
                  Recent Check-In Stream
                </span>
              </div>
              <span className="text-xs font-mono text-brand-primary-dark">
                {checkInLogs.length} logged
              </span>
            </div>

            {checkInLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-muted-dark">
                No check-ins recorded yet. Scan a badge to begin.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-border-base-dark/20 pr-1">
                {checkInLogs.map((log, idx) => (
                  <div key={`${log.ticketId}-${idx}`} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex flex-col truncate">
                      <span className="font-semibold text-text-primary-dark truncate">
                        {log.attendeeName}
                      </span>
                      <span className="text-[11px] text-text-secondary-dark truncate">
                        {log.expoName} · Pass: {log.ticketId.slice(0, 8)}…
                      </span>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="font-mono text-[11px] text-emerald-400 font-medium">
                        {new Date(log.checkedInAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true,
                        })}
                      </span>
                      {log.checkInCount > 1 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold mt-0.5">
                          Day {log.checkInCount} Check-In
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </BentoCard>

      </div>
    </div>
  );
}
