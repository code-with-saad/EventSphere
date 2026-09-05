import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { messageService, MessageThread, ApplicationMessage } from '../../services/messageService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import {
  MessageSquare,
  Search,
  Send,
  Loader2,
  User,
  ShieldCheck,
  Store,
  Calendar,
  Layers,
} from 'lucide-react';

export default function MessagesPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [searchParams, setSearchParams] = useSearchParams();

  const activeAppIdFromUrl = searchParams.get('appId') || '';

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<ApplicationMessage[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch conversation threads
  const fetchThreads = async () => {
    try {
      const list = await messageService.getThreads();
      setThreads(list || []);

      // Auto-select thread from URL query param if present
      if (activeAppIdFromUrl && list && list.length > 0) {
        const found = list.find((t) => t.applicationId === activeAppIdFromUrl);
        if (found) {
          setSelectedThread(found);
          if (found.isArchived) setTab('archived');
        } else if (!selectedThread) {
          const firstActive = list.find(t => !t.isArchived) || list[0];
          setSelectedThread(firstActive);
        }
      } else if (list && list.length > 0 && !selectedThread) {
        const firstActive = list.find(t => !t.isArchived) || list[0];
        setSelectedThread(firstActive);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load conversation threads');
    } finally {
      setLoadingThreads(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [activeAppIdFromUrl]);

  // 2. Fetch messages & polling for the selected thread (10s interval)
  useEffect(() => {
    if (!selectedThread) return;

    let cancelled = false;
    setLoadingMessages(true);
    setError(null);

    // Initial message load
    messageService.getByApplication(selectedThread.applicationId)
      .then((msgs) => {
        if (!cancelled) {
          setMessages(msgs || []);
          setTimeout(scrollToBottom, 100);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Failed to load conversation');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    // 10-second polling
    const intervalId = setInterval(() => {
      if (cancelled) return;
      messageService.getByApplication(selectedThread.applicationId)
        .then((latestMsgs) => {
          if (cancelled || !latestMsgs) return;
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m._id));
            const newIncoming = latestMsgs.filter((m) => !existingIds.has(m._id));
            if (newIncoming.length > 0) {
              setTimeout(scrollToBottom, 50);
              return [...prev, ...newIncoming];
            }
            return prev;
          });
        })
        .catch(() => {});
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [selectedThread?.applicationId]);

  // 3. Send message handler with optimistic UI update
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !selectedThread) return;

    const content = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ApplicationMessage = {
      _id: tempId,
      applicationId: selectedThread.applicationId,
      senderId: user?.id || '',
      senderName: (user as any)?.fullName || (user as any)?.name || 'You',
      senderRole: (user?.role as any) || 'attendee',
      content,
      createdAt: new Date().toISOString(),
    };

    // Immediate optimistic update
    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage('');
    setTimeout(scrollToBottom, 50);
    setSending(true);

    try {
      const msg = await messageService.sendMessage(selectedThread.applicationId, content);
      // Reconcile optimistic message with server response
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? msg : m))
      );
      setThreads((prev) =>
        prev.map((t) =>
          t.applicationId === selectedThread.applicationId
            ? { ...t, lastMessage: msg, totalMessages: t.totalMessages + 1 }
            : t
        )
      );
    } catch (err: any) {
      // Rollback on error
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setError(err?.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSelectThread = (thread: MessageThread) => {
    setSelectedThread(thread);
    setSearchParams({ appId: thread.applicationId });
  };

  // Strictly filter by companyName and tab
  const filteredThreads = threads.filter((t) => {
    const isArchived = Boolean(t.isArchived);
    if (tab === 'active' && isArchived) return false;
    if (tab === 'archived' && !isArchived) return false;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return t.companyName?.toLowerCase().includes(q);
  });

  const activeCount = threads.filter((t) => !t.isArchived).length;
  const archivedCount = threads.filter((t) => t.isArchived).length;

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Messages" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token flex flex-col">
          
          <div className="mb-md-token">
            <h1 className={`text-xl-token font-bold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
              Messages &amp; Inquiries
            </h1>
            <p className={`text-xs-token mt-0.5 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
              Direct discussions regarding exhibitor applications and booth allocations
            </p>
          </div>

          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-md-token flex-1 h-[calc(100vh-210px)] min-h-[500px]">
            
            {/* ── Left Column: Conversation List (4 cols on lg) ──────────────── */}
            <div
              className={`lg:col-span-4 flex flex-col rounded-xl-token border backdrop-blur-md overflow-hidden ${
                isDarkMode
                  ? 'bg-glass-dark border-glass-border-dark'
                  : 'bg-glass-light border-glass-border-light'
              }`}
            >
              {/* Active / Archived Tabs */}
              <div className="flex border-b border-border-base-dark/20 text-xs-token font-semibold">
                <button
                  type="button"
                  onClick={() => setTab('active')}
                  className={`flex-1 py-2.5 px-3 text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    tab === 'active'
                      ? isDarkMode
                        ? 'border-b-2 border-brand-primary-dark text-brand-primary-dark bg-white/5'
                        : 'border-b-2 border-brand-primary-light text-brand-primary-light bg-black/5'
                      : isDarkMode
                      ? 'text-text-secondary-dark hover:text-text-primary-dark'
                      : 'text-text-secondary-light hover:text-text-primary-light'
                  }`}
                >
                  <span>Active</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
                    {activeCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('archived')}
                  className={`flex-1 py-2.5 px-3 text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    tab === 'archived'
                      ? isDarkMode
                        ? 'border-b-2 border-brand-primary-dark text-brand-primary-dark bg-white/5'
                        : 'border-b-2 border-brand-primary-light text-brand-primary-light bg-black/5'
                      : isDarkMode
                      ? 'text-text-secondary-dark hover:text-text-primary-dark'
                      : 'text-text-secondary-light hover:text-text-primary-light'
                  }`}
                >
                  <span>Archived</span>
                  {archivedCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
                      {archivedCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Thread Search */}
              <div className="p-3 border-b border-border-base-dark/20">
                <div className="relative">
                  <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                    isDarkMode ? 'text-text-tertiary-dark' : 'text-text-tertiary-light'
                  }`} />
                  <input
                    type="text"
                    placeholder="Search by company name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-9 pr-3 py-1.5 rounded-md-token border text-xs-token outline-none transition-colors ${
                      isDarkMode
                        ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark placeholder-text-tertiary-dark focus:border-brand-primary-dark'
                        : 'bg-bg-surface-light border-border-base-light text-text-primary-light placeholder-text-tertiary-light focus:border-brand-primary-light'
                    }`}
                  />
                </div>
              </div>

              {/* Thread List */}
              <div className="flex-1 overflow-y-auto divide-y divide-border-base-dark/10">
                {loadingThreads && (
                  <div className="flex flex-col items-center justify-center p-8 gap-2 opacity-70">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs-token">Loading conversations…</span>
                  </div>
                )}

                {!loadingThreads && filteredThreads.length === 0 && (
                  <div className="p-8 text-center opacity-60">
                    <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-xs-token font-medium">No conversation threads found</p>
                  </div>
                )}

                {!loadingThreads && (() => {
                  // For organizers: Group threads by companyName
                  if (user?.role === 'organizer') {
                    const companyGroups: Record<string, MessageThread[]> = {};
                    filteredThreads.forEach((t) => {
                      const key = t.companyName || 'Unknown Exhibitor';
                      if (!companyGroups[key]) companyGroups[key] = [];
                      companyGroups[key].push(t);
                    });

                    return Object.entries(companyGroups).map(([company, groupThreads]) => (
                      <div key={company} className="flex flex-col">
                        {/* Company Group Header */}
                        <div className="px-3.5 py-1.5 bg-black/15 dark:bg-white/5 border-y border-border-base-dark/20 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-text-primary-dark tracking-wide uppercase flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-brand-primary-dark" />
                            {company}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 dark:bg-white/10 text-text-secondary-dark font-medium">
                            {groupThreads.length} expo{groupThreads.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        {/* Company's per-expo threads */}
                        {groupThreads.map((thread) => {
                          const isSelected = selectedThread?.applicationId === thread.applicationId;
                          const hasMessages = Boolean(thread.lastMessage);

                          return (
                            <button
                              key={thread.applicationId}
                              type="button"
                              onClick={() => handleSelectThread(thread)}
                              className={`w-full text-left pl-6 pr-3.5 py-3 transition-colors flex flex-col gap-1 ${
                                isSelected
                                  ? isDarkMode
                                    ? 'bg-brand-primary-dark/15 border-l-4 border-l-brand-primary-dark'
                                    : 'bg-brand-primary-light/10 border-l-4 border-l-brand-primary-light'
                                  : isDarkMode
                                  ? 'hover:bg-bg-hover-dark/60'
                                  : 'hover:bg-bg-hover-light/60'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-xs-token font-bold truncate flex items-center gap-1.5 ${
                                  isSelected
                                    ? isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
                                    : isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                                }`}>
                                  <Calendar className="w-3 h-3 text-text-tertiary-dark shrink-0" />
                                  {thread.expoName}
                                </span>
                                {thread.lastMessage && (
                                  <span className="text-[10px] text-text-tertiary-dark shrink-0">
                                    {new Date(thread.lastMessage.createdAt).toLocaleDateString([], {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                )}
                              </div>

                              <p className={`text-xs-token line-clamp-1 ${
                                hasMessages
                                  ? isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                                  : 'italic text-text-muted-dark'
                              }`}>
                                {hasMessages ? thread.lastMessage?.content : 'No messages yet — start conversation'}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    ));
                  }

                  // For Exhibitors: Clean flat list of expos applied to
                  return filteredThreads.map((thread) => {
                    const isSelected = selectedThread?.applicationId === thread.applicationId;
                    const hasMessages = Boolean(thread.lastMessage);

                    return (
                      <button
                        key={thread.applicationId}
                        type="button"
                        onClick={() => handleSelectThread(thread)}
                        className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1.5 ${
                          isSelected
                            ? isDarkMode
                              ? 'bg-brand-primary-dark/15 border-l-4 border-l-brand-primary-dark'
                              : 'bg-brand-primary-light/10 border-l-4 border-l-brand-primary-light'
                            : isDarkMode
                            ? 'hover:bg-bg-hover-dark/60'
                            : 'hover:bg-bg-hover-light/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-xs-token font-bold truncate ${
                            isSelected
                              ? isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
                              : isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                          }`}>
                            {thread.expoName}
                          </span>
                          {thread.lastMessage && (
                            <span className="text-[10px] text-text-tertiary-dark shrink-0">
                              {new Date(thread.lastMessage.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-text-secondary-dark">
                          <Store className="w-3 h-3 shrink-0" />
                          <span className="truncate">Application: {thread.companyName}</span>
                        </div>

                        <p className={`text-xs-token line-clamp-1 ${
                          hasMessages
                            ? isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                            : 'italic text-text-muted-dark'
                        }`}>
                          {hasMessages ? thread.lastMessage?.content : 'No messages yet — start conversation'}
                        </p>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* ── Right Column: Active Conversation Thread (8 cols on lg) ─────── */}
            <div
              className={`lg:col-span-8 flex flex-col rounded-xl-token border backdrop-blur-md overflow-hidden ${
                isDarkMode
                  ? 'bg-glass-dark border-glass-border-dark'
                  : 'bg-glass-light border-glass-border-light'
              }`}
            >
              {selectedThread ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 md:p-4 border-b border-border-base-dark/20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg-token shrink-0 ${
                        isDarkMode ? 'bg-brand-primary-dark/20 text-brand-primary-dark' : 'bg-brand-primary-light/20 text-brand-primary-light'
                      }`}>
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm-token md:text-base-token font-bold truncate">
                          {selectedThread.companyName}
                        </h2>
                        <div className="flex items-center gap-2 text-[11px] text-text-secondary-dark truncate">
                          <span>Expo: <strong className="font-semibold">{selectedThread.expoName}</strong></span>
                          {selectedThread.category && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3" />
                                {selectedThread.category}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full capitalize font-medium ${
                        selectedThread.status === 'approved'
                          ? isDarkMode ? 'bg-bg-success-dark text-text-success-dark' : 'bg-bg-success-light text-text-success-light'
                          : selectedThread.status === 'rejected'
                          ? isDarkMode ? 'bg-bg-danger-dark text-text-danger-dark' : 'bg-bg-danger-light text-text-danger-light'
                          : isDarkMode ? 'bg-bg-warning-dark text-text-warning-dark' : 'bg-bg-warning-light text-text-warning-light'
                      }`}>
                        {selectedThread.status}
                      </span>
                    </div>
                  </div>

                  {/* Message History Area */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
                    {loadingMessages && (
                      <div className="flex flex-col items-center justify-center h-full gap-2 opacity-70">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-xs-token">Loading messages…</span>
                      </div>
                    )}

                    {!loadingMessages && error && (
                      <div className={`p-sm-token rounded-md-token text-xs-token text-center ${
                        isDarkMode ? 'bg-bg-danger-dark text-text-danger-dark' : 'bg-bg-danger-light text-text-danger-light'
                      }`}>
                        {error}
                      </div>
                    )}

                    {!loadingMessages && !error && messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center py-12 gap-2 opacity-60">
                        <MessageSquare className="w-8 h-8 opacity-40" />
                        <p className="text-sm-token font-semibold">Start the Conversation</p>
                        <p className="text-xs-token max-w-sm">
                          Send a message to discuss application requirements, booth spaces, or schedule adjustments.
                        </p>
                      </div>
                    )}

                    {!loadingMessages && messages.map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      const isOrganizer = msg.senderRole === 'organizer';

                      return (
                        <div
                          key={msg._id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 text-[11px] text-text-secondary-dark">
                            {isOrganizer ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-brand-primary-dark">
                                <ShieldCheck className="w-3 h-3" />
                                {msg.senderName} (Organizer)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-semibold">
                                <User className="w-3 h-3" />
                                {msg.senderName}
                              </span>
                            )}
                            <span>·</span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div
                            className={`max-w-[85%] rounded-lg-token px-4 py-2 text-sm-token break-words shadow-sm ${
                              isMe
                                ? isDarkMode
                                  ? 'bg-brand-primary-dark text-white rounded-br-xs'
                                  : 'bg-brand-primary-light text-white rounded-br-xs'
                                : isDarkMode
                                ? 'bg-bg-hover-dark text-text-primary-dark border border-border-base-dark rounded-bl-xs'
                                : 'bg-white text-text-primary-light border border-border-base-light rounded-bl-xs'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleSend} className="p-3 md:p-4 border-t border-border-base-dark/20 flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message…"
                      disabled={sending || loadingMessages}
                      className={`flex-1 px-3 py-2 rounded-md-token border text-sm-token outline-none transition-colors ${
                        isDarkMode
                          ? 'bg-bg-surface-dark border-border-base-dark text-text-primary-dark placeholder-text-tertiary-dark focus:border-brand-primary-dark'
                          : 'bg-bg-surface-light border-border-base-light text-text-primary-light placeholder-text-tertiary-light focus:border-brand-primary-light'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className={`px-4 py-2 rounded-md-token text-sm-token font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDarkMode
                          ? 'bg-brand-primary-dark text-text-on-primary-dark hover:opacity-90'
                          : 'bg-brand-primary-light text-text-on-primary-light hover:opacity-90'
                      }`}
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                  <MessageSquare className="w-10 h-10 opacity-40 mb-2" />
                  <p className="text-sm-token font-semibold">Select a conversation</p>
                  <p className="text-xs-token max-w-xs mt-1">
                    Choose an application thread from the left panel to read and send messages.
                  </p>
                </div>
              )}
            </div>

          </div>

        </main>
      </div>
      <BottomNav />
    </div>
  );
}
