import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Heart } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { favoriteService } from '../../services/favoriteService';
import ExpoStatusBadge from './ExpoStatusBadge';
import toast from 'react-hot-toast';

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
  isFavoritedInitially?: boolean;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + '…';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ExpoCard({ expo, isFavoritedInitially = false }: ExpoCardProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { isAuthenticated, user } = useAuth();

  const [isFavorited, setIsFavorited] = useState(isFavoritedInitially);
  const [loadingFav, setLoadingFav] = useState(false);

  useEffect(() => {
    setIsFavorited(isFavoritedInitially);
  }, [isFavoritedInitially]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please log in to save favorites');
      return;
    }
    setLoadingFav(true);
    try {
      if (isFavorited) {
        await favoriteService.removeFavorite(expo._id);
        setIsFavorited(false);
        toast.success('Removed from favorites');
      } else {
        await favoriteService.addFavorite(expo._id);
        setIsFavorited(true);
        toast.success('Added to favorites');
      }
    } catch {
      toast.error('Failed to update favorite');
    } finally {
      setLoadingFav(false);
    }
  };

  return (
    <Link
      to={`/expos/${expo._id}`}
      className={`group relative block rounded-lg-token overflow-hidden transition-all backdrop-blur-sm hover:translate-y-[-2px] ${
        isDarkMode
          ? 'bg-glass-dark border border-glass-border-dark hover:border-brand-primary-dark'
          : 'bg-glass-light border border-glass-border-light hover:border-brand-primary-light'
      }`}
      style={{ willChange: 'transform' }}
    >
      {/* Banner — full width, no padding */}
      {expo.bannerUrl ? (
        <div className="relative w-full h-40 overflow-hidden">
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

      {/* Favorite Heart Button */}
      {(!isAuthenticated || user?.role === 'attendee') && (
        <button
          type="button"
          onClick={handleToggleFavorite}
          disabled={loadingFav}
          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full transition-all shadow-md z-10 ${
            isFavorited
              ? 'bg-red-500 text-white'
              : 'bg-black/40 hover:bg-black/60 text-white/80 hover:text-white'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-white' : ''}`} />
        </button>
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
