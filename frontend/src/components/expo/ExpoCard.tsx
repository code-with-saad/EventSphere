import { Link } from 'react-router-dom';
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
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ExpoCard({ expo }: ExpoCardProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  return (
    <Link
      to={`/expos/${expo._id}`}
      className={`block rounded-lg-token border p-md-token transition-colors hover:opacity-90 ${
        isDarkMode
          ? 'bg-bg-surface-dark border-border-base-dark'
          : 'bg-bg-surface-light border-border-base-light'
      }`}
    >
      {/* Banner image */}
      {expo.bannerUrl && (
        <img
          src={expo.bannerUrl}
          alt={expo.name}
          className="w-full h-40 object-cover rounded-md-token mb-sm-token"
        />
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-sm-token mb-xs-token">
        <h3
          className={`text-base-token font-semibold leading-tight-token ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}
        >
          {expo.name}
        </h3>
        <ExpoStatusBadge status={expo.status} />
      </div>

      {/* Description */}
      <p
        className={`text-sm-token leading-normal-token mb-sm-token ${
          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
        }`}
      >
        {truncate(expo.description, 160)}
      </p>

      {/* Date & venue */}
      <div
        className={`text-xs-token mb-xs-token ${
          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
        }`}
      >
        <span>
          {formatDate(expo.startDate)} – {formatDate(expo.endDate)}
        </span>
        <span className="mx-xs-token">·</span>
        <span>{expo.venueName}</span>
      </div>

      {/* Exhibitor count */}
      {expo.approvedExhibitorCount !== undefined && (
        <div
          className={`text-xs-token font-medium ${
            isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
          }`}
        >
          {expo.approvedExhibitorCount} exhibitor
          {expo.approvedExhibitorCount !== 1 ? 's' : ''}
        </div>
      )}
    </Link>
  );
}
