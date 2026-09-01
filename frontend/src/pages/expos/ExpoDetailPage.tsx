import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Building2, Globe } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { expoService } from '../../services/expoService';
import { sessionService } from '../../services/sessionService';
import { ticketService } from '../../services/ticketService';
import ExpoStatusBadge from '../../components/expo/ExpoStatusBadge';
import ExhibitorCard from '../../components/exhibitor/ExhibitorCard';
import ExhibitorFilterBar from '../../components/exhibitor/ExhibitorFilterBar';
import ExhibitorDetailModal from '../../components/exhibitor/ExhibitorDetailModal';
import PublicNavBar from '../../components/layout/PublicNavBar';

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

  const primaryBtn = `px-md-token py-sm-token rounded-md-token text-sm-token font-semibold transition-colors disabled:opacity-60 ${
    isDarkMode
      ? 'bg-brand-primary-dark text-text-on-primary-dark hover:bg-accent-hover-dark focus:outline-none'
      : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light focus:outline-none'
  }`;

  if (loading) return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'}`}>
      <PublicNavBar />
      <div className="flex items-center justify-center py-xxl-token">
        <p className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>Loading…</p>
      </div>
    </div>
  );

  if (error || !expo) return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'}`}>
      <PublicNavBar />
      <div className="flex items-center justify-center py-xxl-token">
        <p className={`text-sm-token ${isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}`}>{error || 'Expo not found.'}</p>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'}`}>
      <PublicNavBar />

      {/* Hero banner — full width, no side padding */}
      <div className="w-full relative overflow-hidden" style={{ height: '320px' }}>
        {expo.bannerUrl ? (
          <>
            <img
              src={expo.bannerUrl}
              alt={expo.name}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay — bottom fade so content below has breathing room */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: isDarkMode
                  ? 'linear-gradient(to bottom, rgba(10,10,12,0) 50%, rgba(10,10,12,1) 100%)'
                  : undefined,
              }}
              aria-hidden="true"
            />
          </>
        ) : (
          /* Brand gradient fallback — no arbitrary hex, uses inline style mapping to existing token values */
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

      <div className="max-w-4xl mx-auto px-md-token md:px-lg-token pt-lg-token md:pt-xl-token pb-xxl-token">

        {/* Title + actions row */}
        <div className="flex flex-wrap items-start justify-between gap-md-token mb-lg-token">
          <div>
            <div className="flex flex-wrap items-center gap-sm-token mb-xs-token">
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
            <h1 className={`text-xl-token font-bold leading-tight-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
              {expo.name}
            </h1>
          </div>

          <div className="flex flex-wrap gap-sm-token items-center">
            {(!isAuthenticated || user?.role === 'attendee') && (
              <button onClick={handleRegister} disabled={registering} className={primaryBtn}>
                {registering ? 'Registering…' : 'Register for Expo'}
              </button>
            )}
            {expo.status === 'published' && (!isAuthenticated || user?.role === 'exhibitor') && (
              <button onClick={handleApply} className={primaryBtn}>Apply to Exhibit</button>
            )}
          </div>
        </div>

        {/* Registration feedback */}
        {registerMessage && (
          <div className={`mb-lg-token px-md-token py-sm-token rounded-md-token text-sm-token ${
            registerMessage.type === 'success'
              ? isDarkMode ? 'bg-bg-success-dark text-text-success-dark' : 'bg-bg-success-light text-text-success-light'
              : isDarkMode ? 'bg-bg-warning-dark text-text-warning-dark' : 'bg-bg-warning-light text-text-warning-light'
          }`}>
            {registerMessage.text}
          </div>
        )}

        {/* Metadata row — icon + text, no emojis */}
        <div className={`flex flex-wrap gap-lg-token mb-xl-token px-md-token py-sm-token rounded-lg-token border backdrop-blur-sm text-sm-token ${
          isDarkMode
            ? 'bg-glass-dark border-glass-border-dark text-text-secondary-dark'
            : 'bg-glass-light border-glass-border-light text-text-secondary-light'
        }`}>
          <span className="flex items-center gap-xs-token">
            <Calendar className="w-4 h-4 shrink-0" aria-hidden="true" />
            {formatDate(expo.startDate)} – {formatDate(expo.endDate)}
          </span>
          <span className="flex items-center gap-xs-token">
            <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
            {expo.venueName}{expo.venueAddress ? `, ${expo.venueAddress}` : ''}
          </span>
          {expo.totalBooths && (
            <span className="flex items-center gap-xs-token">
              <Building2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              {expo.totalBooths} booths
            </span>
          )}
          {expo.websiteUrl && (
            <a
              href={expo.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-xs-token underline transition-colors ${isDarkMode ? 'text-brand-primary-dark hover:opacity-80' : 'text-brand-primary-light hover:opacity-80'}`}
            >
              <Globe className="w-4 h-4 shrink-0" aria-hidden="true" />
              Website
            </a>
          )}
        </div>

        {/* About section */}
        <section className="mb-xl-token">
          <h2 className={`text-base-token font-semibold mb-sm-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
            About this Expo
          </h2>
          <p className={`text-sm-token leading-loose-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
            {expo.description}
          </p>
        </section>

        {/* Exhibitors */}
        {exhibitors.length > 0 && (
          <section className="mb-xl-token">
            <h2 className={`text-base-token font-semibold mb-md-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
              Exhibitors{' '}
              <span className={`text-sm-token font-regular ml-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                ({exhibitors.length})
              </span>
            </h2>
            <div className="mb-md-token">
              <ExhibitorFilterBar
                onSearch={setSearchQuery}
                onCategoryChange={setSelectedCategory}
                categories={categories}
                selectedCategory={selectedCategory}
              />
            </div>
            {filteredExhibitors.length === 0 ? (
              <p className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                No exhibitors match your search.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md-token">
                {filteredExhibitors.map((ex: any) => (
                  <ExhibitorCard key={ex._id} exhibitor={ex} onClick={() => setSelectedExhibitor(ex)} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Schedule */}
        {sessions.length > 0 && (
          <section className="mb-xl-token">
            <h2 className={`text-base-token font-semibold mb-md-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
              Schedule
            </h2>
            <div className={`rounded-lg-token overflow-hidden border ${isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'}`}>
              {sessions.map((s: any, i: number) => (
                <div
                  key={s._id}
                  className={`flex flex-wrap items-start gap-md-token px-md-token py-sm-token ${
                    i < sessions.length - 1
                      ? isDarkMode ? 'border-b border-border-base-dark' : 'border-b border-border-base-light'
                      : ''
                  } ${isDarkMode ? 'bg-bg-surface-dark' : 'bg-bg-surface-light'}`}
                >
                  <div className={`text-xs-token font-medium w-[100px] shrink-0 pt-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                    {formatTime(s.startTime)} – {formatTime(s.endTime)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm-token font-medium ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>{s.title}</p>
                    <p className={`text-xs-token mt-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>{s.speakerName} · {s.room}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      <ExhibitorDetailModal exhibitor={selectedExhibitor} onClose={() => setSelectedExhibitor(null)} />
    </div>
  );
}
