import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import TicketStatusBadge from './TicketStatusBadge';

interface TicketCardProps {
  ticket: {
    _id: string;
    ticketId: string;
    status: 'active' | 'checked_in' | 'cancelled';
    registeredAt: string;
    expoId?: string;
    expoName?: string;
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function TicketCard({ ticket }: TicketCardProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <Link
      to={`/attendee/tickets/${ticket.ticketId}`}
      className={`block rounded-lg-token border p-md-token transition-colors ${
        isDarkMode
          ? 'bg-bg-surface-dark border-border-base-dark hover:border-brand-primary-dark'
          : 'bg-bg-surface-light border-border-base-light hover:border-brand-primary-light'
      }`}
    >
      {/* Top row: expo name + status badge */}
      <div className="flex flex-wrap items-start justify-between gap-sm-token mb-xs-token">
        <h3 className={`text-sm-token font-semibold ${
          isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
        }`}>
          {ticket.expoName ?? 'Expo Ticket'}
        </h3>
        <TicketStatusBadge status={ticket.status} />
      </div>

      {/* Registration date */}
      <p className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
        Registered {formatDate(ticket.registeredAt)}
      </p>

      {/* Ticket ID (truncated) */}
      <p className={`text-xs-token font-mono mt-xs-token truncate ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
        {ticket.ticketId}
      </p>
    </Link>
  );
}
