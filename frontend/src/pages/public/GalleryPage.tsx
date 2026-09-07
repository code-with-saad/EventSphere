import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { expoService } from '../../services/expoService';
import PublicNavBar from '../../components/layout/PublicNavBar';
import { Image as ImageIcon, MapPin, ArrowRight, Calendar } from 'lucide-react';
import { BentoCard } from '../../components/common/BentoCard';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  ongoing:   { label: 'Live Now',   cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  upcoming:  { label: 'Upcoming',   cls: 'bg-brand-primary-dark/15 text-brand-primary-dark border-brand-primary-dark/30' },
  completed: { label: 'Completed',  cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
};

export default function GalleryPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [allExpos, setAllExpos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExpos() {
      try {
        setLoading(true);
        const [ongoingRes, upcomingRes, completedRes] = await Promise.all([
          expoService.list({ status: 'ongoing',   limit: 12 }),
          expoService.list({ status: 'upcoming',  limit: 12 }),
          expoService.list({ status: 'completed', limit: 12 }),
        ]);
        const all = [
          ...(ongoingRes?.expos  ?? []),
          ...(upcomingRes?.expos ?? []),
          ...(completedRes?.expos ?? []),
        ];
        setAllExpos(all);
      } catch (err) {
        console.error('Failed to load gallery expos:', err);
      } finally {
        setLoading(false);
      }
    }
    loadExpos();
  }, []);

  const withBanner = allExpos.filter((e) => Boolean(e.bannerUrl));
  const withoutBanner = allExpos.filter((e) => !e.bannerUrl);

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavBar />

      <main className="flex-1">
        {/* ── Page Header ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-xl-token pb-lg-token px-md-token md:px-lg-token">
          <div className="max-w-6xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-xs-token px-sm-token py-xs-token rounded-full text-xs-token font-semibold uppercase tracking-wider mb-md-token bg-brand-primary-dark/10 text-brand-primary-dark border border-brand-primary-dark/20 backdrop-blur-sm">
              <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Visual Gallery</span>
            </div>

            <h1
              className={`text-display-token md:text-5xl font-extrabold tracking-tight leading-tight-token max-w-3xl mx-auto mb-md-token ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}
            >
              Expo{' '}
              <span className={isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}>
                Moments &amp; Highlights
              </span>
            </h1>

            <p
              className={`text-base-token md:text-lg-token leading-normal-token max-w-2xl mx-auto mb-lg-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              Experience curated highlights from live, upcoming, and past exhibitions hosted on EventSphere.
            </p>
          </div>
        </section>

        {/* ── Gallery Grid ────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-md-token md:px-lg-token mb-xl-token md:mb-xxl-token">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md-token">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`aspect-[16/10] rounded-xl-token animate-pulse ${
                    isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'
                  }`}
                />
              ))}
            </div>
          ) : withBanner.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md-token">
              {withBanner.map((expo) => {
                const badge = STATUS_BADGE[expo.status] ?? STATUS_BADGE.upcoming;
                return (
                  <Link
                    key={`gallery-${expo._id}`}
                    to={`/expos/${expo._id}`}
                    className="group relative rounded-xl-token overflow-hidden border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] block aspect-[16/10] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-dark"
                    style={{
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    }}
                  >
                    <img
                      src={expo.bannerUrl}
                      alt={expo.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-md-token text-white">
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border w-fit mb-1 ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      <h3 className="text-sm-token font-bold line-clamp-1 group-hover:text-brand-primary-dark transition-colors">
                        {expo.name}
                      </h3>
                      <div className="flex items-center gap-xs-token mt-0.5 flex-wrap">
                        {expo.venueName && (
                          <p className="text-[11px] text-gray-300 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-brand-primary-dark shrink-0" />
                            {expo.venueName}
                          </p>
                        )}
                        {expo.startDate && (
                          <p className="text-[11px] text-gray-300 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-brand-primary-dark shrink-0" />
                            {formatDate(expo.startDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* Fallback: no banners at all — show text cards for all expos */
            allExpos.length > 0 ? (
              <>
                <p
                  className={`text-sm-token mb-md-token text-center ${
                    isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                  }`}
                >
                  Visual banners will appear here as organizers publish event artwork. Browse all current expos below.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md-token">
                  {allExpos.map((expo) => {
                    const badge = STATUS_BADGE[expo.status] ?? STATUS_BADGE.upcoming;
                    return (
                      <Link
                        key={expo._id}
                        to={`/expos/${expo._id}`}
                        className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-dark rounded-lg-token"
                      >
                        <BentoCard className="h-full p-md-token transition-all hover:border-brand-primary-dark/40 hover:-translate-y-1">
                          <div className="flex items-center justify-between gap-2 mb-sm-token">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.cls}`}
                            >
                              {badge.label}
                            </span>
                            <span
                              className={`text-xs-token ${
                                isDarkMode ? 'text-text-tertiary-dark' : 'text-text-tertiary-light'
                              }`}
                            >
                              {expo.category || 'Exhibition'}
                            </span>
                          </div>
                          <h3
                            className={`text-base-token font-bold mb-xs-token group-hover:text-brand-primary-dark transition-colors line-clamp-1 ${
                              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                            }`}
                          >
                            {expo.name}
                          </h3>
                          <p
                            className={`text-xs-token line-clamp-2 mb-sm-token ${
                              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                            }`}
                          >
                            {expo.description || 'View this expo for full details and exhibitor listings.'}
                          </p>
                          {expo.venueName && (
                            <div className={`flex items-center gap-1.5 text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                              <MapPin className="w-3.5 h-3.5 shrink-0 text-brand-primary-dark" />
                              <span className="truncate">{expo.venueName}</span>
                            </div>
                          )}
                        </BentoCard>
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : (
              <BentoCard className="p-xl-token text-center">
                <ImageIcon
                  className={`w-10 h-10 mx-auto mb-sm-token ${
                    isDarkMode ? 'text-text-tertiary-dark' : 'text-text-tertiary-light'
                  }`}
                />
                <h3
                  className={`text-base-token font-semibold mb-xs-token ${
                    isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                  }`}
                >
                  Gallery Coming Soon
                </h3>
                <p
                  className={`text-sm-token mb-md-token ${
                    isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                  }`}
                >
                  Visual exhibition showcases will populate automatically as organizers publish new events with banner images.
                </p>
                <Link
                  to="/expos"
                  className={`inline-flex items-center gap-1.5 text-sm-token font-semibold transition-colors ${
                    isDarkMode ? 'text-brand-primary-dark hover:underline' : 'text-brand-primary-light hover:underline'
                  }`}
                >
                  Browse All Expos <ArrowRight className="w-4 h-4" />
                </Link>
              </BentoCard>
            )
          )}
        </section>

        {/* ── Expos without banners — supplementary list ──────────────── */}
        {!loading && withBanner.length > 0 && withoutBanner.length > 0 && (
          <section className="max-w-6xl mx-auto px-md-token md:px-lg-token mb-xxl-token">
            <h2
              className={`text-lg-token font-bold mb-md-token ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}
            >
              More Expos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-sm-token">
              {withoutBanner.map((expo) => {
                const badge = STATUS_BADGE[expo.status] ?? STATUS_BADGE.upcoming;
                return (
                  <Link
                    key={expo._id}
                    to={`/expos/${expo._id}`}
                    className={`group block p-sm-token rounded-lg-token border transition-all hover:-translate-y-0.5 hover:border-brand-primary-dark/40 ${
                      isDarkMode
                        ? 'bg-bg-surface-dark border-border-base-dark'
                        : 'bg-white border-border-base-light'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                    <h3
                      className={`text-sm-token font-semibold mt-1 mb-0.5 group-hover:text-brand-primary-dark line-clamp-1 ${
                        isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                      }`}
                    >
                      {expo.name}
                    </h3>
                    {expo.venueName && (
                      <p
                        className={`text-[11px] flex items-center gap-1 ${
                          isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                        }`}
                      >
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{expo.venueName}</span>
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer
        className={`border-t py-lg-token px-md-token md:px-lg-token backdrop-blur-md transition-colors ${
          isDarkMode
            ? 'bg-glass-dark border-glass-border-dark text-text-secondary-dark'
            : 'bg-glass-light border-glass-border-light text-text-secondary-light'
        }`}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-sm-token text-xs-token">
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
              EventSphere
            </span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex items-center gap-md-token">
            <Link to="/" className="hover:underline">Home</Link>
            <Link to="/about" className="hover:underline">About</Link>
            <Link to="/expos" className="hover:underline">Browse Expos</Link>
            <Link to="/login" className="hover:underline">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
