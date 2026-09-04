import { useState } from 'react';
import { X, MessageSquarePlus, Loader2, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import {
  feedbackService,
  FeedbackCategory,
} from '../../services/feedbackService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

const CATEGORIES: { value: FeedbackCategory; label: string; emoji: string }[] = [
  { value: 'bug',             label: 'Bug Report',       emoji: '🐛' },
  { value: 'feature_request', label: 'Feature Request',  emoji: '✨' },
  { value: 'general',         label: 'General Feedback', emoji: '💬' },
  { value: 'billing',         label: 'Billing Issue',    emoji: '💳' },
  { value: 'other',           label: 'Other',            emoji: '📝' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function FeedbackModal({ onClose }: Props) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (subject.trim().length < 5) {
      setError('Subject must be at least 5 characters.');
      return;
    }
    if (message.trim().length < 10) {
      setError('Message must be at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await feedbackService.submit({ category, subject: subject.trim(), message: message.trim() });
      setSubmitted(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Failed to submit feedback. Try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Theme helpers ───────────────────────────────────────────────────────────
  const bg = isDark ? 'bg-[#18181b]' : 'bg-white';
  const border = isDark ? 'border-white/10' : 'border-gray-200';
  const text = isDark ? 'text-[#f4f4f5]' : 'text-[#18181b]';
  const muted = isDark ? 'text-[#a1a1aa]' : 'text-[#71717a]';
  const inputBg = isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200';
  const inputText = isDark ? 'text-white placeholder:text-[#71717a]' : 'text-gray-900 placeholder:text-gray-400';
  const chipBase = 'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 cursor-pointer select-none';
  const chipActive = isDark
    ? 'bg-[#FF4D2E]/20 border-[#FF4D2E] text-[#FF4D2E]'
    : 'bg-[#FF4D2E]/10 border-[#FF4D2E] text-[#c0391f]';
  const chipInactive = isDark
    ? 'bg-white/5 border-white/10 text-[#a1a1aa] hover:border-white/25'
    : 'bg-gray-100 border-gray-200 text-gray-600 hover:border-gray-400';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl ${bg} ${border}`}
        style={{ animation: 'fadeScaleIn 0.2s ease' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-5 pb-4 border-b ${border}`}>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#FF4D2E]/15">
              <MessageSquarePlus className="w-5 h-5 text-[#FF4D2E]" />
            </span>
            <div>
              <h2 className={`text-base font-semibold ${text}`}>Send Feedback</h2>
              <p className={`text-xs ${muted}`}>Help us improve EventSphere</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/10 text-[#a1a1aa]' : 'hover:bg-gray-100 text-gray-500'
            }`}
            aria-label="Close feedback modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {submitted ? (
            /* Success state */
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <span className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15">
                <CheckCircle2 className="w-9 h-9 text-emerald-500" />
              </span>
              <div>
                <p className={`text-base font-semibold ${text}`}>Feedback received!</p>
                <p className={`text-sm mt-1 ${muted}`}>
                  Thank you for helping us make EventSphere better. We'll review it shortly.
                </p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#FF4D2E] hover:bg-[#e03d1f] transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Category chips */}
              <div>
                <label className={`block text-xs font-medium mb-2 ${muted}`}>Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`${chipBase} ${category === cat.value ? chipActive : chipInactive}`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${muted}`}>Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={120}
                  placeholder="Brief summary of your feedback..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all outline-none focus:ring-2 focus:ring-[#FF4D2E]/40 ${inputBg} ${inputText}`}
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${muted}`}>Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  rows={5}
                  placeholder="Describe in detail what you experienced or what you'd like to see..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm resize-none transition-all outline-none focus:ring-2 focus:ring-[#FF4D2E]/40 ${inputBg} ${inputText}`}
                  required
                />
                <p className={`text-xs mt-1 text-right ${muted}`}>{message.length}/2000</p>
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs font-medium text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white bg-[#FF4D2E] hover:bg-[#e03d1f] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
