import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { ticketService } from '../../services/ticketService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import PageHeader from '../../components/layout/PageHeader';
import QRTicketDisplay from '../../components/ticket/QRTicketDisplay';
import PDFDownloadButton from '../../components/ticket/PDFDownloadButton';
import TicketStatusBadge from '../../components/ticket/TicketStatusBadge';
import toast from 'react-hot-toast';

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [ticket, setTicket] = useState<any | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!ticketId) return;
    setLoading(true);
    ticketService.getById(ticketId)
      .then((data: any) => {
        setTicket(data?.ticket ?? data);
        if (data?.qrCodeDataUrl) setQrDataUrl(data.qrCodeDataUrl);
      })
      .catch((err: any) => setError(err?.response?.data?.message || err?.message || 'Failed to load ticket'))
      .finally(() => setLoading(false));
  }, [ticketId]);

  const handleCancel = async () => {
    if (!ticketId || !ticket) return;
    setCancelling(true);
    try {
      await ticketService.cancel(ticketId);
      toast.success('Ticket cancelled.');
      navigate('/attendee/tickets', { replace: true });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to cancel ticket');
      setCancelling(false);
    }
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Ticket" />
        <main className="flex-1 p-md-token md:p-lg-token">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );

  if (loading) return (
    <Shell>
      <p className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
        Loading ticket…
      </p>
    </Shell>
  );

  if (error || !ticket) return (
    <Shell>
      <p className={`text-sm-token ${isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}`}>
        {error || 'Ticket not found.'}
      </p>
    </Shell>
  );

  const isCancelled = ticket.status === 'cancelled';

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Ticket" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">
          <div className="max-w-3xl mx-auto">

            {/* Page header */}
            <PageHeader
              title="Ticket Details"
              backFallback="/attendee/tickets"
              backLabel="My Tickets"
            />

            {/* Two-column layout on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg-token">

              {/* LEFT — Event information */}
              <div className="flex flex-col gap-md-token">

                {/* Event identity card */}
                <div className={`rounded-lg-token p-md-token ${isDarkMode ? 'bg-bg-surface-dark' : 'bg-bg-surface-light'}`}>
                  <div className="flex items-start justify-between gap-sm-token mb-sm-token">
                    <h2 className={`text-base-token font-semibold leading-tight-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                      {ticket.expoName ?? 'Expo Ticket'}
                    </h2>
                    <TicketStatusBadge status={ticket.status} />
                  </div>
                  {ticket.registeredAt && (
                    <div className={`flex items-center gap-xs-token text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                      <Calendar className="w-4 h-4 shrink-0" aria-hidden="true" />
                      Registered {new Date(ticket.registeredAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                </div>

                {/* Ticket ID */}
                <div>
                  <p className={`text-xs-token font-medium mb-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                    Ticket ID
                  </p>
                  <p className={`text-xs-token font-mono break-all ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                    {ticket.ticketId}
                  </p>
                </div>

                {/* Cancelled notice */}
                {isCancelled && (
                  <div className={`px-md-token py-sm-token rounded-md-token text-sm-token ${
                    isDarkMode ? 'bg-bg-danger-dark text-text-danger-dark' : 'bg-bg-danger-light text-text-danger-light'
                  }`}>
                    This ticket has been cancelled. PDF and QR downloads are not available.
                  </div>
                )}

                {/* Cancel action — active only */}
                {ticket.status === 'active' && (
                  <div className={`pt-md-token border-t ${isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'}`}>
                    <p className={`text-xs-token mb-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                      You can re-register later if the expo is still open.
                    </p>
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className={`px-md-token py-xs-token rounded-md-token text-sm-token font-medium border transition-colors disabled:opacity-60 ${
                        isDarkMode
                          ? 'border-text-danger-dark text-text-danger-dark hover:bg-bg-danger-dark'
                          : 'border-text-danger-light text-text-danger-light hover:bg-bg-danger-light'
                      }`}
                    >
                      {cancelling ? 'Cancelling…' : 'Cancel Registration'}
                    </button>
                  </div>
                )}
              </div>

              {/* RIGHT — QR code + download actions */}
              <div className="flex flex-col gap-md-token">
                {!isCancelled && (
                  <>
                    {qrDataUrl ? (
                      <QRTicketDisplay ticketId={ticket.ticketId} qrCodeDataUrl={qrDataUrl} />
                    ) : (
                      <div className={`p-md-token rounded-lg-token text-sm-token text-center ${
                        isDarkMode ? 'bg-bg-surface-dark text-text-secondary-dark' : 'bg-bg-surface-light text-text-secondary-light'
                      }`}>
                        QR code is embedded in the PDF ticket.
                      </div>
                    )}
                    <PDFDownloadButton ticketId={ticket.ticketId} />
                  </>
                )}
              </div>

            </div>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
