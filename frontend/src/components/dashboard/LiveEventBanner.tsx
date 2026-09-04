import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, ArrowRight, ScanLine, Ticket, Store } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface LiveEventBannerProps {
  expoId: string;
  expoName: string;
  startDate?: string;
  endDate?: string;
  venueName?: string;
  role: 'organizer' | 'exhibitor' | 'attendee';
  ticketId?: string;
}

export const LiveEventBanner: React.FC<LiveEventBannerProps> = ({
  expoId,
  expoName,
  startDate,
  endDate,
  venueName,
  role,
  ticketId,
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const navigate = useNavigate();

  const handleAction = () => {
    if (role === 'organizer') {
      navigate('/organizer/scanner');
    } else if (role === 'exhibitor') {
      navigate(`/expos/${expoId}`);
    } else {
      if (ticketId) {
        navigate(`/attendee/tickets/${ticketId}`);
      } else {
        navigate(`/expos/${expoId}`);
      }
    }
  };

  const actionText =
    role === 'organizer'
      ? 'Launch Scanner'
      : role === 'exhibitor'
      ? 'View Live Expo'
      : ticketId
      ? 'View Pass'
      : 'Explore Expo';

  const ActionIcon =
    role === 'organizer' ? ScanLine : role === 'exhibitor' ? Store : Ticket;

  return (
    <div
      className={`relative overflow-hidden rounded-xl-token border p-md-token md:p-lg-token backdrop-blur-md transition-all mb-lg-token ${
        isDarkMode
          ? 'bg-gradient-to-r from-brand-primary-dark/15 via-bg-glass-dark to-brand-secondary-dark/10 border-brand-primary-dark/40 shadow-elevation-2-dark'
          : 'bg-gradient-to-r from-brand-primary-light/10 via-bg-glass-light to-brand-secondary-light/10 border-brand-primary-light/40 shadow-elevation-2-light'
      }`}
    >
      {/* Background glow accent */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-primary-dark/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-md-token">
        <div className="flex items-start gap-md-token">
          {/* Pulsing indicator icon */}
          <div
            className={`p-sm-token rounded-lg-token shrink-0 mt-0.5 ${
              isDarkMode
                ? 'bg-brand-primary-dark/20 text-brand-primary-dark'
                : 'bg-brand-primary-light/20 text-brand-primary-light'
            }`}
          >
            <Radio className="w-5 h-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-sm-token flex-wrap mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs-token font-bold uppercase tracking-wider bg-brand-primary-dark text-white shadow-sm">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                Live Now
              </span>
              {venueName && (
                <span
                  className={`text-xs-token ${
                    isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                  }`}
                >
                  at {venueName}
                </span>
              )}
            </div>

            <h3
              className={`text-lg-token font-bold leading-tight-token ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}
            >
              {expoName}
            </h3>

            {(startDate || endDate) && (
              <p
                className={`text-xs-token mt-0.5 ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                {startDate && new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {endDate && ` – ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center sm:self-center shrink-0">
          <button
            type="button"
            onClick={handleAction}
            className={`inline-flex items-center gap-xs-token px-lg-token py-sm-token rounded-md-token text-sm-token font-semibold shadow-md transition-all duration-150 ${
              isDarkMode
                ? 'bg-brand-primary-dark hover:bg-brand-primary-hover-dark text-white'
                : 'bg-brand-primary-light hover:bg-brand-primary-hover-light text-white'
            }`}
          >
            <ActionIcon className="w-4 h-4" />
            <span>{actionText}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveEventBanner;
