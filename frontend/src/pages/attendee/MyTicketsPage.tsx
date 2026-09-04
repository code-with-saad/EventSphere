import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ticketService } from '../../services/ticketService';
import { expoService } from '../../services/expoService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import PageHeader from '../../components/layout/PageHeader';
import TicketCard from '../../components/ticket/TicketCard';
import { Search } from 'lucide-react';

export default function MyTicketsPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function loadTickets() {
      try {
        const rawTickets = await ticketService.getMine();
        const ticketList: any[] = rawTickets?.tickets ?? (Array.isArray(rawTickets) ? rawTickets : []);

        // Load expos map for date & venue metadata
        let exposMap: Record<string, any> = {};
        try {
          const exposData = await expoService.list({ limit: 100 });
          const exposList: any[] = exposData?.expos ?? [];
          exposList.forEach((e) => {
            exposMap[e._id] = e;
          });
        } catch {
          // Continue if expo lookup fails
        }

        const enriched = ticketList.map((t) => {
          const eid = typeof t.expoId === 'object' ? t.expoId?._id : t.expoId;
          const expoInfo = exposMap[eid];
          return {
            ...t,
            expoId: eid,
            expoName: t.expoName || expoInfo?.name,
            startDate: t.startDate || expoInfo?.startDate,
            endDate: t.endDate || expoInfo?.endDate,
            venueName: t.venueName || expoInfo?.venueName,
          };
        });

        if (!cancelled) {
          setTickets(enriched);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load tickets');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTickets();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAndSortedTickets = useMemo(() => {
    const statusOrder: Record<string, number> = {
      active: 1,
      checked_in: 2,
      cancelled: 3,
    };

    return [...tickets]
      .filter((ticket) => {
        if (!searchTerm.trim()) return true;
        const name = (ticket.expoName || '').toLowerCase();
        return name.includes(searchTerm.toLowerCase().trim());
      })
      .sort((a, b) => {
        const orderA = statusOrder[a.status] ?? 99;
        const orderB = statusOrder[b.status] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        // Secondary sort: most recent registration first
        const dateA = new Date(a.registeredAt || 0).getTime();
        const dateB = new Date(b.registeredAt || 0).getTime();
        return dateB - dateA;
      });
  }, [tickets, searchTerm]);

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="My Tickets" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">

          <PageHeader
            title="My Tickets"
            subtitle="Access your event passes, check-in QR codes, and admission status."
          />

          {/* Search bar */}
          {!loading && !error && tickets.length > 0 && (
            <div className="mb-lg-token relative max-w-md">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                isDarkMode ? 'text-text-tertiary-dark' : 'text-text-tertiary-light'
              }`} />
              <input
                type="text"
                placeholder="Search tickets by expo name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-sm-token py-xs-token rounded-md-token border text-sm-token outline-none transition-colors ${
                  isDarkMode
                    ? 'bg-bg-glass-dark border-border-base-dark text-text-primary-dark placeholder-text-tertiary-dark focus:border-brand-primary-dark'
                    : 'bg-bg-glass-light border-border-base-light text-text-primary-light placeholder-text-tertiary-light focus:border-brand-primary-light'
                }`}
              />
            </div>
          )}

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
              <p className="text-sm-token">Register for an expo to get your ticket pass.</p>
            </div>
          )}

          {/* No search results */}
          {!loading && !error && tickets.length > 0 && filteredAndSortedTickets.length === 0 && (
            <div className={`text-center py-xl-token ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}>
              <p className="text-base-token font-medium mb-xs-token">No matching tickets</p>
              <p className="text-sm-token">Try adjusting your search query.</p>
            </div>
          )}

          {/* Responsive Ticket Grid */}
          {!loading && !error && filteredAndSortedTickets.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md-token md:gap-lg-token">
              {filteredAndSortedTickets.map((ticket: any) => (
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
