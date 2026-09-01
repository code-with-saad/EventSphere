import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ticketService } from '../../services/ticketService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import TicketCard from '../../components/ticket/TicketCard';

export default function MyTicketsPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    ticketService.getMine()
      .then((data: any) => {
        if (!cancelled)
          setTickets(data?.tickets ?? (Array.isArray(data) ? data : []));
      })
      .catch((err: any) => {
        if (!cancelled)
          setError(err?.response?.data?.message || err?.message || 'Failed to load tickets');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="My Tickets" />
        <main className={`flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token ${
          isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'
        }`}>

          <h2 className={`text-xl-token font-semibold mb-lg-token leading-tight-token ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}>
            My Tickets
          </h2>

          {/* Loading */}
          {loading && (
            <div className={`text-center py-xl-token text-sm-token ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}>
              Loading your tickets…
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className={`text-center py-xl-token text-sm-token ${
              isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'
            }`}>
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && tickets.length === 0 && (
            <div className={`text-center py-xl-token ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}>
              <p className="text-base-token font-medium mb-xs-token">No tickets yet</p>
              <p className="text-sm-token">Register for an expo to get your ticket.</p>
            </div>
          )}

          {/* Ticket list */}
          {!loading && !error && tickets.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md-token">
              {tickets.map((ticket: any) => (
                <TicketCard key={ticket._id} ticket={ticket} />
              ))}
            </div>
          )}

        </main>
      </div>
      <BottomNav />
    </div>
  );
}
