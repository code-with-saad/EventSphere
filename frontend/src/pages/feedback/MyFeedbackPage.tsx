import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { feedbackService, FeedbackItem } from '../../services/feedbackService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import FeedbackModal from '../../components/common/FeedbackModal';
import {
  Plus,
  CheckCircle2,
  MessageCircle,
  HelpCircle,
  Sparkles,
  Bug,
  CreditCard,
  FileText,
} from 'lucide-react';

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  bug: { label: 'Bug Report', icon: Bug, color: 'text-red-500 bg-red-500/10 border-red-500/20' },
  feature_request: { label: 'Feature Request', icon: Sparkles, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
  general: { label: 'General', icon: MessageCircle, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  billing: { label: 'Billing', icon: CreditCard, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  other: { label: 'Other', icon: FileText, color: 'text-gray-500 bg-gray-500/10 border-gray-500/20' },
};

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  open: { label: 'Open', bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
  in_review: { label: 'In Review', bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  resolved: { label: 'Resolved', bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
  closed: { label: 'Closed', bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
};

export default function MyFeedbackPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchMine = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await feedbackService.listMine();
      setFeedbacks(list || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMine();
  }, [fetchMine]);

  const resolvedCount = feedbacks.filter((f) => f.status === 'resolved').length;
  const inReviewCount = feedbacks.filter((f) => f.status === 'in_review' || f.status === 'open').length;

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="My Feedback & Support" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-md-token mb-lg-token">
            <div>
              <h1 className={`text-xl-token md:text-2xl-token font-bold ${isDark ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                My Feedback &amp; Requests
              </h1>
              <p className={`text-xs-token md:text-sm-token mt-1 ${isDark ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                Track all your submitted bug reports, suggestions, and support inquiries
              </p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className={`inline-flex items-center gap-2 px-md-token py-sm-token rounded-lg-token text-sm-token font-semibold transition-all shadow-md cursor-pointer ${
                isDark
                  ? 'bg-brand-primary-dark text-text-on-primary-dark hover:bg-accent-hover-dark'
                  : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Submit Feedback</span>
            </button>
          </div>

          {/* Metrics summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-md-token mb-lg-token">
            <div
              className={`p-md-token rounded-xl-token border backdrop-blur-md ${
                isDark ? 'bg-glass-dark border-glass-border-dark' : 'bg-glass-light border-glass-border-light'
              }`}
            >
              <span className={`text-xs-token font-medium ${isDark ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                Total Submissions
              </span>
              <p className={`text-2xl-token font-bold mt-1 ${isDark ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                {feedbacks.length}
              </p>
            </div>
            <div
              className={`p-md-token rounded-xl-token border backdrop-blur-md ${
                isDark ? 'bg-glass-dark border-glass-border-dark' : 'bg-glass-light border-glass-border-light'
              }`}
            >
              <span className={`text-xs-token font-medium text-amber-500`}>
                In Progress / Open
              </span>
              <p className={`text-2xl-token font-bold mt-1 text-amber-500`}>
                {inReviewCount}
              </p>
            </div>
            <div
              className={`p-md-token rounded-xl-token border backdrop-blur-md ${
                isDark ? 'bg-glass-dark border-glass-border-dark' : 'bg-glass-light border-glass-border-light'
              }`}
            >
              <span className={`text-xs-token font-medium text-green-500`}>
                Resolved
              </span>
              <p className={`text-2xl-token font-bold mt-1 text-green-500`}>
                {resolvedCount}
              </p>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className={`text-sm-token ${isDark ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                Loading your feedback...
              </p>
            </div>
          ) : error ? (
            <div className={`p-md-token rounded-lg-token border text-sm-token text-red-500 border-red-500/20 bg-red-500/10`}>
              {error}
            </div>
          ) : feedbacks.length === 0 ? (
            <div
              className={`flex flex-col items-center justify-center p-xl-token rounded-2xl-token border text-center backdrop-blur-md ${
                isDark ? 'bg-glass-dark border-glass-border-dark' : 'bg-glass-light border-glass-border-light'
              }`}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-md-token ${
                isDark ? 'bg-bg-surface-dark text-text-secondary-dark' : 'bg-bg-surface-light text-text-secondary-light'
              }`}>
                <HelpCircle className="w-8 h-8 opacity-60" />
              </div>
              <h2 className={`text-lg-token font-semibold ${isDark ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                No feedback submitted yet
              </h2>
              <p className={`text-sm-token max-w-md mt-1 mb-lg-token ${isDark ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                Have a suggestion, question, or issue? Let our team know and we'll investigate right away.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className={`inline-flex items-center gap-2 px-md-token py-sm-token rounded-lg-token text-sm-token font-semibold ${
                  isDark
                    ? 'bg-brand-primary-dark text-text-on-primary-dark hover:bg-accent-hover-dark'
                    : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Submit Your First Feedback</span>
              </button>
            </div>
          ) : (
            <div className="space-y-md-token">
              {feedbacks.map((item) => {
                const cat = CATEGORY_META[item.category] || CATEGORY_META.other;
                const status = STATUS_BADGE[item.status] || STATUS_BADGE.open;
                const CatIcon = cat.icon;

                return (
                  <div
                    key={item._id}
                    className={`p-lg-token rounded-xl-token border backdrop-blur-md transition-all ${
                      isDark ? 'bg-glass-dark border-glass-border-dark' : 'bg-glass-light border-glass-border-light'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-sm-token mb-sm-token">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs-token font-semibold border ${cat.color}`}>
                          <CatIcon className="w-3.5 h-3.5" />
                          <span>{cat.label}</span>
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs-token font-semibold border ${status.bg} ${status.text} ${status.border}`}>
                          {status.label}
                        </span>
                      </div>
                      <span className={`text-xs-token ${isDark ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <h2 className={`text-base-token font-semibold mb-2 ${isDark ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                      {item.subject}
                    </h2>
                    <p className={`text-sm-token leading-relaxed whitespace-pre-wrap ${isDark ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                      {item.message}
                    </p>

                    {/* Admin response callout */}
                    {item.adminNote && (
                      <div
                        className={`mt-md-token p-md-token rounded-lg-token border flex flex-col gap-1 ${
                          isDark ? 'bg-bg-surface-dark/80 border-border-base-dark' : 'bg-white/80 border-border-base-light'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className={`text-xs-token font-bold ${isDark ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                            Team Response:
                          </span>
                        </div>
                        <p className={`text-xs-token leading-relaxed ${isDark ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                          {item.adminNote}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
      <BottomNav />

      {modalOpen && (
        <FeedbackModal
          onClose={() => {
            setModalOpen(false);
            fetchMine();
          }}
        />
      )}
    </div>
  );
}
