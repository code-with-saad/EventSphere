import { useState, useEffect, useRef, useMemo } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ConflictWarning from './ConflictWarning';

export interface SessionFormData {
  title: string;
  speakerName: string;
  startTime: string;   // ISO datetime string
  endTime: string;     // ISO datetime string
  room: string;
  description?: string;
  track?: string;
}

interface SessionFormErrors {
  title?: string;
  speakerName?: string;
  day?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
}

interface ConflictingSession {
  title: string;
  startTime: string | Date;
  endTime: string | Date;
}

interface ExpoContext {
  _id?: string;
  startDate: string | Date;
  endDate: string | Date;
  zones?: { name: string; boothCount?: number }[];
}

interface SessionFormProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: Partial<SessionFormData>;
  expo?: ExpoContext | null;
  conflictError?: ConflictingSession | null;
  isSubmitting?: boolean;
  onSubmit: (data: SessionFormData) => Promise<void>;
  onClose: () => void;
}

/**
 * Format Date to "YYYY-MM-DD"
 */
function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Format Date to "HH:mm" (24-hour time)
 */
function toTimeKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SessionForm({
  isOpen,
  mode,
  initialData,
  expo,
  conflictError,
  isSubmitting = false,
  onSubmit,
  onClose,
}: SessionFormProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Generate available calendar days from expo.startDate to expo.endDate
  const expoDays = useMemo(() => {
    if (!expo?.startDate || !expo?.endDate) return [];
    const start = new Date(expo.startDate);
    const end = new Date(expo.endDate);

    const days: { key: string; label: string; date: Date }[] = [];
    const curr = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    let dayNum = 1;
    while (curr <= last) {
      const dateObj = new Date(curr);
      const key = toDateKey(dateObj);
      const formatted = dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      days.push({
        key,
        label: `Day ${dayNum} (${formatted})`,
        date: dateObj,
      });
      curr.setDate(curr.getDate() + 1);
      dayNum++;
    }
    return days;
  }, [expo?.startDate, expo?.endDate]);

  // Form field state
  const [title, setTitle] = useState('');
  const [speakerName, setSpeakerName] = useState('');
  const [selectedDayKey, setSelectedDayKey] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [endTimeStr, setEndTimeStr] = useState('10:00');
  const [room, setRoom] = useState('');
  const [isCustomRoom, setIsCustomRoom] = useState(false);
  const [description, setDescription] = useState('');
  const [track, setTrack] = useState('');
  const [errors, setErrors] = useState<SessionFormErrors>({});

  // Populate form when initialData or modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (initialData?.startTime) {
      const startD = new Date(initialData.startTime);
      const endD = initialData.endTime ? new Date(initialData.endTime) : startD;

      setTitle(initialData.title ?? '');
      setSpeakerName(initialData.speakerName ?? '');
      setSelectedDayKey(toDateKey(startD));
      setStartTimeStr(toTimeKey(startD));
      setEndTimeStr(toTimeKey(endD));

      const initialRoom = initialData.room ?? '';
      setRoom(initialRoom);

      const zoneNames = (expo?.zones || []).map((z) => z.name);
      if (zoneNames.length > 0 && !zoneNames.includes(initialRoom) && initialRoom !== '') {
        setIsCustomRoom(true);
      } else {
        setIsCustomRoom(false);
      }

      setDescription(initialData.description ?? '');
      setTrack(initialData.track ?? '');
    } else {
      setTitle('');
      setSpeakerName('');
      setSelectedDayKey(expoDays[0]?.key || '');
      setStartTimeStr('09:00');
      setEndTimeStr('10:00');

      const defaultRoom = expo?.zones && expo.zones.length > 0 ? expo.zones[0].name : '';
      setRoom(defaultRoom);
      setIsCustomRoom(false);
      setDescription('');
      setTrack('');
    }
    setErrors({});
  }, [initialData, isOpen, expoDays, expo?.zones]);

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen) setTimeout(() => titleInputRef.current?.focus(), 50);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate overnight status
  const isOvernight = Boolean(startTimeStr && endTimeStr && endTimeStr <= startTimeStr);

  const buildResolvedDates = (): { start: Date; end: Date } | null => {
    if (!selectedDayKey || !startTimeStr || !endTimeStr) return null;

    const [sHours, sMinutes] = startTimeStr.split(':').map(Number);
    const [eHours, eMinutes] = endTimeStr.split(':').map(Number);

    const [year, month, day] = selectedDayKey.split('-').map(Number);
    const startDate = new Date(year, month - 1, day, sHours, sMinutes, 0, 0);

    let endDate: Date;
    if (endTimeStr <= startTimeStr) {
      // Overnight: rolls over to next calendar day
      const nextDay = new Date(year, month - 1, day + 1, eHours, eMinutes, 0, 0);
      endDate = nextDay;
    } else {
      endDate = new Date(year, month - 1, day, eHours, eMinutes, 0, 0);
    }

    return { start: startDate, end: endDate };
  };

  const validate = (): SessionFormErrors => {
    const e: SessionFormErrors = {};
    if (!title.trim()) e.title = 'Title is required';
    if (!speakerName.trim()) e.speakerName = 'Speaker name is required';
    if (!selectedDayKey) e.day = 'Day is required';
    if (!startTimeStr) e.startTime = 'Start time is required';
    if (!endTimeStr) e.endTime = 'End time is required';

    if (selectedDayKey && startTimeStr && endTimeStr) {
      const dates = buildResolvedDates();
      if (dates && expo?.startDate && expo?.endDate) {
        const expoStart = new Date(expo.startDate);
        const expoEnd = new Date(expo.endDate);

        if (dates.start < expoStart || dates.end > expoEnd) {
          e.endTime = 'Session times fall outside the expo date bounds';
        }
      }
    }

    if (!room.trim()) e.room = 'Room is required';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const dates = buildResolvedDates();
    if (!dates) return;

    await onSubmit({
      title: title.trim(),
      speakerName: speakerName.trim(),
      startTime: dates.start.toISOString(),
      endTime: dates.end.toISOString(),
      room: room.trim(),
      description: description.trim() || undefined,
      track: track.trim() || undefined,
    });
  };

  // ── Shared styles ────────────────────────────────────────────────────────────

  const labelClass = `block text-sm-token font-medium mb-xs-token ${
    isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
  }`;

  const inputClass = (hasError?: string) =>
    `w-full rounded-md-token border px-sm-token py-xs-token text-sm-token outline-none transition-colors ${
      hasError
        ? isDarkMode
          ? 'border-text-danger-dark'
          : 'border-text-danger-light'
        : isDarkMode
        ? 'border-border-base-dark focus:border-brand-primary-dark'
        : 'border-border-base-light focus:border-brand-primary-light'
    } ${
      isDarkMode
        ? 'bg-bg-surface-dark text-text-primary-dark placeholder:text-text-secondary-dark'
        : 'bg-bg-surface-light text-text-primary-light placeholder:text-text-secondary-light'
    }`;

  const errorClass = `mt-xs-token text-xs-token ${
    isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
  }`;

  const requiredStar = (
    <span
      aria-hidden="true"
      className={isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}
    >
      {' '}
      *
    </span>
  );

  const availableZones = expo?.zones ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-md-token"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Panel */}
      <div
        className={`relative z-10 w-full max-w-lg rounded-xl-token border backdrop-blur-md overflow-y-auto max-h-[90vh] ${
          isDarkMode
            ? 'bg-glass-dark border-glass-border-dark'
            : 'bg-glass-light border-glass-border-light'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-lg-token py-md-token border-b ${
            isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'
          }`}
        >
          <h2
            id="session-form-title"
            className={`text-base-token font-semibold ${
              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
            }`}
          >
            {mode === 'create' ? 'Add Session' : 'Edit Session'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`w-8 h-8 flex items-center justify-center rounded-md-token transition-colors ${
              isDarkMode
                ? 'text-text-secondary-dark hover:text-text-primary-dark hover:bg-bg-hover-dark'
                : 'text-text-secondary-light hover:text-text-primary-light hover:bg-bg-hover-light'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form body */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="px-lg-token py-md-token flex flex-col gap-md-token"
        >
          {/* Conflict warning — shown when API returns ROOM_CONFLICT */}
          {conflictError && <ConflictWarning conflictingSession={conflictError} />}

          {/* Title */}
          <div>
            <label htmlFor="session-title" className={labelClass}>
              Title{requiredStar}
            </label>
            <input
              ref={titleInputRef}
              id="session-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Opening Keynote"
              className={inputClass(errors.title)}
              aria-describedby={errors.title ? 'session-title-error' : undefined}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p id="session-title-error" role="alert" className={errorClass}>
                {errors.title}
              </p>
            )}
          </div>

          {/* Speaker */}
          <div>
            <label htmlFor="session-speaker" className={labelClass}>
              Speaker Name{requiredStar}
            </label>
            <input
              id="session-speaker"
              type="text"
              value={speakerName}
              onChange={(e) => setSpeakerName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className={inputClass(errors.speakerName)}
              aria-describedby={errors.speakerName ? 'session-speaker-error' : undefined}
              aria-invalid={!!errors.speakerName}
            />
            {errors.speakerName && (
              <p id="session-speaker-error" role="alert" className={errorClass}>
                {errors.speakerName}
              </p>
            )}
          </div>

          {/* Day of the Expo */}
          <div>
            <label htmlFor="session-day" className={labelClass}>
              Expo Day{requiredStar}
            </label>
            {expoDays.length > 0 ? (
              <select
                id="session-day"
                value={selectedDayKey}
                onChange={(e) => setSelectedDayKey(e.target.value)}
                className={inputClass(errors.day)}
              >
                {expoDays.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="session-day"
                type="date"
                value={selectedDayKey}
                onChange={(e) => setSelectedDayKey(e.target.value)}
                className={inputClass(errors.day)}
              />
            )}
            {errors.day && (
              <p id="session-day-error" role="alert" className={errorClass}>
                {errors.day}
              </p>
            )}
          </div>

          {/* Time Picker: Start Time + End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md-token">
            <div>
              <label htmlFor="session-start-time" className={labelClass}>
                Start Time{requiredStar}
              </label>
              <input
                id="session-start-time"
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                className={inputClass(errors.startTime)}
                aria-describedby={errors.startTime ? 'session-start-error' : undefined}
                aria-invalid={!!errors.startTime}
              />
              {errors.startTime && (
                <p id="session-start-error" role="alert" className={errorClass}>
                  {errors.startTime}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="session-end-time" className={labelClass}>
                End Time{requiredStar}
              </label>
              <input
                id="session-end-time"
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                className={inputClass(errors.endTime)}
                aria-describedby={errors.endTime ? 'session-end-error' : undefined}
                aria-invalid={!!errors.endTime}
              />
              {errors.endTime && (
                <p id="session-end-error" role="alert" className={errorClass}>
                  {errors.endTime}
                </p>
              )}
            </div>
          </div>

          {/* Overnight Notice */}
          {isOvernight && (
            <div
              className={`p-xs-token px-sm-token rounded-md-token flex items-center gap-1.5 text-xs-token border ${
                isDarkMode
                  ? 'bg-brand-primary-dark/10 text-brand-primary-dark border-brand-primary-dark/20'
                  : 'bg-brand-primary-light/10 text-brand-primary-light border-brand-primary-light/20'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Overnight session: rolls into the following day ({endTimeStr} AM/PM).</span>
            </div>
          )}

          {/* Room Selection */}
          <div>
            <label htmlFor="session-room" className={labelClass}>
              Room / Location{requiredStar}
            </label>
            {availableZones.length > 0 ? (
              <div className="flex flex-col gap-xs-token">
                <select
                  id="session-room"
                  value={isCustomRoom ? '__custom__' : room}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomRoom(true);
                      setRoom('');
                    } else {
                      setIsCustomRoom(false);
                      setRoom(e.target.value);
                    }
                  }}
                  className={inputClass(errors.room)}
                >
                  {availableZones.map((z) => (
                    <option key={z.name} value={z.name}>
                      {z.name} ({z.boothCount ?? 0} booths)
                    </option>
                  ))}
                  <option value="__custom__">+ Custom Room / Stage...</option>
                </select>

                {isCustomRoom && (
                  <div className="mt-1">
                    <input
                      type="text"
                      placeholder="Enter custom room name (e.g. Auditorium B, Workshop Lab)"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      className={inputClass(errors.room)}
                    />
                    <p
                      className={`text-[11px] mt-0.5 ${
                        isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                      }`}
                    >
                      Custom location not defined in primary floorplan zones.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input
                  id="session-room"
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. Main Auditorium, Hall A"
                  className={inputClass(errors.room)}
                  aria-describedby={errors.room ? 'session-room-error' : undefined}
                  aria-invalid={!!errors.room}
                />
                <p
                  className={`text-[11px] mt-0.5 ${
                    isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                  }`}
                >
                  No zones configured for this expo — enter a freeform room.
                </p>
              </div>
            )}
            {errors.room && (
              <p id="session-room-error" role="alert" className={errorClass}>
                {errors.room}
              </p>
            )}
          </div>

          {/* Track (optional) */}
          <div>
            <label htmlFor="session-track" className={labelClass}>
              Track{' '}
              <span
                className={`font-regular ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                (optional)
              </span>
            </label>
            <input
              id="session-track"
              type="text"
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              placeholder="e.g. Technical, Business, Workshop"
              className={inputClass()}
            />
          </div>

          {/* Description (optional) */}
          <div>
            <label htmlFor="session-description" className={labelClass}>
              Description{' '}
              <span
                className={`font-regular ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                (optional)
              </span>
            </label>
            <textarea
              id="session-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the session…"
              className={`${inputClass()} resize-none`}
            />
          </div>

          {/* Footer actions */}
          <div
            className={`flex justify-end gap-sm-token pt-sm-token border-t ${
              isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`px-md-token py-xs-token rounded-md-token text-sm-token font-medium border transition-colors disabled:opacity-60 ${
                isDarkMode
                  ? 'border-border-base-dark text-text-primary-dark hover:bg-bg-hover-dark'
                  : 'border-border-base-light text-text-primary-light hover:bg-bg-hover-light'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-md-token py-xs-token rounded-md-token text-sm-token font-semibold transition-colors disabled:opacity-60 ${
                isDarkMode
                  ? 'bg-brand-primary-dark text-text-on-primary-dark hover:opacity-90'
                  : 'bg-brand-primary-light text-text-on-primary-light hover:opacity-90'
              }`}
            >
              {isSubmitting ? 'Saving…' : mode === 'create' ? 'Add Session' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
