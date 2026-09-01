import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import ExpoStatusBadge from './ExpoStatusBadge';

interface ExpoCardProps {
  expo: {
    _id: string;
    name: string;
    description: string;
    status: 'draft' | 'published' | 'ongoing' | 'completed' | 'archived';
    startDate: string;
    endDate: string;
    venueName: string;
    venueAddress: string;
    bannerUrl?: string;
    approvedExhibitorCount?: number;
  };
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + '…';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ExpoCard({ expo }: ExpoCardProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <Link
      to={`/expos/${expo._id}`}
      className={`group block rounded-lg-token overflow-hidden transition-all hover:translate-y-[-2px] ${
        isDarkMode
          ? 'bg-bg-surface-dark border border-border-base-dark hover:border-brand-primary-dark'
          : 'bg-bg-surface-light border border-border-base-light hover:border-brand-primary-light'
      }`}
      style={{ willChange: 'transform' }}
    >
      {/* Banner — full width, no padding */}
      {expo.bannerUrl ? (
        <div className="w-full h-40 overflow-hidden">
          <img
            src={expo.bannerUrl}
            alt={expo.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      ) : (
        <div className={`w-full h-24 flex items-center justify-center ${
          isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'
        }`}>
          <span
            className={`text-xl-token font-bold ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`}
            aria-hidden="true"
          >
            {expo.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="p-md-token">
        <div className="flex items-start justify-between gap-sm-token mb-xs-token">
          <h3 className={`text-base-token font-semibold leading-tight-token ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}>
            {expo.name}
          </h3>
          <ExpoStatusBadge status={expo.status} />
        </div>

        <p className={`text-xs-token leading-normal-token mb-sm-token line-clamp-2 ${
          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
        }`}>
          {truncate(expo.description, 120)}
        </p>

        <div className={`flex flex-col gap-xs-token text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
          <span className="flex items-center gap-xs-token">
            <Calendar className="w-3 h-3 shrink-0" aria-hidden="true" />
            {formatDate(expo.startDate)} – {formatDate(expo.endDate)}
          </span>
          <span className="flex items-center gap-xs-token truncate">
            <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{expo.venueName}</span>
          </span>
        </div>

        {expo.approvedExhibitorCount !== undefined && expo.approvedExhibitorCount > 0 && (
          <div className={`mt-sm-token pt-sm-token border-t text-xs-token font-medium ${
            isDarkMode ? 'border-border-base-dark text-brand-primary-dark' : 'border-border-base-light text-brand-primary-light'
          }`}>
            {expo.approvedExhibitorCount} exhibitor{expo.approvedExhibitorCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </Link>
  );
}
