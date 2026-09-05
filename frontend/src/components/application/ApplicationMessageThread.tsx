import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { messageService, ApplicationMessage } from '../../services/messageService';
import { Send, MessageSquare, X, Loader2, User, ShieldCheck } from 'lucide-react';

interface ApplicationMessageThreadProps {
  isOpen: boolean;
  applicationId: string;
  expoName?: string;
  companyName?: string;
  onClose: () => void;
}

export default function ApplicationMessageThread({
  isOpen,
  applicationId,
  expoName,
  companyName,
  onClose,
}: ApplicationMessageThreadProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [messages, setMessages] = useState<ApplicationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isOpen || !applicationId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    // Initial fetch
    messageService.getByApplication(applicationId)
      .then((msgs) => {
        if (!cancelled) {
          const list = msgs || [];
          console.log('[ApplicationMessageThread] Initial messages loaded, count:', list.length);
          setMessages(list);
          setTimeout(scrollToBottom, 100);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Failed to load conversation');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Polling interval (every 4 seconds)
    const intervalId = setInterval(() => {
      if (cancelled) return;
      messageService.getByApplication(applicationId)
        .then((latestMsgs) => {
          if (cancelled || !latestMsgs) return;
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m._id));
            const newIncoming = latestMsgs.filter((m) => !existingIds.has(m._id));
            if (newIncoming.length > 0) {
              console.log('[ApplicationMessageThread] Polled new messages:', newIncoming.length);
              setTimeout(scrollToBottom, 50);
              return [...prev, ...newIncoming];
            }
            return prev;
          });
        })
        .catch(() => {
          // Silent failure on polling background tick
        });
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isOpen, applicationId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setSending(true);
    try {
      console.log('[ApplicationMessageThread] Sending message:', messageContent);
      const msg = await messageService.sendMessage(applicationId, messageContent);
      console.log('[ApplicationMessageThread] Received send response msg:', msg);
      setMessages((prev) => {
        console.log('[ApplicationMessageThread] Appending msg to state. Prev length:', prev.length);
        const existingIds = new Set(prev.map((m) => m._id));
        if (existingIds.has(msg._id)) return prev;
        const next = [...prev, msg];
        console.log('[ApplicationMessageThread] New messages length:', next.length);
        return next;
      });
      setNewMessage('');
      setTimeout(scrollToBottom, 50);
    } catch (err: any) {
      console.error('[ApplicationMessageThread] Send failed:', err);
      setError(err?.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-md-token"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      <div
        className={`relative z-10 w-full max-w-lg h-[600px] max-h-[90vh] flex flex-col rounded-xl-token border shadow-2xl backdrop-blur-md overflow-hidden ${
          isDarkMode
            ? 'bg-glass-dark border-glass-border-dark text-text-primary-dark'
            : 'bg-glass-light border-glass-border-light text-text-primary-light'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-md-token md:px-lg-token py-md-token border-b border-border-base-dark/20">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-md-token ${isDarkMode ? 'bg-brand-primary-dark/20 text-brand-primary-dark' : 'bg-brand-primary-light/20 text-brand-primary-light'}`}>
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm-token font-bold line-clamp-1">
                {companyName ? `${companyName} Discussion` : 'Application Inquiry'}
              </h3>
              {expoName && (
                <p className={`text-[11px] line-clamp-1 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  Expo: {expoName}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-md-token transition-colors ${
              isDarkMode
                ? 'text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark'
                : 'text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light'
            }`}
            aria-label="Close message thread"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conversation Message List */}
        <div className="flex-1 p-md-token md:p-lg-token overflow-y-auto space-y-3">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-xs-token opacity-70">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading discussion…</span>
            </div>
          )}

          {!loading && error && (
            <div className={`p-sm-token rounded-md-token text-xs-token text-center ${
              isDarkMode ? 'bg-bg-danger-dark text-text-danger-dark' : 'bg-bg-danger-light text-text-danger-light'
            }`}>
              {error}
            </div>
          )}

          {!loading && !error && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 gap-2 opacity-60">
              <MessageSquare className="w-8 h-8" />
              <p className="text-sm-token font-medium">No messages yet</p>
              <p className="text-xs-token max-w-xs">
                Ask a question about your booth assignment, event requirements, or application status.
              </p>
            </div>
          )}

          {!loading && messages.map((msg) => {
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
                  className={`max-w-[85%] rounded-lg-token px-3.5 py-2 text-sm-token break-words shadow-sm ${
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

        {/* Input box */}
        <form onSubmit={handleSend} className="p-sm-token md:p-md-token border-t border-border-base-dark/20 flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message…"
            disabled={sending || loading}
            className={`flex-1 px-sm-token py-2 rounded-md-token border text-sm-token outline-none transition-colors ${
              isDarkMode
                ? 'bg-glass-dark border-border-base-dark text-text-primary-dark placeholder-text-tertiary-dark focus:border-brand-primary-dark'
                : 'bg-glass-light border-border-base-light text-text-primary-light placeholder-text-tertiary-light focus:border-brand-primary-light'
            }`}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className={`px-md-token py-2 rounded-md-token text-sm-token font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isDarkMode
                ? 'bg-brand-primary-dark text-text-on-primary-dark hover:opacity-90'
                : 'bg-brand-primary-light text-text-on-primary-light hover:opacity-90'
            }`}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
