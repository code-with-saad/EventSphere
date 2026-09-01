import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ConflictWarning from './ConflictWarning';

interface SessionFormData {
  title: string;
  speakerName: string;
  startTime: string;   // datetime-local string
  endTime: string;     // datetime-local string
  room: string;
  description?: string;
  track?: string;
}

interface SessionFormErrors {
  title?: string;
  speakerName?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
}

interface ConflictingSession {
  title: string;
  startTime: string | Date;
  endTime: string | Date;
}

interface SessionFormProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: Partial<SessionFormData>;
  conflictError?: ConflictingSession | null;
  isSubmitting?: boolean;
  onSubmit: (data: SessionFormData) => Promise<void>;
  onClose: () => void;
}

export default function SessionForm({
  isOpen,
  mode,
  initialData,
  conflictError,
  isSubmitting = false,
  onSubmit,
  onClose,
}: SessionFormProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<SessionFormData>({
    title: '',
    speakerName: '',
    startTime: '',
    endTime: '',
    room: '',
    description: '',
    track: '',
  });
  const [errors, setErrors] = useState<SessionFormErrors>({});

  // Populate form when initialData changes (edit mode)
  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title ?? '',
        speakerName: initialData.speakerName ?? '',
        startTime: initialData.startTime ?? '',
        endTime: initialData.endTime ?? '',
        room: initialData.room ?? '',
        description: initialData.description ?? '',
        track: initialData.track ?? '',
      });
    } else {
      setForm({ title: '', speakerName: '', startTime: '', endTime: '', room: '', description: '', track: '' });
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen) setTimeout(() => titleInputRef.current?.focus(), 50);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = (): SessionFormErrors => {
    const e: SessionFormErrors = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.speakerName.trim()) e.speakerName = 'Speaker name is required';
    if (!form.startTime) e.startTime = 'Start time is required';
    if (!form.endTime) {
      e.endTime = 'End time is required';
    } else if (form.startTime && new Date(form.endTime) <= new Date(form.startTime)) {
      e.endTime = 'End time must be after start time';
    }
    if (!form.room.trim()) e.room = 'Room is required';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    await onSubmit(form);
  };

  const update = (field: keyof SessionFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));

  // ── Shared styles ────────────────────────────────────────────────────────────

  const labelClass = `block text-sm-token font-medium mb-xs-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`;

  const inputClass = (hasError?: string) =>
    `w-full rounded-md-token border px-sm-token py-xs-token text-sm-token outline-none transition-colors ${
      hasError
        ? isDarkMode ? 'border-text-danger-dark' : 'border-text-danger-light'
        : isDarkMode ? 'border-border-base-dark focus:border-brand-primary-dark' : 'border-border-base-light focus:border-brand-primary-light'
    } ${isDarkMode ? 'bg-bg-surface-dark text-text-primary-dark placeholder:text-text-secondary-dark' : 'bg-bg-surface-light text-text-primary-light placeholder:text-text-secondary-light'}`;

  const errorClass = `mt-xs-token text-xs-token ${isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}`;

  const requiredStar = <span aria-hidden="true" className={isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}> *</span>;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-md-token"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

      {/* Panel */}
      <div className={`relative z-10 w-full max-w-lg rounded-xl-token border shadow-xl overflow-y-auto max-h-[90vh] ${
        isDarkMode ? 'bg-bg-surface-dark border-border-base-dark' : 'bg-bg-surface-light border-border-base-light'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-lg-token py-md-token border-b ${
          isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'
        }`}>
          <h2 id="session-form-title" className={`text-base-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
            {mode === 'create' ? 'Add Session' : 'Edit Session'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`w-8 h-8 flex items-center justify-center rounded-md-token transition-colors ${
              isDarkMode ? 'text-text-secondary-dark hover:text-text-primary-dark hover:bg-bg-hover-dark' : 'text-text-secondary-light hover:text-text-primary-light hover:bg-bg-hover-light'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} noValidate className="px-lg-token py-md-token flex flex-col gap-md-token">

          {/* Conflict warning — shown when API returns ROOM_CONFLICT */}
          {conflictError && <ConflictWarning conflictingSession={conflictError} />}

          {/* Title */}
          <div>
            <label htmlFor="session-title" className={labelClass}>Title{requiredStar}</label>
            <input
              ref={titleInputRef}
              id="session-title"
              type="text"
              value={form.title}
              onChange={update('title')}
              placeholder="e.g. Opening Keynote"
              className={inputClass(errors.title)}
              aria-describedby={errors.title ? 'session-title-error' : undefined}
              aria-invalid={!!errors.title}
            />
            {errors.title && <p id="session-title-error" role="alert" className={errorClass}>{errors.title}</p>}
          </div>

          {/* Speaker */}
          <div>
            <label htmlFor="session-speaker" className={labelClass}>Speaker Name{requiredStar}</label>
            <input
              id="session-speaker"
              type="text"
              value={form.speakerName}
              onChange={update('speakerName')}
              placeholder="e.g. Jane Doe"
              className={inputClass(errors.speakerName)}
              aria-describedby={errors.speakerName ? 'session-speaker-error' : undefined}
              aria-invalid={!!errors.speakerName}
            />
            {errors.speakerName && <p id="session-speaker-error" role="alert" className={errorClass}>{errors.speakerName}</p>}
          </div>

          {/* Start + End time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md-token">
            <div>
              <label htmlFor="session-start" className={labelClass}>Start Time{requiredStar}</label>
              <input
                id="session-start"
                type="datetime-local"
                value={form.startTime}
                onChange={update('startTime')}
                className={inputClass(errors.startTime)}
                aria-describedby={errors.startTime ? 'session-start-error' : undefined}
                aria-invalid={!!errors.startTime}
              />
              {errors.startTime && <p id="session-start-error" role="alert" className={errorClass}>{errors.startTime}</p>}
            </div>
            <div>
              <label htmlFor="session-end" className={labelClass}>End Time{requiredStar}</label>
              <input
                id="session-end"
                type="datetime-local"
                value={form.endTime}
                onChange={update('endTime')}
                className={inputClass(errors.endTime)}
                aria-describedby={errors.endTime ? 'session-end-error' : undefined}
                aria-invalid={!!errors.endTime}
              />
              {errors.endTime && <p id="session-end-error" role="alert" className={errorClass}>{errors.endTime}</p>}
            </div>
          </div>

          {/* Room */}
          <div>
            <label htmlFor="session-room" className={labelClass}>Room{requiredStar}</label>
            <input
              id="session-room"
              type="text"
              value={form.room}
              onChange={update('room')}
              placeholder="e.g. Hall A"
              className={inputClass(errors.room)}
              aria-describedby={errors.room ? 'session-room-error' : undefined}
              aria-invalid={!!errors.room}
            />
            {errors.room && <p id="session-room-error" role="alert" className={errorClass}>{errors.room}</p>}
          </div>

          {/* Track (optional) */}
          <div>
            <label htmlFor="session-track" className={labelClass}>
              Track{' '}
              <span className={`font-regular ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>(optional)</span>
            </label>
            <input
              id="session-track"
              type="text"
              value={form.track}
              onChange={update('track')}
              placeholder="e.g. Technical, Business, Workshop"
              className={inputClass()}
            />
          </div>

          {/* Description (optional) */}
          <div>
            <label htmlFor="session-description" className={labelClass}>
              Description{' '}
              <span className={`font-regular ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>(optional)</span>
            </label>
            <textarea
              id="session-description"
              rows={3}
              value={form.description}
              onChange={update('description')}
              placeholder="Brief description of the session…"
              className={`${inputClass()} resize-none`}
            />
          </div>

          {/* Footer actions */}
          <div className={`flex justify-end gap-sm-token pt-sm-token border-t ${isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'}`}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`px-md-token py-xs-token rounded-md-token text-sm-token font-medium border transition-colors disabled:opacity-60 ${
                isDarkMode ? 'border-border-base-dark text-text-primary-dark hover:bg-bg-hover-dark' : 'border-border-base-light text-text-primary-light hover:bg-bg-hover-light'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-md-token py-xs-token rounded-md-token text-sm-token font-semibold transition-colors disabled:opacity-60 ${
                isDarkMode ? 'bg-brand-primary-dark text-text-on-primary-dark hover:opacity-90' : 'bg-brand-primary-light text-text-on-primary-light hover:opacity-90'
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
