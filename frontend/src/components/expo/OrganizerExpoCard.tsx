import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Edit3, Users, CalendarClock, Trash2, Radio } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ExpoStatusBadge from './ExpoStatusBadge';
import ExpoStatusTransitionButton from './ExpoStatusTransitionButton';

interface OrganizerExpoCardProps {
  expo: {
    _id: string;
    name: string;
    description?: string;
    status: 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';
    startDate?: string;
    endDate?: string;
    venueName?: string;
    venueAddress?: string;
    bannerUrl?: string;
    totalBooths?: number;
  };
  onDeleteSuccess?: () => void;
  onError?: (msg: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function OrganizerExpoCard({
  expo,
  onDeleteSuccess,
  onError,
}: OrganizerExpoCardProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const navigate = useNavigate();

  const isOngoing = expo.status === 'ongoing';

  const actionBtnClass = `flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md-token text-xs-token font-medium border transition-colors ${
    isDarkMode
      ? 'border-border-base-dark text-text-secondary-dark hover:bg-bg-hover-dark hover:text-text-primary-dark hover:border-border-strong-dark'
      : 'border-border-base-light text-text-secondary-light hover:bg-bg-hover-light hover:text-text-primary-light hover:border-border-strong-light'
  }`;

  return (
    <div
      className={`group relative flex flex-col rounded-lg-token overflow-hidden transition-all duration-200 backdrop-blur-md ${
        isDarkMode
          ? 'bg-glass-dark border border-glass-border-dark hover:border-border-strong-dark shadow-elevation-1-dark'
          : 'bg-glass-light border border-glass-border-light hover:border-border-strong-light shadow-elevation-1-light'
      } ${
        isOngoing
          ? isDarkMode
            ? 'border-l-4 border-l-brand-primary-dark'
            : 'border-l-4 border-l-brand-primary-light'
          : ''
      }`}
    >
      {/* Banner / Header Image */}
      {expo.bannerUrl ? (
        <div className="relative w-full h-36 overflow-hidden bg-bg-surface-dark/20">
          <img
            src={expo.bannerUrl}
            alt={expo.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-surface-dark/80 via-transparent to-black/30" />
          
          {/* Top badge row */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
            {isOngoing && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide bg-brand-primary-dark text-text-on-primary-dark shadow-sm animate-pulse">
                <Radio className="w-3 h-3" />
                LIVE
              </span>
            )}
            <ExpoStatusBadge status={expo.status} />
          </div>
        </div>
      ) : (
        <div
          className={`relative w-full h-24 flex items-center justify-between px-md-token ${
            isDarkMode ? 'bg-bg-hover-dark/60' : 'bg-bg-hover-light/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-md-token flex items-center justify-center text-lg-token font-bold ${
                isDarkMode ? 'bg-brand-primary-dark/20 text-brand-primary-dark' : 'bg-brand-primary-light/20 text-brand-primary-light'
              }`}
            >
              {expo.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isOngoing && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide bg-brand-primary-dark text-text-on-primary-dark shadow-sm animate-pulse">
                <Radio className="w-3 h-3" />
                LIVE
              </span>
            )}
            <ExpoStatusBadge status={expo.status} />
          </div>
        </div>
      )}

      {/* Card Body */}
      <div className="flex-1 flex flex-col p-md-token">
        {/* Title */}
        <h3
          className={`text-base-token font-semibold line-clamp-1 mb-xs-token ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}
          title={expo.name}
        >
          {expo.name}
        </h3>

        {/* Date & Venue Metadata */}
        <div className="flex flex-col gap-1.5 mb-md-token text-xs-token">
          <div
            className={`flex items-center gap-1.5 ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>
              {expo.startDate && expo.endDate
                ? `${formatDate(expo.startDate)} – ${formatDate(expo.endDate)}`
                : 'Dates TBD'}
            </span>
          </div>

          {expo.venueName && (
            <div
              className={`flex items-center gap-1.5 ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{expo.venueName}</span>
            </div>
          )}
        </div>

        {/* Action Row */}
        <div className="mt-auto pt-sm-token border-t border-border-base-dark/30 flex flex-col gap-2">
          {/* Primary 3 actions */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => navigate(`/organizer/expos/${expo._id}/edit`)}
              className={actionBtnClass}
              title="Edit Expo Details"
            >
              <Edit3 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Edit</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/organizer/expos/${expo._id}/applications`)}
              className={actionBtnClass}
              title="Manage Exhibitor Applications"
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Apps</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/organizer/expos/${expo._id}/schedule`)}
              className={actionBtnClass}
              title="Manage Expo Schedule"
            >
              <CalendarClock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Schedule</span>
            </button>
          </div>

          {/* Delete action (subtle / separated at bottom-right) */}
          <div className="flex items-center justify-between pt-1">
            <span
              className={`text-[11px] ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              {expo.totalBooths ? `${expo.totalBooths} Booths` : ''}
            </span>
            <ExpoStatusTransitionButton
              expoId={expo._id}
              action="delete"
              className="text-xs-token px-2 py-1 opacity-70 hover:opacity-100"
              onSuccess={onDeleteSuccess}
              onError={onError}
            >
              <span className="flex items-center gap-1">
                <Trash2 className="w-3 h-3" />
                Delete
              </span>
            </ExpoStatusTransitionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
