import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  messageService,
  MessageThread,
  ApplicationMessage,
  DirectMessageThread,
  DirectMessageItem,
} from '../../services/messageService';
import { uploadService } from '../../services/uploadService';
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
  Paperclip,
  Image as ImageIcon,
  CheckCheck,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

type ChatMode = 'applications' | 'direct';

export default function MessagesPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [searchParams, setSearchParams] = useSearchParams();

  const activeAppIdFromUrl = searchParams.get('appId') || '';
  const directUserIdFromUrl = searchParams.get('directUser') || '';
  const directUserNameFromUrl = searchParams.get('name') || '';

  const [mode, setMode] = useState<ChatMode>(
    directUserIdFromUrl || user?.role === 'attendee' ? 'direct' : 'applications'
  );

  // Application threads state
  const [appThreads, setAppThreads] = useState<MessageThread[]>([]);
  const [selectedAppThread, setSelectedAppThread] = useState<MessageThread | null>(null);
  const [appMessages, setAppMessages] = useState<ApplicationMessage[]>([]);

  // Direct message threads state
  const [directThreads, setDirectThreads] = useState<DirectMessageThread[]>([]);
  const [selectedDirectThread, setSelectedDirectThread] = useState<DirectMessageThread | null>(null);
  const [directMessages, setDirectMessages] = useState<DirectMessageItem[]>([]);

  // Collapsible company accordion state for organizers
  const [collapsedCompanies, setCollapsedCompanies] = useState<Record<string, boolean>>({});

  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<'active' | 'archived'>('active');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  // 1. Fetch Application threads
  const fetchAppThreads = async (silent = false) => {
    try {
      const list = await messageService.getThreads();
      setAppThreads(list || []);

      if (!silent) {
        if (activeAppIdFromUrl && list && list.length > 0) {
          const found = list.find((t) => t.applicationId === activeAppIdFromUrl);
          if (found) {
            setSelectedAppThread(found);
            if (found.isArchived) setTab('archived');
          } else if (!selectedAppThread) {
            const firstActive = list.find((t) => !t.isArchived) || list[0];
            setSelectedAppThread(firstActive);
          }
        } else if (list && list.length > 0 && !selectedAppThread) {
          const firstActive = list.find((t) => !t.isArchived) || list[0];
          setSelectedAppThread(firstActive);
        }
      }
    } catch (err: any) {
      if (user?.role !== 'attendee' && !silent) {
        toast.error(err?.response?.data?.message || 'Failed to load conversation threads');
      }
    }
  };

  // 2. Fetch Direct threads
  const fetchDirectThreads = async (silent = false) => {
    try {
      const list = await messageService.getDirectThreads();
      setDirectThreads(list || []);

      if (!silent) {
        if (directUserIdFromUrl) {
          const found = list?.find((t) => t.userId === directUserIdFromUrl);
          if (found) {
            setSelectedDirectThread(found);
          } else {
            setSelectedDirectThread({
              userId: directUserIdFromUrl,
              name: directUserNameFromUrl || 'Exhibitor Contact',
              role: 'exhibitor',
              totalMessages: 0,
              lastMessage: null,
            });
          }
        } else if (list && list.length > 0 && !selectedDirectThread) {
          setSelectedDirectThread(list[0]);
        }
      }
    } catch (err: any) {
      if (!silent) {
        toast.error(err?.response?.data?.message || 'Failed to load direct messages');
      }
    }
  };

  // Initial load
  useEffect(() => {
    setLoadingThreads(true);
    Promise.all([
      user?.role !== 'attendee' ? fetchAppThreads() : Promise.resolve(),
      fetchDirectThreads(),
    ]).finally(() => setLoadingThreads(false));
  }, [activeAppIdFromUrl, directUserIdFromUrl]);

  // Global Polling (Poll threads list every 4 seconds to update unread badges & read status in real-time)
  useEffect(() => {
    const threadInterval = setInterval(() => {
      if (user?.role !== 'attendee') fetchAppThreads(true);
      fetchDirectThreads(true);
    }, 4000);
    return () => clearInterval(threadInterval);
  }, [user?.role]);

  // 3. Application Chat Messages & Polling (Every 3 seconds)
  useEffect(() => {
    if (mode !== 'applications' || !selectedAppThread) return;

    let cancelled = false;
    setLoadingMessages(true);

    messageService
      .getByApplication(selectedAppThread.applicationId)
      .then((msgs) => {
        if (!cancelled) {
          setAppMessages(msgs || []);
          setAppThreads((prev) =>
            prev.map((t) =>
              t.applicationId === selectedAppThread.applicationId
                ? { ...t, unreadCount: 0 }
                : t
            )
          );
          setTimeout(() => scrollToBottom(false), 50);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Failed to load conversation');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    // 3-second live sync for active chat (syncs new incoming messages & read status updates)
    const intervalId = setInterval(() => {
      if (cancelled) return;
      messageService
        .getByApplication(selectedAppThread.applicationId)
        .then((latestMsgs) => {
          if (cancelled || !latestMsgs) return;
          setAppMessages(latestMsgs);
        })
        .catch(() => {});
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [mode, selectedAppThread?.applicationId]);

  // 4. Direct Messages & Polling (Every 3 seconds)
  useEffect(() => {
    if (mode !== 'direct' || !selectedDirectThread) return;

    let cancelled = false;
    setLoadingMessages(true);

    messageService
      .getDirectMessages(selectedDirectThread.userId)
      .then((msgs) => {
        if (!cancelled) {
          setDirectMessages(msgs || []);
          setDirectThreads((prev) =>
            prev.map((t) =>
              t.userId === selectedDirectThread.userId
                ? { ...t, unreadCount: 0 }
                : t
            )
          );
          setTimeout(() => scrollToBottom(false), 50);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || 'Failed to load direct messages');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    const intervalId = setInterval(() => {
      if (cancelled) return;
      messageService
        .getDirectMessages(selectedDirectThread.userId)
        .then((latestMsgs) => {
          if (cancelled || !latestMsgs) return;
          setDirectMessages(latestMsgs);
        })
        .catch(() => {});
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [mode, selectedDirectThread?.userId]);

  // Handle file attachment upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image exceeds 5MB limit');
      return;
    }

    setUploadingAttachment(true);
    try {
      const res = await uploadService.uploadImage(file, 'message_attachment');
      setAttachmentUrl(res.url);
      toast.success('Image attached');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload attachment');
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachmentUrl) || sending) return;

    const content = newMessage.trim();
    const sentAttachment = attachmentUrl || undefined;
    const tempId = `temp-${Date.now()}`;

    setSending(true);
    setNewMessage('');
    setAttachmentUrl(null);

    if (mode === 'applications' && selectedAppThread) {
      const optimisticMsg: ApplicationMessage = {
        _id: tempId,
        applicationId: selectedAppThread.applicationId,
        senderId: user?.id || '',
        senderName: (user as any)?.fullName || (user as any)?.name || 'You',
        senderRole: (user?.role as any) || 'attendee',
        content,
        attachmentUrl: sentAttachment,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      setAppMessages((prev) => [...prev, optimisticMsg]);
      setTimeout(() => scrollToBottom(true), 30);

      try {
        const msg = await messageService.sendMessage(
          selectedAppThread.applicationId,
          content,
          sentAttachment
        );
        setAppMessages((prev) => prev.map((m) => (m._id === tempId ? msg : m)));
        setAppThreads((prev) =>
          prev.map((t) =>
            t.applicationId === selectedAppThread.applicationId
              ? { ...t, lastMessage: msg, totalMessages: t.totalMessages + 1 }
              : t
          )
        );
      } catch (err: any) {
        setAppMessages((prev) => prev.filter((m) => m._id !== tempId));
        toast.error(err?.response?.data?.message || 'Failed to send message');
      } finally {
        setSending(false);
      }
    } else if (mode === 'direct' && selectedDirectThread) {
      const optimisticDirect: DirectMessageItem = {
        _id: tempId,
        senderId: user?.id || '',
        senderName: (user as any)?.fullName || (user as any)?.name || 'You',
        senderRole: (user?.role as any) || 'attendee',
        recipientId: selectedDirectThread.userId,
        recipientName: selectedDirectThread.name,
        recipientRole: selectedDirectThread.role,
        content,
        attachmentUrl: sentAttachment,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      setDirectMessages((prev) => [...prev, optimisticDirect]);
      setTimeout(() => scrollToBottom(true), 30);

      try {
        const msg = await messageService.sendDirectMessage(
          selectedDirectThread.userId,
          content,
          sentAttachment
        );
        setDirectMessages((prev) => prev.map((m) => (m._id === tempId ? msg : m)));
        setDirectThreads((prev) => {
          const exists = prev.some((t) => t.userId === selectedDirectThread.userId);
          if (exists) {
            return prev.map((t) =>
              t.userId === selectedDirectThread.userId
                ? { ...t, lastMessage: msg, totalMessages: t.totalMessages + 1 }
                : t
            );
          } else {
            return [
              {
                userId: selectedDirectThread.userId,
                name: selectedDirectThread.name,
                role: selectedDirectThread.role,
                unreadCount: 0,
                totalMessages: 1,
                lastMessage: msg,
              },
              ...prev,
            ];
          }
        });
      } catch (err: any) {
        setDirectMessages((prev) => prev.filter((m) => m._id !== tempId));
        toast.error(err?.response?.data?.message || 'Failed to send direct message');
      } finally {
        setSending(false);
      }
    }
  };

  const handleSelectAppThread = (thread: MessageThread) => {
    setSelectedAppThread(thread);
    setSearchParams({ appId: thread.applicationId });
  };

  const handleSelectDirectThread = (thread: DirectMessageThread) => {
    setSelectedDirectThread(thread);
    setSearchParams({ directUser: thread.userId, name: thread.name });
  };

  const toggleCompany = (company: string) => {
    setCollapsedCompanies((prev) => ({
      ...prev,
      [company]: !prev[company],
    }));
  };

  // Filter application threads
  const filteredAppThreads = useMemo(() => {
    return appThreads.filter((t) => {
      const isArchived = Boolean(t.isArchived);
      if (tab === 'active' && isArchived) return false;
      if (tab === 'archived' && !isArchived) return false;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return t.companyName?.toLowerCase().includes(q) || t.expoName?.toLowerCase().includes(q);
    });
  }, [appThreads, tab, searchQuery]);

  // Filter direct threads
  const filteredDirectThreads = useMemo(() => {
    return directThreads.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return t.name?.toLowerCase().includes(q);
    });
  }, [directThreads, searchQuery]);

  // Company groups for organizers (clean, collapsible hierarchy)
  const organizerCompanyGroups = useMemo(() => {
    if (user?.role !== 'organizer') return {};
    const groups: Record<string, { threads: MessageThread[]; totalUnread: number; lastActivity: number }> = {};

    filteredAppThreads.forEach((t) => {
      const key = t.companyName || 'Unknown Exhibitor';
      if (!groups[key]) {
        groups[key] = { threads: [], totalUnread: 0, lastActivity: 0 };
      }
      groups[key].threads.push(t);
      groups[key].totalUnread += t.unreadCount || 0;
      const msgTime = t.lastMessage ? new Date(t.lastMessage.createdAt).getTime() : 0;
      if (msgTime > groups[key].lastActivity) {
        groups[key].lastActivity = msgTime;
      }
    });

    return groups;
  }, [filteredAppThreads, user?.role]);

  const totalAppUnread = appThreads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
  const totalDirectUnread = directThreads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);

  return (
    <div className="dashboard-root flex flex-col h-screen overflow-hidden">
      <Sidebar />
      <div className="md:ml-64 flex flex-col flex-1 h-screen overflow-hidden">
        <Header title="Messages" />
        
        {/* Main layout container with fixed height matching screen */}
        <main className="flex-1 p-3 md:p-4 flex flex-col min-h-0 overflow-hidden">
          
          {/* Top Bar with Mode Switcher */}
          <div className="mb-2.5 flex items-center justify-between gap-3 shrink-0">
            <div>
              <h1 className={`text-lg md:text-xl font-bold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                Messages &amp; Inquiries
              </h1>
            </div>

            {user?.role !== 'attendee' && (
              <div className="flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-black/20 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setMode('applications')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    mode === 'applications'
                      ? 'bg-brand-primary-dark text-white shadow-md'
                      : 'text-text-secondary-dark hover:text-white'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Booth Applications</span>
                  {totalAppUnread > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-bold animate-pulse">
                      {totalAppUnread}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('direct')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    mode === 'direct'
                      ? 'bg-brand-primary-dark text-white shadow-md'
                      : 'text-text-secondary-dark hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Direct Messages</span>
                  {totalDirectUnread > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-bold animate-pulse">
                      {totalDirectUnread}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Unified Chat Card Viewport */}
          <div
            className={`grid grid-cols-1 lg:grid-cols-12 rounded-2xl border backdrop-blur-xl overflow-hidden flex-1 min-h-0 ${
              isDarkMode
                ? 'bg-glass-dark/95 border-glass-border-dark'
                : 'bg-glass-light/95 border-glass-border-light'
            }`}
          >
            {/* ── Left Column: Thread Sidebar (4 cols on desktop) ─────────────── */}
            <div className="lg:col-span-4 flex flex-col border-r border-white/10 h-full min-h-0 overflow-hidden">
              {/* Tab selector for Applications */}
              {mode === 'applications' && (
                <div className="flex border-b border-white/10 text-xs font-semibold shrink-0">
                  <button
                    type="button"
                    onClick={() => setTab('active')}
                    className={`flex-1 py-2.5 px-3 text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                      tab === 'active'
                        ? isDarkMode
                          ? 'border-b-2 border-brand-primary-dark text-brand-primary-dark bg-white/5'
                          : 'border-b-2 border-brand-primary-light text-brand-primary-light bg-black/5'
                        : 'text-text-secondary-dark hover:text-white'
                    }`}
                  >
                    <span>Active Chats</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10">
                      {appThreads.filter((t) => !t.isArchived).length}
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
                        : 'text-text-secondary-dark hover:text-white'
                    }`}
                  >
                    <span>Archived</span>
                    {appThreads.filter((t) => t.isArchived).length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10">
                        {appThreads.filter((t) => t.isArchived).length}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* Search Bar */}
              <div className="p-2.5 border-b border-white/10 shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-dark" />
                  <input
                    type="text"
                    placeholder={
                      mode === 'applications' ? 'Search company or expo…' : 'Search contacts…'
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-white/10 bg-black/20 text-xs outline-none focus:border-brand-primary-dark text-text-primary-dark placeholder:text-text-secondary-dark/60 transition-colors"
                  />
                </div>
              </div>

              {/* Scrollable Threads List */}
              <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/5">
                {loadingThreads && (
                  <div className="flex flex-col items-center justify-center p-8 gap-2 opacity-70">
                    <Loader2 className="w-5 h-5 animate-spin text-brand-primary-dark" />
                    <span className="text-xs">Loading conversations…</span>
                  </div>
                )}

                {/* Organizer View: Collapsible Company Accordions */}
                {mode === 'applications' && !loadingThreads && user?.role === 'organizer' && (
                  Object.entries(organizerCompanyGroups).length === 0 ? (
                    <div className="p-8 text-center opacity-60">
                      <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-medium">No application threads found</p>
                    </div>
                  ) : (
                    Object.entries(organizerCompanyGroups).map(([company, group]) => {
                      const isCollapsed = collapsedCompanies[company];

                      return (
                        <div key={company} className="flex flex-col">
                          {/* Company Accordion Header */}
                          <button
                            type="button"
                            onClick={() => toggleCompany(company)}
                            className="w-full px-3 py-2 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer border-b border-white/5"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isCollapsed ? (
                                <ChevronRight className="w-3.5 h-3.5 text-text-secondary-dark shrink-0" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-brand-primary-dark shrink-0" />
                              )}
                              <Store className="w-3.5 h-3.5 text-brand-primary-dark shrink-0" />
                              <span className="text-xs font-bold truncate text-text-primary-dark">
                                {company}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {group.totalUnread > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-bold">
                                  {group.totalUnread}
                                </span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-text-secondary-dark font-medium">
                                {group.threads.length} {group.threads.length === 1 ? 'expo' : 'expos'}
                              </span>
                            </div>
                          </button>

                          {/* Sub-threads (Expos) */}
                          {!isCollapsed && (
                            <div className="divide-y divide-white/5 bg-black/10">
                              {group.threads.map((thread) => {
                                const isSelected = selectedAppThread?.applicationId === thread.applicationId;
                                const hasMessages = Boolean(thread.lastMessage);
                                const unread = thread.unreadCount || 0;

                                return (
                                  <button
                                    key={thread.applicationId}
                                    type="button"
                                    onClick={() => handleSelectAppThread(thread)}
                                    className={`w-full text-left pl-6 pr-3 py-2.5 transition-all flex flex-col gap-0.5 cursor-pointer ${
                                      isSelected
                                        ? 'bg-brand-primary-dark/20 border-l-4 border-l-brand-primary-dark'
                                        : 'hover:bg-white/5'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={`text-xs font-semibold truncate flex items-center gap-1.5 ${
                                        isSelected ? 'text-brand-primary-dark' : 'text-text-primary-dark'
                                      }`}>
                                        <Calendar className="w-3 h-3 text-text-secondary-dark shrink-0" />
                                        {thread.expoName}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {unread > 0 && (
                                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-bold">
                                            {unread}
                                          </span>
                                        )}
                                        {thread.lastMessage && (
                                          <span className="text-[10px] text-text-secondary-dark">
                                            {new Date(thread.lastMessage.createdAt).toLocaleDateString([], {
                                              month: 'short',
                                              day: 'numeric',
                                            })}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <p className="text-[11px] truncate text-text-secondary-dark">
                                      {hasMessages
                                        ? (thread.lastMessage?.content || '📷 Sent an image attachment')
                                        : 'No messages yet — start chat'}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )
                )}

                {/* Exhibitor View: Flat Application List */}
                {mode === 'applications' && !loadingThreads && user?.role !== 'organizer' && (
                  filteredAppThreads.length === 0 ? (
                    <div className="p-8 text-center opacity-60">
                      <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-medium">No application threads found</p>
                    </div>
                  ) : (
                    filteredAppThreads.map((thread) => {
                      const isSelected = selectedAppThread?.applicationId === thread.applicationId;
                      const hasMessages = Boolean(thread.lastMessage);
                      const unread = thread.unreadCount || 0;

                      return (
                        <button
                          key={thread.applicationId}
                          type="button"
                          onClick={() => handleSelectAppThread(thread)}
                          className={`w-full text-left p-3 transition-all flex flex-col gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-brand-primary-dark/20 border-l-4 border-l-brand-primary-dark'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs font-bold truncate ${
                              isSelected ? 'text-brand-primary-dark' : 'text-text-primary-dark'
                            }`}>
                              {thread.expoName}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {unread > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-bold">
                                  {unread}
                                </span>
                              )}
                              {thread.lastMessage && (
                                <span className="text-[10px] text-text-secondary-dark">
                                  {new Date(thread.lastMessage.createdAt).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-text-secondary-dark">
                            <Store className="w-3 h-3 shrink-0" />
                            <span className="truncate">{thread.companyName}</span>
                          </div>
                          <p className="text-[11px] truncate text-text-secondary-dark">
                            {hasMessages
                              ? (thread.lastMessage?.content || '📷 Sent an image attachment')
                              : 'No messages yet — start chat'}
                          </p>
                        </button>
                      );
                    })
                  )
                )}

                {/* Direct Messages List */}
                {mode === 'direct' && !loadingThreads && (
                  filteredDirectThreads.length === 0 ? (
                    <div className="p-8 text-center opacity-60">
                      <User className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-medium">No direct conversations</p>
                      <p className="text-[11px] text-text-secondary-dark mt-1">
                        Use "Contact Exhibitor" on any expo page to start a chat!
                      </p>
                    </div>
                  ) : (
                    filteredDirectThreads.map((thread) => {
                      const isSelected = selectedDirectThread?.userId === thread.userId;
                      const hasMessages = Boolean(thread.lastMessage);
                      const unread = thread.unreadCount || 0;

                      return (
                        <button
                          key={thread.userId}
                          type="button"
                          onClick={() => handleSelectDirectThread(thread)}
                          className={`w-full text-left p-3 transition-all flex flex-col gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-brand-primary-dark/20 border-l-4 border-l-brand-primary-dark'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs font-bold truncate flex items-center gap-1.5 ${
                              isSelected ? 'text-brand-primary-dark' : 'text-text-primary-dark'
                            }`}>
                              <User className="w-3.5 h-3.5 text-brand-primary-dark shrink-0" />
                              {thread.name}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {unread > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-bold">
                                  {unread}
                                </span>
                              )}
                              {thread.lastMessage && (
                                <span className="text-[10px] text-text-secondary-dark">
                                  {new Date(thread.lastMessage.createdAt).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] text-text-secondary-dark uppercase font-semibold">
                            {thread.role}
                          </span>
                          <p className="text-[11px] truncate text-text-secondary-dark">
                            {hasMessages
                              ? (thread.lastMessage?.content || '📷 Sent an image attachment')
                              : 'No messages yet — start chat'}
                          </p>
                        </button>
                      );
                    })
                  )
                )}
              </div>
            </div>

            {/* ── Right Column: Conversation Area (8 cols on desktop) ─────────── */}
            <div className="lg:col-span-8 flex flex-col h-full min-h-0 overflow-hidden bg-black/20">
              {/* Application Thread Chat */}
              {mode === 'applications' && selectedAppThread ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 border-b border-white/10 flex items-center justify-between gap-3 shrink-0 bg-white/5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-brand-primary-dark/20 text-brand-primary-dark shrink-0">
                        <Store className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold truncate text-text-primary-dark">
                          {selectedAppThread.companyName}
                        </h2>
                        <div className="flex items-center gap-1.5 text-[11px] text-text-secondary-dark truncate">
                          <span>Expo: <strong className="font-semibold text-text-primary-dark">{selectedAppThread.expoName}</strong></span>
                          {selectedAppThread.category && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3" />
                                {selectedAppThread.category}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full capitalize font-semibold ${
                        selectedAppThread.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : selectedAppThread.status === 'rejected'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {selectedAppThread.status}
                      </span>
                    </div>
                  </div>

                  {/* Messages Feed — Compact & Scrollable */}
                  <div
                    ref={messagesContainerRef}
                    className="flex-1 p-3 md:p-4 overflow-y-auto min-h-0 space-y-3"
                  >
                    {loadingMessages && (
                      <div className="flex flex-col items-center justify-center h-full gap-2 opacity-70">
                        <Loader2 className="w-5 h-5 animate-spin text-brand-primary-dark" />
                        <span className="text-xs">Loading messages…</span>
                      </div>
                    )}

                    {!loadingMessages && appMessages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-2 opacity-60">
                        <MessageCircle className="w-8 h-8 opacity-40 text-brand-primary-dark" />
                        <p className="text-sm font-semibold text-text-primary-dark">Start the Conversation</p>
                        <p className="text-xs text-text-secondary-dark max-w-xs">
                          Send a message to coordinate booth requirements, documents, or schedules.
                        </p>
                      </div>
                    )}

                    {!loadingMessages && appMessages.map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      const isOrganizer = msg.senderRole === 'organizer';

                      return (
                        <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-text-secondary-dark">
                            {isOrganizer ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-brand-primary-dark">
                                <ShieldCheck className="w-3 h-3" />
                                {msg.senderName} (Organizer)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-semibold">
                                <User className="w-3 h-3" />
                                {isMe ? 'You' : msg.senderName}
                              </span>
                            )}
                            <span>·</span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div
                            className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs break-words shadow-md ${
                              isMe
                                ? 'bg-brand-primary-dark text-white rounded-tr-xs'
                                : 'bg-white/10 text-text-primary-dark border border-white/10 rounded-tl-xs'
                            }`}
                          >
                            {msg.attachmentUrl && (
                              <div className="mb-1.5">
                                <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={msg.attachmentUrl}
                                    alt="Attachment"
                                    className="max-h-52 rounded-lg object-contain cursor-pointer hover:opacity-95 transition-opacity"
                                  />
                                </a>
                              </div>
                            )}
                            {msg.content && <div>{msg.content}</div>}
                          </div>

                          {/* Read Receipts Status */}
                          {isMe && (
                            <div className="mt-0.5 text-[10px] text-text-secondary-dark flex items-center gap-1">
                              {msg.isRead ? (
                                <span className="flex items-center gap-0.5 text-blue-400 font-medium">
                                  <CheckCheck className="w-3 h-3" />
                                  Read
                                </span>
                              ) : (
                                <span className="flex items-center gap-0.5 opacity-70">
                                  <Check className="w-3 h-3" />
                                  Sent
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </>
              ) : mode === 'direct' && selectedDirectThread ? (
                <>
                  {/* Direct Chat Header */}
                  <div className="p-3 border-b border-white/10 flex items-center justify-between gap-3 shrink-0 bg-white/5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-brand-primary-dark/20 text-brand-primary-dark shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold truncate text-text-primary-dark">
                          {selectedDirectThread.name}
                        </h2>
                        <span className="text-[10px] text-text-secondary-dark uppercase font-semibold tracking-wider">
                          {selectedDirectThread.role} Direct Chat
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Messages Feed */}
                  <div
                    ref={messagesContainerRef}
                    className="flex-1 p-3 md:p-4 overflow-y-auto min-h-0 space-y-3"
                  >
                    {loadingMessages && (
                      <div className="flex flex-col items-center justify-center h-full gap-2 opacity-70">
                        <Loader2 className="w-5 h-5 animate-spin text-brand-primary-dark" />
                        <span className="text-xs">Loading messages…</span>
                      </div>
                    )}

                    {!loadingMessages && directMessages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center py-8 gap-2 opacity-60">
                        <User className="w-8 h-8 opacity-40 text-brand-primary-dark" />
                        <p className="text-sm font-semibold text-text-primary-dark">Start 1-on-1 Discussion</p>
                        <p className="text-xs text-text-secondary-dark max-w-xs">
                          Send a message to exchange inquiries, product info, or booth coordination.
                        </p>
                      </div>
                    )}

                    {!loadingMessages && directMessages.map((msg) => {
                      const isMe = msg.senderId === user?.id;

                      return (
                        <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-text-secondary-dark">
                            <span className="font-semibold">{isMe ? 'You' : msg.senderName}</span>
                            <span>·</span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div
                            className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs break-words shadow-md ${
                              isMe
                                ? 'bg-brand-primary-dark text-white rounded-tr-xs'
                                : 'bg-white/10 text-text-primary-dark border border-white/10 rounded-tl-xs'
                            }`}
                          >
                            {msg.attachmentUrl && (
                              <div className="mb-1.5">
                                <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={msg.attachmentUrl}
                                    alt="Attachment"
                                    className="max-h-52 rounded-lg object-contain cursor-pointer hover:opacity-95 transition-opacity"
                                  />
                                </a>
                              </div>
                            )}
                            {msg.content && <div>{msg.content}</div>}
                          </div>

                          {/* Read Receipts Status */}
                          {isMe && (
                            <div className="mt-0.5 text-[10px] text-text-secondary-dark flex items-center gap-1">
                              {msg.isRead ? (
                                <span className="flex items-center gap-0.5 text-blue-400 font-medium">
                                  <CheckCheck className="w-3 h-3" />
                                  Read
                                </span>
                              ) : (
                                <span className="flex items-center gap-0.5 opacity-70">
                                  <Check className="w-3 h-3" />
                                  Sent
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                  <MessageSquare className="w-10 h-10 opacity-40 mb-2 text-brand-primary-dark" />
                  <p className="text-sm font-semibold text-text-primary-dark">Select a conversation</p>
                  <p className="text-xs text-text-secondary-dark max-w-xs mt-1">
                    Choose a thread from the left panel to read and reply.
                  </p>
                </div>
              )}

              {/* Chat Input Bar (Always docked tightly at the bottom) */}
              {((mode === 'applications' && selectedAppThread) ||
                (mode === 'direct' && selectedDirectThread)) && (
                <div className="p-2.5 border-t border-white/10 shrink-0 bg-white/5 flex flex-col gap-1.5">
                  {attachmentUrl && (
                    <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-brand-primary-dark/20 border border-brand-primary-dark/30 self-start">
                      <ImageIcon className="w-3.5 h-3.5 text-brand-primary-dark" />
                      <span className="text-[11px] font-medium truncate max-w-xs text-text-primary-dark">Image attached</span>
                      <button
                        type="button"
                        onClick={() => setAttachmentUrl(null)}
                        className="text-text-secondary-dark hover:text-red-400 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSend} className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                    />

                    <button
                      type="button"
                      disabled={uploadingAttachment || sending}
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach image (PNG/JPG ≤5MB)"
                      className="p-2 rounded-xl border border-white/10 hover:border-brand-primary-dark text-text-secondary-dark hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {uploadingAttachment ? (
                        <Loader2 className="w-4 h-4 animate-spin text-brand-primary-dark" />
                      ) : (
                        <Paperclip className="w-4 h-4" />
                      )}
                    </button>

                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message…"
                      disabled={sending || loadingMessages}
                      className="flex-1 px-3 py-2 rounded-xl border border-white/10 bg-black/20 text-xs outline-none focus:border-brand-primary-dark text-text-primary-dark placeholder:text-text-secondary-dark/60 transition-colors"
                    />

                    <button
                      type="submit"
                      disabled={sending || (!newMessage.trim() && !attachmentUrl)}
                      className="px-4 py-2 rounded-xl bg-brand-primary-dark hover:opacity-90 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-brand-primary-dark/20"
                    >
                      {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Send</span>
                    </button>
                  </form>
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
