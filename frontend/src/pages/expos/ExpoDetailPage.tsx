import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { expoService } from '../../services/expoService';
import { sessionService } from '../../services/sessionService';
import { ticketService } from '../../services/ticketService';
import ExpoStatusBadge from '../../components/expo/ExpoStatusBadge';
import ExhibitorCard from '../../components/exhibitor/ExhibitorCard';
import ExhibitorFilterBar from '../../components/exhibitor/ExhibitorFilterBar';
import ExhibitorDetailModal from '../../components/exhibitor/ExhibitorDetailModal';

function formatDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  });
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
      .catch((err: any) => {
        setError(err?.response?.data?.message || err?.message || 'Failed to load expo');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const exhibitors: any[] = expo?.approvedApplications ?? [];

  const categories = useMemo(
    () => [...new Set<string>(exhibitors.map((e: any) => e.category).filter(Boolean))],
    [exhibitors]
  );

  const filteredExhibitors = useMemo(() => {
    return exhibitors.filter((e: any) => {
      const matchSearch = !searchQuery || e.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = !selectedCategory || e.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [exhibitors, searchQuery, selectedCategory]);

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
        text: code === 'DUPLICATE_REGISTRATION'
          ? 'You are already registered for this expo.'
          : err?.response?.data?.message || 'Registration failed. Please try again.',
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

  const primaryBtn = `px-md-token py-xs-token rounded-md-token text-sm-token font-semibold transition-colors disabled:opacity-60 ${
    isDarkMode
      ? 'bg-brand-primary-dark text-text-on-primary-dark hover:opacity-90'
      : 'bg-brand-primary-light text-text-on-primary-light hover:opacity-90'
  }`;

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'}`}>
      <p className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>Loading expo…</p>
    </div>
  );

  if (error || !expo) return (
    <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'}`}>
      <p className={`text-sm-token ${isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}`}>{error || 'Expo not found.'}</p>
    </div>
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'}`}>
      <div className="max-w-5xl mx-auto p-md-token md:p-lg-token">

        {expo.bannerUrl && (
          <img src={expo.bannerUrl} alt={expo.name} className="w-full h-56 object-cover rounded-lg-token mb-lg-token" />
        )}

        <div className="flex flex-wrap items-start justify-between gap-sm-token mb-md-token">
          <div>
            <h1 className={`text-xl-token font-semibold leading-tight-token mb-xs-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
              {expo.name}
            </h1>
            <div className="flex flex-wrap items-center gap-sm-token">
              <ExpoStatusBadge status={expo.status} />
              {expo.category && (
                <span className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>{expo.category}</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-sm-token">
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

        {registerMessage && (
          <div className={`mb-md-token px-md-token py-sm-token rounded-md-token text-sm-token ${
            registerMessage.type === 'success'
              ? isDarkMode ? 'bg-bg-success-dark text-text-success-dark' : 'bg-bg-success-light text-text-success-light'
              : isDarkMode ? 'bg-bg-warning-dark text-text-warning-dark' : 'bg-bg-warning-light text-text-warning-light'
          }`}>
            {registerMessage.text}
          </div>
        )}

        <div className={`flex flex-wrap gap-md-token mb-lg-token text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
          <span>📅 {formatDate(expo.startDate)} – {formatDate(expo.endDate)}</span>
          <span>📍 {expo.venueName}, {expo.venueAddress}</span>
          {expo.totalBooths && <span>🏬 {expo.totalBooths} booths</span>}
          {expo.websiteUrl && (
            <a href={expo.websiteUrl} target="_blank" rel="noopener noreferrer"
              className={isDarkMode ? 'text-brand-primary-dark underline' : 'text-brand-primary-light underline'}>
              🔗 Website
            </a>
          )}
        </div>

        <section className="mb-lg-token">
          <h2 className={`text-base-token font-semibold mb-sm-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>About this Expo</h2>
          <p className={`text-sm-token leading-normal-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>{expo.description}</p>
        </section>

        {exhibitors.length > 0 && (
          <section className="mb-lg-token">
            <h2 className={`text-base-token font-semibold mb-sm-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
              Exhibitors ({exhibitors.length})
            </h2>
            <div className="mb-sm-token">
              <ExhibitorFilterBar onSearch={setSearchQuery} onCategoryChange={setSelectedCategory} categories={categories} selectedCategory={selectedCategory} />
            </div>
            {filteredExhibitors.length === 0 ? (
              <p className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>No exhibitors match your search.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md-token">
                {filteredExhibitors.map((ex: any) => (
                  <ExhibitorCard key={ex._id} exhibitor={ex} onClick={() => setSelectedExhibitor(ex)} />
                ))}
              </div>
            )}
          </section>
        )}

        {sessions.length > 0 && (
          <section className="mb-lg-token">
            <h2 className={`text-base-token font-semibold mb-sm-token ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>Schedule</h2>
            <div className={`rounded-lg-token border overflow-hidden ${isDarkMode ? 'border-border-base-dark' : 'border-border-base-light'}`}>
              {sessions.map((s: any, i: number) => (
                <div key={s._id} className={`flex flex-wrap items-start gap-sm-token p-md-token text-sm-token ${
                  i < sessions.length - 1 ? isDarkMode ? 'border-b border-border-base-dark' : 'border-b border-border-base-light' : ''
                } ${isDarkMode ? 'bg-bg-surface-dark' : 'bg-bg-surface-light'}`}>
                  <div className={`text-xs-token font-medium min-w-[120px] ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                    {formatTime(s.startTime)} – {formatTime(s.endTime)}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>{s.title}</div>
                    <div className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>{s.speakerName} · {s.room}</div>
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
