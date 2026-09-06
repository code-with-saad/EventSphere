import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import {
  feedbackService,
  FeedbackItem,
  FeedbackStatus,
  FeedbackCategory,
} from '../../services/feedbackService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import {
  MessageSquare,
  Bug,
  Sparkles,
  CreditCard,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Eye,
  XCircle,
  RefreshCw,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<FeedbackCategory, { label: string; icon: React.ReactNode; color: string }> = {
  bug:             { label: 'Bug Report',      icon: <Bug className="w-3.5 h-3.5" />,      color: '#EF4444' },
  feature_request: { label: 'Feature Request', icon: <Sparkles className="w-3.5 h-3.5" />, color: '#8B5CF6' },
  general:         { label: 'General',         icon: <MessageSquare className="w-3.5 h-3.5" />, color: '#3B82F6' },
  billing:         { label: 'Billing',         icon: <CreditCard className="w-3.5 h-3.5" />,    color: '#F59E0B' },
  other:           { label: 'Other',           icon: <FileText className="w-3.5 h-3.5" />,      color: '#6B7280' },
};

const STATUS_META: Record<FeedbackStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  open:      { label: 'Open',      icon: <Clock className="w-3 h-3" />,       color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  in_review: { label: 'In Review', icon: <Eye className="w-3 h-3" />,         color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  resolved:  { label: 'Resolved',  icon: <CheckCircle2 className="w-3 h-3" />, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  closed:    { label: 'Closed',    icon: <XCircle className="w-3 h-3" />,     color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
};

const STATUS_OPTIONS: FeedbackStatus[] = ['open', 'in_review', 'resolved', 'closed'];
const CATEGORY_OPTIONS: (FeedbackCategory | 'all')[] = ['all', 'bug', 'feature_request', 'general', 'billing', 'other'];

const ROLE_BADGE: Record<string, string> = {
  organizer: '#FF4D2E',
  exhibitor: '#8B5CF6',
  attendee:  '#3B82F6',
  superadmin:'#10B981',
};

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function FeedbackDrawer({
  item,
  isDark,
  onClose,
  onStatusUpdate,
}: {
  item: FeedbackItem;
  isDark: boolean;
  onClose: () => void;
  onStatusUpdate: (id: string, status: FeedbackStatus, note?: string) => Promise<void>;
}) {
  const [selectedStatus, setSelectedStatus] = useState<FeedbackStatus>(item.status);
  const [adminNote, setAdminNote] = useState(item.adminNote ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const cat = item.category ? CATEGORY_META[item.category] : null;
  const st = STATUS_META[item.status];

  const bg = isDark ? '#18181b' : '#fff';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const text = isDark ? '#f4f4f5' : '#18181b';
  const muted = isDark ? '#a1a1aa' : '#71717a';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await onStatusUpdate(item._id, selectedStatus, adminNote || undefined);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="relative h-full w-full max-w-md flex flex-col overflow-y-auto"
        style={{ background: bg, borderLeft: `1px solid ${border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b z-10"
          style={{ background: bg, borderColor: border }}>
          <span className="font-semibold text-sm" style={{ color: text }}>Feedback Detail</span>
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80"
            style={{ borderColor: border, color: muted }}>Close</button>
        </div>

        <div className="flex flex-col gap-5 p-5">
          {/* Meta */}
          <div className="flex flex-wrap gap-2 items-center">
            {cat && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: `${cat.color}18`, color: cat.color }}>
                {cat.icon} {cat.label}
              </span>
            )}
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: st.bg, color: st.color }}>
              {st.icon} {st.label}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium capitalize"
              style={{ background: `${ROLE_BADGE[item.userRole] ?? '#6B7280'}18`, color: ROLE_BADGE[item.userRole] ?? '#6B7280' }}>
              {item.userRole}
            </span>
          </div>

          {/* Subject */}
          <div>
            <p className="text-xs mb-1" style={{ color: muted }}>Subject</p>
            <p className="text-sm font-semibold" style={{ color: text }}>{item.subject}</p>
          </div>

          {/* From */}
          <div>
            <p className="text-xs mb-1" style={{ color: muted }}>Submitted by</p>
            <p className="text-sm font-medium" style={{ color: text }}>{item.userName}</p>
            <p className="text-xs" style={{ color: muted }}>{item.userEmail}</p>
          </div>

          {/* Message */}
          <div>
            <p className="text-xs mb-2" style={{ color: muted }}>Message</p>
            <div className="rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed"
              style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: text }}>
              {item.message}
            </div>
          </div>

          {/* Date */}
          <p className="text-xs" style={{ color: muted }}>
            Submitted: {new Date(item.createdAt).toLocaleString()}
          </p>

          {/* ── Update Status ── */}
          <div className="border-t pt-5" style={{ borderColor: border }}>
            <p className="text-xs font-medium mb-3" style={{ color: muted }}>Update Status</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {STATUS_OPTIONS.map((s) => {
                const sm = STATUS_META[s];
                return (
                  <button
                    key={s}
                    onClick={() => setSelectedStatus(s)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all"
                    style={{
                      background: selectedStatus === s ? sm.bg : 'transparent',
                      borderColor: selectedStatus === s ? sm.color : inputBorder,
                      color: selectedStatus === s ? sm.color : muted,
                    }}
                  >
                    {sm.icon} {sm.label}
                  </button>
                );
              })}
            </div>

            <p className="text-xs font-medium mb-1.5" style={{ color: muted }}>Admin Note (optional)</p>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              placeholder="Leave an internal note about this feedback..."
              className="w-full px-3 py-2.5 rounded-xl text-xs resize-none outline-none focus:ring-2 focus:ring-[#FF4D2E]/40"
              style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: text }}
            />

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-3 flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{ background: '#FF4D2E' }}
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> :
               saved  ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> :
               'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminFeedbackPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | 'all'>('all');
  const [selected, setSelected] = useState<FeedbackItem | null>(null);

  const LIMIT = 15;

  // ── Theme tokens ─────────────────────────────────────────────────────────────
  const bg = isDark ? 'bg-[#18181b]' : 'bg-white';
  const border = isDark ? 'border-white/[0.08]' : 'border-gray-200';
  const text = isDark ? 'text-[#f4f4f5]' : 'text-[#18181b]';
  const muted = isDark ? 'text-[#a1a1aa]' : 'text-[#71717a]';
  const rowHover = isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50';
  const chipBase = 'px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer';
  const chipActive = isDark
    ? 'bg-[#FF4D2E]/20 border-[#FF4D2E] text-[#FF4D2E]'
    : 'bg-[#FF4D2E]/10 border-[#FF4D2E] text-[#c0391f]';
  const chipInactive = isDark
    ? 'bg-white/5 border-white/10 text-[#a1a1aa] hover:border-white/25'
    : 'bg-gray-100 border-gray-200 text-gray-600 hover:border-gray-400';

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await feedbackService.listAll({
        page,
        limit: LIMIT,
        status: statusFilter,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
      });
      setItems(res.feedback);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [statusFilter, categoryFilter]);

  const handleStatusUpdate = async (id: string, status: FeedbackStatus, adminNote?: string) => {
    await feedbackService.updateStatus(id, status, adminNote);
    // Refresh list and update selected item
    setItems((prev) =>
      prev.map((f) => (f._id === id ? { ...f, status, adminNote: adminNote ?? f.adminNote } : f))
    );
    if (selected?._id === id) {
      setSelected((prev) => prev ? { ...prev, status, adminNote: adminNote ?? prev.adminNote } : prev);
    }
  };

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Feedback & Issues" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">

          {/* Page header */}
          <div className="mb-6">
            <h2 className={`text-xl font-bold ${text}`}>User Feedback & Issues</h2>
            <p className={`text-sm mt-1 ${muted}`}>
              Review and manage feedback submitted by organizers, exhibitors, and attendees.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 mb-6">
            {/* Status filter */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`text-xs font-medium ${muted}`}>Status:</span>
              <button
                onClick={() => setStatusFilter(undefined)}
                className={`${chipBase} ${statusFilter === undefined ? chipActive : chipInactive}`}
              >
                All
              </button>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`${chipBase} ${statusFilter === s ? chipActive : chipInactive}`}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
            {/* Category filter */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`text-xs font-medium ${muted}`}>Category:</span>
              {CATEGORY_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`${chipBase} ${categoryFilter === c ? chipActive : chipInactive}`}
                >
                  {c === 'all' ? 'All' : CATEGORY_META[c as FeedbackCategory].label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary badge */}
          <div className={`flex items-center justify-between mb-4`}>
            <p className={`text-sm ${muted}`}>
              {loading ? 'Loading…' : `${total} item${total !== 1 ? 's' : ''} found`}
            </p>
            <button
              onClick={fetchFeedback}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${border} ${muted} hover:opacity-80`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm text-red-400 bg-red-500/10 border border-red-500/20">
              {error}
            </div>
          )}

          {/* Table */}
          <div className={`rounded-2xl border overflow-hidden ${bg} ${border}`}>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-7 h-7 animate-spin text-[#FF4D2E]" />
              </div>
            ) : items.length === 0 ? (
              <div className={`flex flex-col items-center gap-3 py-20 ${muted}`}>
                <MessageSquare className="w-10 h-10 opacity-30" />
                <p className="text-sm">No feedback found for the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b text-xs font-medium ${muted} ${border}`}>
                      <th className="px-4 py-3 text-left">Subject</th>
                      <th className="px-4 py-3 text-left">From</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => {
                      const cat = item.category ? CATEGORY_META[item.category] : null;
                      const st = STATUS_META[item.status];
                      return (
                        <tr
                          key={item._id}
                          onClick={() => setSelected(item)}
                          className={`border-b cursor-pointer transition-colors ${rowHover} ${
                            i === items.length - 1 ? 'border-transparent' : border
                          }`}
                        >
                          <td className="px-4 py-3">
                            <p className={`font-medium truncate max-w-[200px] ${text}`}>
                              {item.subject}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className={`text-xs ${text}`}>{item.userName}</p>
                            <p className={`text-xs ${muted}`}>{item.userRole}</p>
                          </td>
                          <td className="px-4 py-3">
                            {cat ? (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                                style={{ background: `${cat.color}18`, color: cat.color }}
                              >
                                {cat.icon} {cat.label}
                              </span>
                            ) : (
                              <span className="text-xs opacity-50">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                              style={{ background: st.bg, color: st.color }}
                            >
                              {st.icon} {st.label}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-xs ${muted}`}>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`p-2 rounded-lg border transition-colors disabled:opacity-40 ${border} ${muted}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`text-sm ${muted}`}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`p-2 rounded-lg border transition-colors disabled:opacity-40 ${border} ${muted}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </main>
      </div>
      <BottomNav />

      {/* Detail drawer */}
      {selected && (
        <FeedbackDrawer
          item={selected}
          isDark={isDark}
          onClose={() => setSelected(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}
