import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
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
    startDate?: string;
    endDate?: string;
    venueName?: string;
  };
}

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TicketCard({ ticket }: TicketCardProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const isCancelled = ticket.status === 'cancelled';
  const isCheckedIn = ticket.status === 'checked_in';

  return (
    <Link
      to={`/attendee/tickets/${ticket.ticketId}`}
      className={`group relative flex flex-col justify-between rounded-lg-token p-md-token transition-all duration-200 backdrop-blur-md border ${
        isDarkMode
          ? 'bg-glass-dark border-glass-border-dark hover:border-brand-primary-dark shadow-elevation-1-dark hover:shadow-elevation-2-dark'
          : 'bg-glass-light border-glass-border-light hover:border-brand-primary-light shadow-elevation-1-light hover:shadow-elevation-2-light'
      } ${
        isCancelled
          ? 'opacity-55 grayscale-[30%] hover:opacity-80'
          : isCheckedIn
          ? isDarkMode
            ? 'border-l-4 border-l-text-success-dark'
            : 'border-l-4 border-l-text-success-light'
          : isDarkMode
          ? 'border-l-4 border-l-brand-primary-dark'
          : 'border-l-4 border-l-brand-primary-light'
      }`}
    >
      <div>
        {/* Top row: Expo name + Status badge */}
        <div className="flex items-start justify-between gap-sm-token mb-sm-token">
          <h3
            className={`text-base-token font-semibold line-clamp-1 group-hover:underline ${
              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
            }`}
            title={ticket.expoName ?? 'Expo Ticket'}
          >
            {ticket.expoName ?? 'Expo Ticket'}
          </h3>
          <TicketStatusBadge status={ticket.status} />
        </div>

        {/* Metadata: Date & Venue */}
        <div className="flex flex-col gap-1.5 text-xs-token mb-md-token">
          <div
            className={`flex items-center gap-1.5 ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>
              {ticket.startDate
                ? `${formatDate(ticket.startDate)}${ticket.endDate ? ` – ${formatDate(ticket.endDate)}` : ''}`
                : `Registered ${formatDate(ticket.registeredAt)}`}
            </span>
          </div>

          {ticket.venueName && (
            <div
              className={`flex items-center gap-1.5 ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{ticket.venueName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Shortened Ticket ID & Call to Action */}
      <div className="pt-xs-token border-t border-border-base-dark/20 flex items-center justify-between text-xs-token">
        <span
          className={`font-mono text-[11px] truncate max-w-[120px] ${
            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
          }`}
          title={ticket.ticketId}
        >
          EVT-{ticket.ticketId.substring(0, 8).toUpperCase()}
        </span>
        <span
          className={`text-[11px] font-medium transition-colors ${
            isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
          }`}
        >
          {isCancelled ? 'Details →' : 'View Pass →'}
        </span>
      </div>
    </Link>
  );
}
