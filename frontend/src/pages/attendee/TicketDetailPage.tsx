import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, QrCode, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { ticketService } from '../../services/ticketService';
import { expoService } from '../../services/expoService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import PageHeader from '../../components/layout/PageHeader';
import QRTicketDisplay from '../../components/ticket/QRTicketDisplay';
import PDFDownloadButton from '../../components/ticket/PDFDownloadButton';
import TicketStatusBadge from '../../components/ticket/TicketStatusBadge';
import { BentoCard } from '../../components/common/BentoCard';
import toast from 'react-hot-toast';

export default function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [ticket, setTicket] = useState<any | null>(null);
  const [expo, setExpo] = useState<any | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!ticketId) return;
    setLoading(true);
    ticketService.getById(ticketId)
      .then(async (data: any) => {
        const ticketData = data?.ticket ?? data;
        setTicket(ticketData);
        if (data?.qrCodeDataUrl) setQrDataUrl(data.qrCodeDataUrl);

        // Fetch expo details if expoId is available
        const eid = typeof ticketData.expoId === 'object' ? ticketData.expoId?._id : ticketData.expoId;
        if (eid) {
          try {
            const expoData = await expoService.getById(eid);
            setExpo(expoData?.expo ?? expoData);
          } catch {
            // Ignore expo load error
          }
        }
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
  const expoName = ticket.expoName || expo?.name || 'Expo Ticket';
  const startDate = expo?.startDate || ticket.startDate;
  const endDate = expo?.endDate || ticket.endDate;
  const venueName = expo?.venueName || ticket.venueName;
  const venueAddress = expo?.venueAddress || ticket.venueAddress;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Ticket" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">
          <div className="max-w-4xl mx-auto">

            {/* Page header */}
            <PageHeader
              title="Ticket Details"
              subtitle="Your official admission pass and registration record."
              backFallback="/attendee/tickets"
              backLabel="My Tickets"
            />

            {/* Two-column layout on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-lg-token items-start">

              {/* LEFT — Event & Ticket Details (7 cols) */}
              <div className="md:col-span-7 flex flex-col gap-lg-token">

                {/* Event identity card */}
                <BentoCard className="p-md-token md:p-lg-token flex flex-col gap-md-token">
                  <div className="flex items-start justify-between gap-sm-token border-b border-border-base-dark/20 pb-sm-token">
                    <div>
                      <h2 className={`text-lg-token font-bold leading-tight-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                        {expoName}
                      </h2>
                      <p className={`text-xs-token mt-1 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                        General Admission Pass
                      </p>
                    </div>
                    <TicketStatusBadge status={ticket.status} />
                  </div>

                  {/* Schedule & Venue information */}
                  <div className="flex flex-col gap-sm-token text-xs-token">
                    {startDate && (
                      <div className={`flex items-start gap-2.5 ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                        <Calendar className={`w-4 h-4 mt-0.5 shrink-0 ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`} />
                        <div>
                          <div className="font-semibold">Event Dates</div>
                          <div className={`mt-0.5 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                            {formatDate(startDate)}{endDate ? ` – ${formatDate(endDate)}` : ''}
                          </div>
                        </div>
                      </div>
                    )}

                    {venueName && (
                      <div className={`flex items-start gap-2.5 ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                        <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`} />
                        <div>
                          <div className="font-semibold">{venueName}</div>
                          {venueAddress && (
                            <div className={`mt-0.5 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                              {venueAddress}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {ticket.registeredAt && (
                      <div className={`pt-xs-token border-t border-border-base-dark/20 flex items-center justify-between text-[11px] ${
                        isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                      }`}>
                        <span>Registered</span>
                        <span>{formatDate(ticket.registeredAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Reference Ticket ID (de-emphasized) */}
                  <div className={`pt-xs-token border-t border-border-base-dark/20 flex items-center justify-between text-[11px] ${
                    isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                  }`}>
                    <span>Ticket Reference</span>
                    <span className="font-mono opacity-80" title={ticket.ticketId}>
                      {ticket.ticketId}
                    </span>
                  </div>
                </BentoCard>

                {/* Cancelled notice */}
                {isCancelled && (
                  <div className={`p-md-token rounded-lg-token text-sm-token flex items-center gap-2.5 border ${
                    isDarkMode
                      ? 'bg-bg-danger-dark/30 text-text-danger-dark border-text-danger-dark/40'
                      : 'bg-bg-danger-light text-text-danger-light border-text-danger-light/40'
                  }`}>
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>This ticket has been cancelled. PDF download and entrance scanning are disabled.</span>
                  </div>
                )}

                {/* Cancel registration action (active only) */}
                {ticket.status === 'active' && (
                  <div className="p-md-token rounded-lg-token border border-border-base-dark/20 flex flex-col sm:flex-row sm:items-center justify-between gap-sm-token">
                    <div>
                      <h4 className={`text-xs-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                        Need to change plans?
                      </h4>
                      <p className={`text-[11px] ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                        You can cancel your ticket anytime before the event.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={cancelling}
                      className={`px-md-token py-xs-token rounded-md-token text-xs-token font-semibold border transition-colors shrink-0 disabled:opacity-60 ${
                        isDarkMode
                          ? 'border-text-danger-dark/60 text-text-danger-dark hover:bg-bg-danger-dark'
                          : 'border-text-danger-light/60 text-text-danger-light hover:bg-bg-danger-light'
                      }`}
                    >
                      {cancelling ? 'Cancelling…' : 'Cancel Registration'}
                    </button>
                  </div>
                )}
              </div>

              {/* RIGHT — QR Code & Admission Pass (5 cols, elevated weight) */}
              <div className="md:col-span-5">
                <BentoCard className={`p-md-token md:p-lg-token border-2 ${
                  isCancelled
                    ? 'opacity-60'
                    : isDarkMode
                    ? 'border-brand-primary-dark/40 shadow-elevation-2-dark'
                    : 'border-brand-primary-light/40 shadow-elevation-2-light'
                }`}>
                  <div className="flex items-center gap-2 mb-md-token pb-sm-token border-b border-border-base-dark/20">
                    <QrCode className={`w-4 h-4 ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`} />
                    <h3 className={`text-sm-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                      Digital Entrance Pass
                    </h3>
                  </div>

                  {!isCancelled ? (
                    <div className="flex flex-col gap-md-token">
                      {qrDataUrl ? (
                        <QRTicketDisplay ticketId={ticket.ticketId} qrCodeDataUrl={qrDataUrl} />
                      ) : (
                        <div className={`p-md-token rounded-lg-token text-xs-token text-center ${
                          isDarkMode ? 'bg-bg-surface-dark text-text-secondary-dark' : 'bg-bg-surface-light text-text-secondary-light'
                        }`}>
                          QR code pass will be rendered in your downloadable PDF ticket.
                        </div>
                      )}

                      <div className="pt-xs-token border-t border-border-base-dark/20">
                        <PDFDownloadButton ticketId={ticket.ticketId} />
                      </div>
                    </div>
                  ) : (
                    <div className={`text-center py-lg-token text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                      Pass is no longer valid.
                    </div>
                  )}
                </BentoCard>
              </div>

            </div>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
