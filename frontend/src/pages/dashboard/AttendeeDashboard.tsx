import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, CalendarDays, Compass, MapPin, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { ticketService } from '../../services/ticketService';
import { expoService } from '../../services/expoService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { BentoCard } from '../../components/common/BentoCard';
import TicketStatusBadge from '../../components/ticket/TicketStatusBadge';
import LiveEventBanner from '../../components/dashboard/LiveEventBanner';
import ChartWrapper from '../../components/analytics/ChartWrapper';

interface EnrichedTicket {
  _id: string;
  ticketId: string;
  expoId: string;
  status: 'active' | 'checked_in' | 'cancelled';
  registeredAt: string;
  expoName?: string;
  startDate?: string;
  endDate?: string;
  venueName?: string;
  expoStatus?: string;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AttendeeDashboard() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<EnrichedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAttendeeData() {
      setLoading(true);
      setError(null);
      try {
        const rawTickets = await ticketService.getMine();
        const ticketList: any[] = rawTickets?.tickets ?? (Array.isArray(rawTickets) ? rawTickets : []);

        // Fetch expos map for dates and names if needed
        let exposMap: Record<string, any> = {};
        try {
          const exposData = await expoService.list({ limit: 100 });
          const exposList: any[] = exposData?.expos ?? [];
          exposList.forEach((e) => {
            exposMap[e._id] = e;
          });
        } catch {
          // If expo list fails, continue with tickets
        }

        const enriched: EnrichedTicket[] = ticketList.map((t) => {
          const eid = typeof t.expoId === 'object' ? t.expoId?._id : t.expoId;
          const expoInfo = exposMap[eid];
          return {
            _id: t._id,
            ticketId: t.ticketId,
            expoId: eid,
            status: t.status,
            registeredAt: t.registeredAt,
            expoName: t.expoName || expoInfo?.name || 'Expo',
            startDate: t.startDate || expoInfo?.startDate,
            endDate: t.endDate || expoInfo?.endDate,
            venueName: t.venueName || expoInfo?.venueName,
            expoStatus: t.expoStatus || expoInfo?.status,
          };
        });

        if (!cancelled) {
          setTickets(enriched);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load attendee data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAttendeeData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Compute stats client-side
  const activeTickets = tickets.filter((t) => t.status === 'active');
  const checkedInTickets = tickets.filter((t) => t.status === 'checked_in');
  const cancelledTickets = tickets.filter((t) => t.status === 'cancelled');

  const now = new Date();
  const upcomingEvents = tickets.filter((t) => {
    if (t.status === 'cancelled') return false;
    if (!t.startDate) return t.status === 'active';
    return new Date(t.startDate) >= now || new Date(t.endDate ?? t.startDate) >= now;
  });

  const ongoingTicket = tickets.find(
    (t) => t.expoStatus === 'ongoing' && t.status !== 'cancelled'
  );

  // Ticket chart breakdown
  const ticketPieData = [
    { name: 'Active Pass', value: activeTickets.length, color: '#10B981' },
    { name: 'Checked In', value: checkedInTickets.length, color: '#06B6D4' },
    { name: 'Cancelled', value: cancelledTickets.length, color: '#EF4444' },
  ].filter((d) => d.value > 0);

  // Next upcoming events preview (up to 6)
  const upcomingPreview = [...tickets]
    .filter((t) => t.status !== 'cancelled')
    .sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : new Date(a.registeredAt).getTime();
      const dateB = b.startDate ? new Date(b.startDate).getTime() : new Date(b.registeredAt).getTime();
      return dateA - dateB;
    })
    .slice(0, 6);

  // ── Shared button styles matching OrganizerDashboard ─────────────────────
  const secondaryBtnBase = [
    'inline-flex items-center gap-xs-token',
    'px-md-token py-sm-token rounded-md-token',
    'text-sm-token font-medium',
    'bg-transparent border',
    'transition-colors duration-[120ms]',
  ].join(' ');

  const secondaryBtnDark = 'border-border-strong-dark text-text-primary-dark hover:bg-bg-hover-dark';
  const secondaryBtnLight = 'border-border-strong-light text-text-primary-light hover:bg-bg-hover-light';

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Dashboard" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">

          {/* Live Ongoing Expo Highlight */}
          {ongoingTicket && (
            <LiveEventBanner
              expoId={ongoingTicket.expoId}
              expoName={ongoingTicket.expoName || 'Live Expo'}
              startDate={ongoingTicket.startDate}
              endDate={ongoingTicket.endDate}
              venueName={ongoingTicket.venueName}
              ticketId={ongoingTicket.ticketId}
              role="attendee"
            />
          )}

          {/* 1. Welcome heading + Integrated quick actions */}
          <div className="flex flex-wrap items-center justify-between gap-md-token mb-lg-token">
            <div>
              <h2
                className={`text-xl-token font-semibold leading-tight-token ${
                  isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                }`}
              >
                Welcome, {user?.fullName ?? 'Attendee'}!
              </h2>
              <p
                className={`text-sm-token mt-xs-token ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                Overview of your tickets and registered upcoming expo events
              </p>
            </div>

            {/* Quick-action buttons */}
            <div className="flex flex-wrap items-center gap-sm-token">
              <button
                type="button"
                onClick={() => navigate('/expos')}
                className={`${secondaryBtnBase} ${isDarkMode ? secondaryBtnDark : secondaryBtnLight}`}
              >
                <Compass className="w-4 h-4" aria-hidden="true" />
                Browse Expos
              </button>
              <button
                type="button"
                onClick={() => navigate('/attendee/tickets')}
                className={`${secondaryBtnBase} ${isDarkMode ? secondaryBtnDark : secondaryBtnLight}`}
              >
                <Ticket className="w-4 h-4" aria-hidden="true" />
                My Tickets
              </button>
            </div>
          </div>

          {/* 2. Stats row */}
          <div className="mb-xl-token">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md-token">
                {[0, 1, 2].map((i) => (
                  <BentoCard key={i}>
                    <div className="flex flex-col gap-md-token animate-pulse">
                      <div className="flex items-center gap-sm-token">
                        <div className={`w-6 h-6 rounded-md-token ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                        <div className={`h-3 w-24 rounded-sm-token ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                      </div>
                      <div className={`h-8 w-16 rounded-md-token ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                    </div>
                  </BentoCard>
                ))}
              </div>
            ) : error ? (
              <BentoCard>
                <p className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  {error}. Refresh the page to try again.
                </p>
              </BentoCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md-token">
                <BentoCard>
                  <div className="flex flex-col gap-md-token">
                    <div className="flex items-center gap-sm-token">
                      <Ticket
                        className={`w-6 h-6 flex-shrink-0 ${
                          isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
                        }`}
                        aria-hidden="true"
                      />
                      <span className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                        Active Tickets
                      </span>
                    </div>
                    <span className={`text-2xl-token font-bold leading-tight-token ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}>
                      {activeTickets.length}
                    </span>
                  </div>
                </BentoCard>

                <BentoCard>
                  <div className="flex flex-col gap-md-token">
                    <div className="flex items-center gap-sm-token">
                      <CheckCircle2
                        className={`w-6 h-6 flex-shrink-0 ${
                          isDarkMode ? 'text-text-success-dark' : 'text-text-success-light'
                        }`}
                        aria-hidden="true"
                      />
                      <span className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                        Checked In
                      </span>
                    </div>
                    <span className={`text-2xl-token font-bold leading-tight-token ${
                      isDarkMode ? 'text-text-success-dark' : 'text-text-success-light'
                    }`}>
                      {checkedInTickets.length}
                    </span>
                  </div>
                </BentoCard>

                <BentoCard>
                  <div className="flex flex-col gap-md-token">
                    <div className="flex items-center gap-sm-token">
                      <CalendarDays
                        className={`w-6 h-6 flex-shrink-0 ${
                          isDarkMode ? 'text-brand-secondary-dark' : 'text-brand-secondary-light'
                        }`}
                        aria-hidden="true"
                      />
                      <span className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                        Upcoming Events
                      </span>
                    </div>
                    <span className={`text-2xl-token font-bold leading-tight-token ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}>
                      {upcomingEvents.length}
                    </span>
                  </div>
                </BentoCard>
              </div>
            )}
          </div>

          {/* Ticket Breakdown Chart Widget */}
          {ticketPieData.length > 0 && (
            <div className="mb-xl-token">
              <ChartWrapper
                title="Your Registration Summary"
                subtitle="Live status of all your event tickets and passes"
                loading={loading}
                minHeight={180}
              >
                <div className="flex flex-col sm:flex-row items-center justify-around h-full w-full py-2">
                  <div className="w-full sm:w-1/2 h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ticketPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={60}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {ticketPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDarkMode ? '#18181B' : '#FFFFFF',
                            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}`,
                            borderRadius: '8px',
                            fontSize: '11px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap sm:flex-col gap-2 sm:gap-3 w-full sm:w-1/2 justify-center px-4">
                    {ticketPieData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs-token min-w-[120px]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className={isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}>
                            {item.name}
                          </span>
                        </div>
                        <span className={`font-semibold ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartWrapper>
            </div>
          )}

          {/* 3. Upcoming events section — compact interactive card grid */}
          <section aria-label="Upcoming Events">
            <div className="flex items-center justify-between mb-md-token">
              <h3
                className={`text-base-token font-semibold ${
                  isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                }`}
              >
                Upcoming Events
              </h3>
              {upcomingPreview.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/attendee/tickets')}
                  className={`text-xs-token font-medium underline hover:opacity-80 transition-opacity ${
                    isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
                  }`}
                >
                  View All ({tickets.length})
                </button>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md-token">
                {[0, 1, 2].map((i) => (
                  <BentoCard key={i}>
                    <div className="flex flex-col gap-sm-token animate-pulse py-sm-token">
                      <div className={`h-4 w-48 rounded-sm-token ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                      <div className={`h-3 w-32 rounded-sm-token ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                    </div>
                  </BentoCard>
                ))}
              </div>
            ) : upcomingPreview.length === 0 ? (
              <BentoCard>
                <div className="flex flex-col items-center text-center py-xl-token gap-md-token">
                  <div
                    className={`w-16 h-16 rounded-xl-token flex items-center justify-center ${
                      isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'
                    }`}
                  >
                    <Ticket
                      className={`w-8 h-8 ${
                        isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                  <h4 className={`text-base-token font-semibold leading-tight-token ${
                    isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                  }`}>
                    No upcoming events
                  </h4>
                  <p className={`text-sm-token max-w-xs ${
                    isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                  }`}>
                    Browse available expos and register to get tickets and sessions access.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/expos')}
                    className={`
                      mt-sm-token px-md-token py-sm-token rounded-md-token
                      text-sm-token font-medium transition-colors duration-150
                      ${
                        isDarkMode
                          ? 'bg-brand-primary-dark text-accent-bg-dark hover:bg-accent-hover-dark'
                          : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light'
                      }
                    `}
                  >
                    Browse Expos
                  </button>
                </div>
              </BentoCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md-token">
                {upcomingPreview.map((ticket) => {
                  const isCheckedIn = ticket.status === 'checked_in';

                  return (
                    <div
                      key={ticket._id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/attendee/tickets/${ticket.ticketId}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/attendee/tickets/${ticket.ticketId}`);
                        }
                      }}
                      className={`text-left p-md-token rounded-lg-token border transition-all duration-150 backdrop-blur-md cursor-pointer flex flex-col justify-between ${
                        isDarkMode
                          ? 'bg-glass-dark border-glass-border-dark hover:border-brand-primary-dark hover:shadow-elevation-1-dark'
                          : 'bg-glass-light border-glass-border-light hover:border-brand-primary-light hover:shadow-elevation-1-light'
                      } ${
                        isCheckedIn
                          ? isDarkMode
                            ? 'border-l-4 border-l-text-success-dark'
                            : 'border-l-4 border-l-text-success-light'
                          : isDarkMode
                            ? 'border-l-4 border-l-brand-primary-dark'
                            : 'border-l-4 border-l-brand-primary-light'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-sm-token mb-sm-token">
                          <h4
                            className={`text-sm-token font-semibold line-clamp-1 ${
                              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                            }`}
                            title={ticket.expoName}
                          >
                            {ticket.expoName}
                          </h4>
                          <TicketStatusBadge status={ticket.status} />
                        </div>

                        <div className={`flex flex-col gap-1 text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {ticket.startDate
                                ? `${formatDate(ticket.startDate)}${ticket.endDate ? ` – ${formatDate(ticket.endDate)}` : ''}`
                                : `Registered ${formatDate(ticket.registeredAt)}`}
                            </span>
                          </div>

                          {ticket.venueName && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{ticket.venueName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-md-token pt-xs-token border-t border-border-base-dark/20 flex items-center justify-between">
                        <span className={`text-[11px] font-medium ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`}>
                          View Ticket & QR →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </main>
      </div>
      <BottomNav />
    </div>
  );
}
