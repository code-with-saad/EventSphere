import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';
import { sessionService } from '../../services/sessionService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import BackButton from '../../components/layout/BackButton';
import SessionForm from '../../components/session/SessionForm';
import ScheduleGrid from '../../components/session/ScheduleGrid';
import DayTabs from '../../components/session/DayTabs';

// ── Types ────────────────────────────────────────────────────────────────────

// Use a type alias that is structurally compatible with ScheduleGrid's Session type
type Session = {
  _id: string;
  title: string;
  speakerName: string;
  startTime: string;
  endTime: string;
  room: string;
  track?: string;
  description?: string;
};

type ConflictingSession = {
  title: string;
  startTime: string | Date;
  endTime: string | Date;
};

type SessionFormData = {
  title: string;
  speakerName: string;
  startTime: string;
  endTime: string;
  room: string;
  description?: string;
  track?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert an ISO date string to the datetime-local input format: "YYYY-MM-DDThh:mm"
 */
function toDatetimeLocal(iso: string | Date): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Return a "YYYY-MM-DD" key for grouping sessions by calendar day (local time).
 */
function dayKey(iso: string | Date): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Build a sorted array of unique calendar days from a list of sessions.
 */
function extractDays(sessions: Session[]): Date[] {
  const seen = new Set<string>();
  sessions.forEach((s) => seen.add(dayKey(s.startTime)));
  return Array.from(seen)
    .sort()
    .map((k) => new Date(k + 'T00:00:00'));
}

/**
 * Filter sessions to those whose startTime falls on the given calendar day.
 */
function sessionsForDay(sessions: Session[], day: Date): Session[] {
  const key = dayKey(day);
  return sessions.filter((s) => dayKey(s.startTime) === key);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ScheduleBuilderPage() {
  const { id: expoId } = useParams<{ id: string }>();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Day navigation
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState<ConflictingSession | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchSessions = useCallback(async () => {
    if (!expoId) return;
    setLoading(true);
    setFetchError(null);
    try {
      const data = await sessionService.list(expoId);
      const list: Session[] = Array.isArray(data) ? data : [];
      // Sort ascending by startTime (REQ-6.1)
      list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      setSessions(list);
    } catch (err: any) {
      setFetchError(err?.response?.data?.message || err?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [expoId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Reset day index when sessions change (e.g. after deleting sessions on the last day)
  const days = extractDays(sessions);
  const safeDayIndex = Math.min(selectedDayIndex, Math.max(0, days.length - 1));

  // ── Modal helpers ──────────────────────────────────────────────────────────

  const openCreateModal = () => {
    setEditingSession(null);
    setConflictError(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEditModal = (session: any) => {
    setEditingSession(session as Session);
    setConflictError(null);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSession(null);
    setConflictError(null);
  };

  // Build initialData for SessionForm from the session being edited.
  // datetime-local inputs require "YYYY-MM-DDThh:mm" format.
  const editInitialData: Partial<SessionFormData> | undefined = editingSession
    ? {
        title: editingSession.title,
        speakerName: editingSession.speakerName,
        startTime: toDatetimeLocal(editingSession.startTime),
        endTime: toDatetimeLocal(editingSession.endTime),
        room: editingSession.room,
        description: editingSession.description ?? '',
        track: editingSession.track ?? '',
      }
    : undefined;

  // ── Submit handler (create + edit) ─────────────────────────────────────────

  const handleSubmit = async (formData: SessionFormData) => {
    if (!expoId) return;
    setIsSubmitting(true);
    setConflictError(null);

    try {
      if (modalMode === 'create') {
        await sessionService.create(expoId, formData);
        toast.success('Session added.');
      } else if (editingSession) {
        await sessionService.update(expoId, editingSession._id, formData);
        toast.success('Session updated.');
      }
      closeModal();
      await fetchSessions();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'ROOM_CONFLICT') {
        // Surface conflict detail inside the form (REQ-6.5)
        const conflict = err?.response?.data?.conflict;
        setConflictError(
          conflict
            ? {
                title: conflict.sessionTitle ?? conflict.title ?? 'Another session',
                startTime: conflict.startTime,
                endTime: conflict.endTime,
              }
            : { title: 'Another session', startTime: '', endTime: '' },
        );
        // Don't close the modal — let the organizer correct the times
      } else {
        toast.error(err?.response?.data?.message || err?.message || 'Failed to save session');
        closeModal();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete handler ─────────────────────────────────────────────────────────

  const handleDelete = async (sessionId: string) => {
    if (!expoId) return;

    const session = sessions.find((s) => s._id === sessionId);
    const sessionTitle = session?.title ?? 'this session';

    // Simple browser confirm — design doc says "keep it simple; no separate dialog"
    const confirmed = window.confirm(
      `Delete "${sessionTitle}"?\n\nThis will also remove all bookmarks for this session.`,
    );
    if (!confirmed) return;

    try {
      await sessionService.delete(expoId, sessionId);
      toast.success('Session deleted.');
      await fetchSessions();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete session');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const textPrimary = isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light';
  const textSecondary = isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light';
  const bgBase = ''; // transparent — blobs from PageBackground show through

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Schedule Builder" />
        <main className={`flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token ${bgBase}`}>

          {/* ── Page header ───────────────────────────────────────────────── */}
          <div className="mb-xl-token">
            <div className="mb-sm-token">
              <BackButton fallback="/organizer/expos" label="My Expos" />
            </div>
            <div className="flex flex-wrap items-end justify-between gap-md-token">
              <div>
                <h1 className={`text-xl-token font-semibold leading-tight-token ${textPrimary}`}>
                  Schedule Builder
                </h1>
                <p className={`mt-xs-token text-sm-token ${textSecondary}`}>
                  Manage sessions for this expo
                </p>
              </div>

              {/* Single primary CTA — "Add session" (REQ-6, one accent fill per view) */}
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-xs-token px-md-token py-sm-token rounded-[8px] text-sm-token font-semibold transition-colors bg-[#FF4D2E] text-[#2C0B03] hover:bg-[#E8451F]"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Add session
              </button>
            </div>
          </div>

          {/* ── Loading ───────────────────────────────────────────────────── */}
          {loading && (
            <div className={`text-center py-xl-token text-sm-token ${textSecondary}`}>
              Loading sessions…
            </div>
          )}

          {/* ── Fetch error ───────────────────────────────────────────────── */}
          {!loading && fetchError && (
            <div className={`text-center py-xl-token text-sm-token ${isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}`}>
              {fetchError}
            </div>
          )}

          {/* ── Content: DayTabs + ScheduleGrid ───────────────────────────── */}
          {!loading && !fetchError && (
            <>
              {sessions.length === 0 ? (
                // ── Empty state (REQ-6.1 — empty list) ──────────────────────
                <div className={`flex flex-col items-center text-center py-xl-token gap-md-token ${textSecondary}`}>
                  <Calendar className="w-10 h-10 opacity-40" aria-hidden="true" />
                  <p className={`text-base-token font-medium ${textPrimary}`}>No sessions yet</p>
                  <p className="text-sm-token">
                    Add your first session to start building the schedule.
                  </p>
                  <button
                    onClick={openCreateModal}
                    className={`px-md-token py-xs-token rounded-[8px] text-sm-token font-medium border transition-colors ${
                      isDarkMode
                        ? 'border-[#3A3A3F] text-[#F2F1ED] bg-transparent hover:bg-bg-hover-dark'
                        : 'border-[#3A3A3F] text-[#F2F1ED] bg-transparent hover:bg-bg-hover-light'
                    }`}
                  >
                    Add session
                  </button>
                </div>
              ) : (
                <>
                  {/* DayTabs — only shown when expo spans multiple days (REQ-6.8) */}
                  {days.length > 1 && (
                    <div className="mb-lg-token">
                      <DayTabs
                        days={days}
                        selectedIndex={safeDayIndex}
                        onSelect={setSelectedDayIndex}
                      />
                    </div>
                  )}

                  {/* Session count label */}
                  <p className={`text-xs-token mb-md-token ${textSecondary}`}>
                    {days.length > 1
                      ? `${sessionsForDay(sessions, days[safeDayIndex]).length} session${sessionsForDay(sessions, days[safeDayIndex]).length === 1 ? '' : 's'} on this day`
                      : `${sessions.length} session${sessions.length === 1 ? '' : 's'}`}
                  </p>

                  {/* ScheduleGrid for the selected day */}
                  <ScheduleGrid
                    sessions={
                      days.length > 1
                        ? sessionsForDay(sessions, days[safeDayIndex])
                        : sessions
                    }
                    isOrganizer
                    showBookmarks={false}
                    onEditSession={openEditModal}
                    onDeleteSession={handleDelete}
                  />
                </>
              )}
            </>
          )}
        </main>
      </div>
      <BottomNav />

      {/* ── SessionForm modal ─────────────────────────────────────────────── */}
      <SessionForm
        isOpen={isModalOpen}
        mode={modalMode}
        initialData={editInitialData}
        conflictError={conflictError}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />
    </div>
  );
}
