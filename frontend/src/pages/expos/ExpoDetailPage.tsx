import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Building2, Globe, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { expoService } from '../../services/expoService';
import { sessionService } from '../../services/sessionService';
import { ticketService } from '../../services/ticketService';
import ExpoStatusBadge from '../../components/expo/ExpoStatusBadge';
import ExhibitorCard from '../../components/exhibitor/ExhibitorCard';
import ExhibitorFilterBar from '../../components/exhibitor/ExhibitorFilterBar';
import ExhibitorDetailModal from '../../components/exhibitor/ExhibitorDetailModal';
import { BoothSelectorGrid } from '../../components/expo/BoothSelectorGrid';
import PublicNavBar from '../../components/layout/PublicNavBar';
import BackButton from '../../components/layout/BackButton';
import { BentoCard } from '../../components/common/BentoCard';

function formatDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function ExpoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user, isAuthenticated } = useAuth();

  const [expo, setExpo] = useState<any | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedExhibitor, setSelectedExhibitor] = useState<any | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<{ text: string; type: 'success' | 'warn' } | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([
      expoService.getById(id),
      sessionService.list(id).catch(() => []),
    ])
      .then(([expoData, sessionData]: [any, any]) => {
        setExpo(expoData?.expo ?? expoData);
        setSessions(sessionData?.sessions ?? (Array.isArray(sessionData) ? sessionData : []));
      })
      .catch((err: any) => setError(err?.response?.data?.message || err?.message || 'Failed to load expo'))
      .finally(() => setLoading(false));
  }, [id]);

  const exhibitors: any[] = expo?.approvedApplications ?? [];
  const categories = useMemo(() => [...new Set<string>(exhibitors.map((e: any) => e.category).filter(Boolean))], [exhibitors]);
  const filteredExhibitors = useMemo(() => exhibitors.filter((e: any) => {
    const matchSearch = !searchQuery || e.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = !selectedCategory || e.category === selectedCategory;
    return matchSearch && matchCat;
  }), [exhibitors, searchQuery, selectedCategory]);

  const handleRegister = async () => {
    if (!isAuthenticated) { navigate(`/login?redirect=/expos/${id}`); return; }
    if (!id) return;
    setRegistering(true);
    setRegisterMessage(null);
    try {
      await ticketService.register(id);
      setRegisterMessage({ text: 'Successfully registered! Check My Tickets.', type: 'success' });
    } catch (err: any) {
      const code = err?.response?.data?.code;
      setRegisterMessage({
        text: code === 'DUPLICATE_REGISTRATION' ? 'You are already registered for this expo.' : err?.response?.data?.message || 'Registration failed.',
        type: 'warn',
      });
    } finally {
      setRegistering(false);
    }
  };

  const handleApply = () => {
    if (!isAuthenticated) { navigate(`/login?redirect=/expos/${id}`); return; }
    navigate(`/expos/${id}/apply`);
  };

  const primaryBtn = `w-full py-sm-token px-md-token rounded-md-token text-sm-token font-semibold text-center transition-colors disabled:opacity-60 ${
    isDarkMode
      ? 'bg-brand-primary-dark text-text-on-primary-dark hover:bg-accent-hover-dark focus:outline-none'
      : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light focus:outline-none'
  }`;

  const secondaryBtn = `w-full py-sm-token px-md-token rounded-md-token text-sm-token font-medium text-center border transition-colors ${
    isDarkMode
      ? 'border-border-strong-dark text-text-primary-dark hover:bg-bg-hover-dark'
      : 'border-border-strong-light text-text-primary-light hover:bg-bg-hover-light'
  }`;

  if (loading) return (
    <div className="min-h-screen">
      <PublicNavBar />
      <div className="flex items-center justify-center py-xxl-token">
        <p className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>Loading…</p>
      </div>
    </div>
  );

  if (error || !expo) return (
    <div className="min-h-screen">
      <PublicNavBar />
      <div className="flex items-center justify-center py-xxl-token">
        <p className={`text-sm-token ${isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}`}>{error || 'Expo not found.'}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <PublicNavBar />

      {/* Hero banner — full width, fixed height */}
      <div className="w-full relative overflow-hidden" style={{ height: '320px' }}>
        {expo.bannerUrl ? (
          <>
            <img
              src={expo.bannerUrl}
              alt={expo.name}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay bottom fade */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: isDarkMode
                  ? 'linear-gradient(to bottom, rgba(10,10,12,0) 40%, rgba(10,10,12,1) 100%)'
                  : 'linear-gradient(to bottom, rgba(245,245,244,0) 40%, rgba(245,245,244,1) 100%)',
              }}
              aria-hidden="true"
            />
          </>
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-sm-token"
            style={{
              background: isDarkMode ? '#0A0A0C' : '#F5F5F4',
            }}
          >
            <span
              className={`text-xl-token font-bold tracking-tight ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`}
            >
              {expo.name}
            </span>
            {expo.category && (
              <span className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                {expo.category}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area: Two Columns on lg+ */}
      <div className="max-w-6xl mx-auto px-md-token md:px-lg-token pt-lg-token md:pt-xl-token pb-xxl-token">
        {/* Return to listing back button */}
        <div className="mb-md-token">
          <BackButton fallback="/expos" label="Browse Expos" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg-token lg:gap-xl-token items-start">
          
          {/* ── Left Column (~65% width: 8 cols on lg) ────────────────── */}
          <div className="lg:col-span-8 flex flex-col gap-xl-token min-w-0">
            
            {/* Header / Title block */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-sm-token mb-sm-token">
                <div className="flex flex-wrap items-center gap-sm-token">
                  <ExpoStatusBadge status={expo.status} />
                  {expo.category && (
                    <span className={`inline-flex items-center px-sm-token py-xs-token rounded-sm-token text-xs-token font-medium ${
                      isDarkMode
                        ? 'bg-bg-surface-dark text-text-secondary-dark border border-border-base-dark'
                        : 'bg-bg-surface-light text-text-secondary-light border border-border-base-light'
                    }`}>
                      {expo.category}
                    </span>
                  )}
                </div>

                {(!isAuthenticated || user?.role === 'attendee') && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!isAuthenticated) {
                        navigate(`/login?redirect=/expos/${id}`);
                        return;
                      }
                      try {
                        const favIds = await (await import('../../services/favoriteService')).favoriteService.getFavoriteIds();
                        const isFav = favIds.includes(expo._id);
                        if (isFav) {
                          await (await import('../../services/favoriteService')).favoriteService.removeFavorite(expo._id);
                          (await import('react-hot-toast')).default.success('Removed from favorites');
                        } else {
                          await (await import('../../services/favoriteService')).favoriteService.addFavorite(expo._id);
                          (await import('react-hot-toast')).default.success('Added to favorites');
                        }
                      } catch {
                        (await import('react-hot-toast')).default.error('Failed to update favorite');
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs-token font-semibold border transition-all cursor-pointer ${
                      isDarkMode
                        ? 'border-border-base-dark bg-glass-dark text-text-primary-dark hover:border-red-500 hover:text-red-500'
                        : 'border-border-base-light bg-white text-text-primary-light hover:border-red-500 hover:text-red-500'
                    }`}
                  >
                    <span className="text-red-500 font-bold">♥</span>
                    <span>Favorite</span>
                  </button>
                )}
              </div>
              <h1 className={`text-2xl-token md:text-display-token font-bold leading-tight-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                {expo.name}
              </h1>
            </div>

            {/* Registration feedback */}
            {registerMessage && (
              <div className={`p-md-token rounded-md-token text-sm-token flex items-center gap-sm-token border ${
                registerMessage.type === 'success'
                  ? isDarkMode 
                    ? 'bg-bg-success-dark border-text-success-dark text-text-success-dark' 
                    : 'bg-bg-success-light border-text-success-light text-text-success-light'
                  : isDarkMode 
                    ? 'bg-bg-warning-dark border-text-warning-dark text-text-warning-dark' 
                    : 'bg-bg-warning-light border-text-warning-light text-text-warning-light'
              }`}>
                {registerMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                )}
                <span>{registerMessage.text}</span>
              </div>
            )}

            {/* About Section */}
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className={`text-lg-token font-semibold mb-sm-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                About this Expo
              </h2>
              <div className={`text-base-token leading-loose-token whitespace-pre-line ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                {expo.description}
              </div>
            </section>

            {/* Exhibitors Section with subtle surface container */}
            {exhibitors.length > 0 && (
              <section aria-labelledby="exhibitors-heading" className={`p-md-token md:p-lg-token rounded-xl-token border ${
                isDarkMode 
                  ? 'bg-bg-surface-dark/90 border-border-base-dark' 
                  : 'bg-bg-surface-light/95 border-border-base-light'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-sm-token mb-md-token">
                  <h2 id="exhibitors-heading" className={`text-lg-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                    Featured Exhibitors{' '}
                    <span className={`text-sm-token font-normal ml-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                      ({exhibitors.length})
                    </span>
                  </h2>
                </div>

                <div className="mb-md-token">
                  <ExhibitorFilterBar
                    onSearch={setSearchQuery}
                    onCategoryChange={setSelectedCategory}
                    categories={categories}
                    selectedCategory={selectedCategory}
                  />
                </div>

                {filteredExhibitors.length === 0 ? (
                  <p className={`text-sm-token py-md-token text-center ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                    No exhibitors match your search or filter.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-md-token">
                    {filteredExhibitors.map((ex: any) => (
                      <ExhibitorCard key={ex._id} exhibitor={ex} onClick={() => setSelectedExhibitor(ex)} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Schedule Section — Timeline Layout */}
            {sessions.length > 0 && (
              <section aria-labelledby="schedule-heading">
                <div className="flex items-center justify-between flex-wrap gap-sm-token mb-md-token">
                  <h2 id="schedule-heading" className={`text-lg-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                    Event Schedule
                  </h2>
                  <button
                    onClick={() => navigate(`/expos/${id}/schedule`)}
                    className={`inline-flex items-center gap-1.5 px-sm-token py-1.5 rounded-md-token text-xs-token font-semibold border transition-colors cursor-pointer ${
                      isDarkMode
                        ? 'border-brand-primary-dark text-brand-primary-dark hover:bg-brand-primary-dark/10'
                        : 'border-brand-primary-light text-brand-primary-light hover:bg-brand-primary-light/10'
                    }`}
                  >
                    <span>View Full Schedule & Bookmarks</span>
                    <span>→</span>
                  </button>
                </div>

                <div className="relative pl-6 md:pl-8 space-y-md-token before:absolute before:left-[11px] md:before:left-[15px] before:top-3 before:bottom-3 before:w-[2px] before:bg-brand-primary-dark/40">
                  {sessions.map((s: any) => (
                    <div key={s._id} className="relative group">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[24px] md:-left-[33px] top-4 w-3.5 h-3.5 rounded-full border-2 ${
                        isDarkMode 
                          ? 'bg-bg-base-dark border-brand-primary-dark' 
                          : 'bg-bg-base-light border-brand-primary-light'
                      } group-hover:scale-125 transition-transform`} aria-hidden="true" />

                      {/* Session Content Card */}
                      <div className={`p-md-token rounded-lg-token border transition-colors ${
                        isDarkMode
                          ? 'bg-glass-dark border-glass-border-dark hover:border-brand-primary-dark/60'
                          : 'bg-glass-light border-glass-border-light hover:border-brand-primary-light/60'
                      }`}>
                        <div className="flex flex-wrap items-center justify-between gap-xs-token mb-xs-token">
                          <span className={`inline-flex items-center gap-xs-token text-xs-token font-semibold ${
                            isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
                          }`}>
                            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                            {formatTime(s.startTime)} – {formatTime(s.endTime)}
                          </span>
                          {s.track && (
                            <span className={`text-xs-token px-xs-token py-0.5 rounded-sm-token font-medium ${
                              isDarkMode ? 'bg-bg-hover-dark text-text-secondary-dark' : 'bg-bg-hover-light text-text-secondary-light'
                            }`}>
                              {s.track}
                            </span>
                          )}
                        </div>

                        <h3 className={`text-base-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                          {s.title}
                        </h3>

                        <p className={`text-xs-token mt-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                          Speaker: <span className="font-medium text-text-primary-dark">{s.speakerName}</span> · Room: <span className="font-medium">{s.room}</span>
                        </p>

                        {s.description && (
                          <p className={`text-xs-token mt-sm-token leading-normal-token ${isDarkMode ? 'text-text-muted-dark' : 'text-text-muted-light'}`}>
                            {s.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Booth Layout / Floorplan section */}
            {expo.totalBooths && expo.totalBooths > 0 && (
              <section aria-labelledby="booths-heading" className={`p-md-token md:p-lg-token rounded-xl-token border ${
                isDarkMode
                  ? 'bg-bg-surface-dark/90 border-border-base-dark'
                  : 'bg-bg-surface-light/95 border-border-base-light'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-sm-token mb-md-token">
                  <div>
                    <h2 id="booths-heading" className={`text-lg-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                      Exhibition Floor Layout
                    </h2>
                    <p className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                      Available and reserved booths across the exhibition floor
                    </p>
                  </div>
                </div>

                <BoothSelectorGrid
                  totalBooths={expo.totalBooths}
                  zones={expo.zones}
                  spatialLayout={expo.spatialLayout}
                  occupiedBooths={exhibitors.map((e: any) => e.boothLabel).filter(Boolean)}
                  onSelectBooth={() => {}}
                  disabled={true}
                />
              </section>
            )}

          </div>

          {/* ── Right Column (~35% width: 4 cols on lg, sticky on scroll) ─ */}
          <aside className="lg:col-span-4 w-full lg:sticky lg:top-6 flex flex-col gap-md-token" aria-label="Expo Summary & Actions">
            <BentoCard>
              <div className="flex flex-col gap-lg-token p-xs-token">
                <div>
                  <h2 className={`text-lg-token font-bold mb-xs-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                    Expo Details
                  </h2>
                  <p className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                    Key event information & registration
                  </p>
                </div>

                <div className="space-y-md-token border-t border-b py-md-token border-glass-border-dark/50">
                  {/* Date Range */}
                  <div className="flex items-start gap-sm-token">
                    <Calendar className={`w-5 h-5 mt-0.5 shrink-0 ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`} aria-hidden="true" />
                    <div>
                      <span className={`block text-xs-token font-medium ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>Date & Duration</span>
                      <span className={`text-sm-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                        {formatDate(expo.startDate)} – {formatDate(expo.endDate)}
                      </span>
                    </div>
                  </div>

                  {/* Venue Location */}
                  <div className="flex items-start gap-sm-token">
                    <MapPin className={`w-5 h-5 mt-0.5 shrink-0 ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`} aria-hidden="true" />
                    <div>
                      <span className={`block text-xs-token font-medium ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>Venue</span>
                      <span className={`text-sm-token font-semibold block ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                        {expo.venueName}
                      </span>
                      {expo.venueAddress && (
                        <span className={`text-xs-token block mt-0.5 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                          {expo.venueAddress}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Booths Capacity */}
                  {expo.totalBooths && (
                    <div className="flex items-start gap-sm-token">
                      <Building2 className={`w-5 h-5 mt-0.5 shrink-0 ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`} aria-hidden="true" />
                      <div>
                        <span className={`block text-xs-token font-medium ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>Capacity</span>
                        <span className={`text-sm-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                          {expo.totalBooths} Booths Total
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Official Website */}
                  {expo.websiteUrl && (
                    <div className="flex items-start gap-sm-token">
                      <Globe className={`w-5 h-5 mt-0.5 shrink-0 ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`} aria-hidden="true" />
                      <div>
                        <span className={`block text-xs-token font-medium ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>Website</span>
                        <a
                          href={expo.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm-token font-medium underline break-all ${isDarkMode ? 'text-brand-primary-dark hover:opacity-80' : 'text-brand-primary-light hover:opacity-80'}`}
                        >
                          Visit Official Site
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary & Secondary Call to Actions */}
                <div className="flex flex-col gap-sm-token pt-xs-token">
                  {(!isAuthenticated || user?.role === 'attendee') && (
                    <button onClick={handleRegister} disabled={registering} className={primaryBtn}>
                      {registering ? 'Processing…' : 'Register for Expo'}
                    </button>
                  )}

                  {expo.status === 'published' && (!isAuthenticated || user?.role === 'exhibitor') && (
                    <button onClick={handleApply} className={(!isAuthenticated || user?.role === 'attendee') ? secondaryBtn : primaryBtn}>
                      Apply to Exhibit
                    </button>
                  )}
                </div>
              </div>
            </BentoCard>
          </aside>

        </div>
      </div>

      <ExhibitorDetailModal exhibitor={selectedExhibitor} onClose={() => setSelectedExhibitor(null)} />
    </div>
  );
}
