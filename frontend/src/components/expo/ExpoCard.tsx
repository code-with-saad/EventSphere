import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Heart, Users, Building2, Flame } from 'lucide-react';
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
    attendeeCount?: number;
    totalBooths?: number;
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

  const attendeeCount = expo.attendeeCount || 0;
  const exhibitorCount = expo.approvedExhibitorCount || 0;
  const totalBooths = expo.totalBooths || 0;
  const boothFillPercent = totalBooths > 0 ? Math.min(100, Math.round((exhibitorCount / totalBooths) * 100)) : 0;
  
  // Trending condition: active/upcoming/ongoing with good attendee momentum or high exhibitor interest
  const isTrending =
    expo.status !== 'completed' &&
    expo.status !== 'archived' &&
    (attendeeCount >= 5 || exhibitorCount >= 3 || (totalBooths > 0 && exhibitorCount / totalBooths >= 0.5));

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
          {isTrending && (
            <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs-token font-bold uppercase tracking-wider bg-orange-500/90 text-white backdrop-blur-sm shadow-md z-10 animate-pulse">
              <Flame className="w-3 h-3 text-yellow-200 fill-yellow-200" />
              <span>Trending</span>
            </div>
          )}
        </div>
      ) : (
        <div className={`relative w-full h-40 flex items-center justify-center ${
          isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'
        }`}>
          {isTrending && (
            <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs-token font-bold uppercase tracking-wider bg-orange-500/90 text-white backdrop-blur-sm shadow-md z-10">
              <Flame className="w-3 h-3 text-yellow-200 fill-yellow-200" />
              <span>Trending</span>
            </div>
          )}
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

        {/* Social Proof Stats Bar */}
        {(attendeeCount > 0 || exhibitorCount > 0 || totalBooths > 0) && (
          <div className={`mt-sm-token pt-sm-token border-t flex items-center justify-between gap-2 text-2xs-token font-medium ${
            isDarkMode ? 'border-border-base-dark/60 text-text-secondary-dark' : 'border-border-base-light/60 text-text-secondary-light'
          }`}>
            <div className="flex items-center gap-2 flex-wrap">
              {attendeeCount > 0 && (
                <span className="flex items-center gap-1" title={`${attendeeCount} attendees registered`}>
                  <Users className={`w-3.5 h-3.5 ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`} />
                  <span className={isDarkMode ? 'text-text-primary-dark font-semibold' : 'text-text-primary-light font-semibold'}>
                    {attendeeCount}
                  </span>
                  <span>attendee{attendeeCount !== 1 ? 's' : ''}</span>
                </span>
              )}
              {exhibitorCount > 0 && (
                <span className="flex items-center gap-1" title={`${exhibitorCount} exhibitors confirmed`}>
                  <Building2 className={`w-3.5 h-3.5 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  <span className={isDarkMode ? 'text-text-primary-dark font-semibold' : 'text-text-primary-light font-semibold'}>
                    {exhibitorCount}
                  </span>
                  <span>exhibitor{exhibitorCount !== 1 ? 's' : ''}</span>
                </span>
              )}
            </div>

            {totalBooths > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-2xs-token ${
                boothFillPercent >= 80
                  ? isDarkMode ? 'bg-red-500/20 text-red-300 font-semibold' : 'bg-red-100 text-red-700 font-semibold'
                  : isDarkMode ? 'bg-bg-hover-dark text-text-secondary-dark' : 'bg-bg-hover-light text-text-secondary-light'
              }`}>
                {boothFillPercent}% filled
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
