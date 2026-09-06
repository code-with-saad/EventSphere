import React, { useState } from 'react';
import { X, Star, Loader2, CheckCircle2, Building2, Presentation, Store } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { feedbackService, FeedbackRatings } from '../../services/feedbackService';

interface AttendeeRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  targetId: string;
  targetName: string;
  initialType?: 'general_exhibitor' | 'booth_visit' | 'session';
  boothLabel?: string;
  speakerName?: string;
}

const RATING_QUESTIONS: { key: keyof FeedbackRatings; label: string; description: string }[] = [
  {
    key: 'overallExperience',
    label: '1. Overall Experience',
    description: 'How would you rate your overall experience with this presentation / showcase?',
  },
  {
    key: 'staffOrSpeakerQuality',
    label: '2. Staff & Speaker Quality',
    description: 'How knowledgeable, helpful, and clear was the presenter / booth representative?',
  },
  {
    key: 'contentRelevance',
    label: '3. Content Relevance',
    description: 'How useful, relevant, and valuable was the information demonstrated?',
  },
  {
    key: 'engagementLevel',
    label: '4. Engagement & Interaction',
    description: 'How engaging was the demonstration, Q&A, or interactive material?',
  },
  {
    key: 'likelihoodToRecommend',
    label: '5. Likelihood to Recommend',
    description: 'How likely are you to recommend this product / session to industry peers?',
  },
];

export default function AttendeeRatingModal({
  isOpen,
  onClose,
  onSuccess,
  targetId,
  targetName,
  initialType = 'booth_visit',
  boothLabel,
  speakerName,
}: AttendeeRatingModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const isSession = initialType === 'session';
  const [feedbackType, setFeedbackType] = useState<'general_exhibitor' | 'booth_visit' | 'session'>(
    initialType
  );

  const [ratings, setRatings] = useState<FeedbackRatings>({
    overallExperience: 5,
    staffOrSpeakerQuality: 5,
    contentRelevance: 5,
    engagementLevel: 5,
    likelihoodToRecommend: 5,
  });
  const [hoveredRatings, setHoveredRatings] = useState<Partial<Record<keyof FeedbackRatings, number>>>({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStarClick = (key: keyof FeedbackRatings, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await feedbackService.submitRating({
        feedbackType,
        targetId,
        ratings,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
      onSuccess?.();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Failed to submit rating. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const bg = isDark ? 'bg-[#18181b]' : 'bg-white';
  const border = isDark ? 'border-white/10' : 'border-gray-200';
  const text = isDark ? 'text-[#f4f4f5]' : 'text-[#18181b]';
  const muted = isDark ? 'text-[#a1a1aa]' : 'text-[#71717a]';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className={`relative w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${bg} ${border}`}
        style={{ animation: 'fadeScaleIn 0.2s ease' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-5 pb-4 border-b ${border}`}>
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500">
              {isSession ? <Presentation className="w-5 h-5" /> : <Store className="w-5 h-5" />}
            </span>
            <div>
              <h2 className={`text-base font-bold leading-tight ${text}`}>
                {isSession ? 'Rate Session' : 'Rate Exhibitor Experience'}
              </h2>
              <p className={`text-xs ${muted} truncate max-w-sm font-medium`}>
                {targetName} {boothLabel ? `• Booth ${boothLabel}` : ''} {speakerName ? `• Speaker: ${speakerName}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/10 text-[#a1a1aa]' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {submitted ? (
          <div className="p-8 text-center flex flex-col items-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4 animate-bounce" />
            <h3 className={`text-lg font-bold mb-2 ${text}`}>Rating Submitted!</h3>
            <p className={`text-sm mb-6 max-w-sm ${muted}`}>
              Thank you for sharing your experience. Your ratings have been routed directly to the event organizers to help improve future showcases.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-brand-primary-dark text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Exhibitor sub-type toggle */}
            {!isSession && (
              <div className={`p-1 rounded-xl border flex gap-1 ${border} ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                <button
                  type="button"
                  onClick={() => setFeedbackType('booth_visit')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    feedbackType === 'booth_visit'
                      ? 'bg-brand-primary-dark text-white shadow-sm'
                      : isDark
                        ? 'text-[#a1a1aa] hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Booth Visit Rating</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackType('general_exhibitor')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    feedbackType === 'general_exhibitor'
                      ? 'bg-brand-primary-dark text-white shadow-sm'
                      : isDark
                        ? 'text-[#a1a1aa] hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>General Company Rating</span>
                </button>
              </div>
            )}

            {/* Star Rating Matrix */}
            <div className="space-y-4">
              {RATING_QUESTIONS.map((q) => {
                const currentVal = ratings[q.key];
                const activeHover = hoveredRatings[q.key] ?? currentVal;

                return (
                  <div
                    key={q.key}
                    className={`p-3.5 rounded-xl border transition-colors ${border} ${
                      isDark ? 'bg-white/[0.02]' : 'bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-xs font-bold ${text}`}>{q.label}</span>
                      <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                        {activeHover} / 5
                      </span>
                    </div>
                    <p className={`text-[11px] mb-2.5 ${muted}`}>{q.description}</p>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const filled = star <= activeHover;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleStarClick(q.key, star)}
                            onMouseEnter={() =>
                              setHoveredRatings((prev) => ({ ...prev, [q.key]: star }))
                            }
                            onMouseLeave={() =>
                              setHoveredRatings((prev) => ({ ...prev, [q.key]: undefined }))
                            }
                            className="p-1 text-gray-400 hover:scale-110 transition-transform focus:outline-none"
                            title={`${star} Star${star > 1 ? 's' : ''}`}
                          >
                            <Star
                              className={`w-6 h-6 transition-colors ${
                                filled
                                  ? 'fill-amber-400 text-amber-400'
                                  : isDark
                                    ? 'text-white/20'
                                    : 'text-gray-300'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Supplementary Comments */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${text}`}>
                Additional Comments <span className={`font-normal ${muted}`}>(Optional, max 500 chars)</span>
              </label>
              <textarea
                rows={3}
                maxLength={500}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share any specific highlights, product feedback, or suggestions..."
                className={`w-full p-3 rounded-xl border text-xs outline-none focus:ring-1 focus:ring-brand-primary-dark transition-colors ${
                  isDark
                    ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30'
                    : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400'
                }`}
              />
              <div className="flex justify-end mt-1">
                <span className={`text-[10px] ${muted}`}>{comment.length} / 500</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border ${border} ${
                  isDark ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-xl bg-brand-primary-dark text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-md shadow-brand-primary-dark/20"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <span>Submit Rating</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
