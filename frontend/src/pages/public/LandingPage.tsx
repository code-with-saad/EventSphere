import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { expoService } from '../../services/expoService';
import PublicNavBar from '../../components/layout/PublicNavBar';
import { BentoCard } from '../../components/common/BentoCard';
import { 
  Sparkles, 
  ArrowRight, 
  Calendar, 
  MapPin, 
  Ticket, 
  Store, 
  QrCode, 
  TrendingUp, 
  ShieldCheck, 
  Users, 
  ChevronRight,
  Zap
} from 'lucide-react';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function LandingPage() {
  const { theme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const isDarkMode = theme === 'dark';

  const [liveExpos, setLiveExpos] = useState<any[]>([]);
  const [upcomingExpos, setUpcomingExpos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // If user is already authenticated, redirect to their home dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    async function loadExpos() {
      try {
        setLoading(true);
        const [ongoingRes, upcomingRes] = await Promise.all([
          expoService.list({ status: 'ongoing', limit: 3 }),
          expoService.list({ status: 'upcoming', limit: 6 }),
        ]);
        setLiveExpos(ongoingRes?.expos ?? []);
        setUpcomingExpos(upcomingRes?.expos ?? []);
      } catch (err) {
        console.error('Failed to load landing page expos:', err);
      } finally {
        setLoading(false);
      }
    }
    loadExpos();
  }, []);

  const steps = [
    {
      role: 'Attendees',
      icon: Ticket,
      title: 'Discover & Attend',
      desc: 'Browse cutting-edge industry expos, reserve digital QR tickets in one click, build your custom session schedule, and download PDF passes.',
      badge: 'For Visitors',
    },
    {
      role: 'Exhibitors',
      icon: Store,
      title: 'Showcase & Connect',
      desc: 'Apply for exhibition booths, submit showcase materials, track real-time application reviews, and expand your brand visibility.',
      badge: 'For Companies',
    },
    {
      role: 'Organizers',
      icon: QrCode,
      title: 'Host & Orchestrate',
      desc: 'Publish interactive floorplans, review exhibitor slots, manage schedule tracks, track real-time analytics, and scan visitor badges effortlessly.',
      badge: 'For Hosts',
    },
  ];

  const features = [
    {
      icon: Zap,
      title: 'Real-Time Booth Layouts',
      desc: 'Interactive visual booth designer and selector giving exhibitors and attendees clear floorplan visibility.',
    },
    {
      icon: ShieldCheck,
      title: 'Instant QR Access Pass',
      desc: 'Cryptographically unique digital tickets with ultra-fast camera scanner check-in validation.',
    },
    {
      icon: TrendingUp,
      title: 'Full-Spectrum Analytics',
      desc: 'Live attendee throughput, exhibitor acceptance pipelines, and booth fill-rate metrics.',
    },
    {
      icon: Users,
      title: 'Multi-Role Ecosystem',
      desc: 'Seamless collaborative dashboards tailored for SuperAdmins, Organizers, Exhibitors, and Attendees.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavBar />

      <main className="flex-1">
        {/* ── 1. Hero Section ────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-xl-token md:pt-xxl-token pb-xl-token md:pb-xxl-token px-md-token md:px-lg-token">
          <div className="max-w-6xl mx-auto text-center relative z-10">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-xs-token px-sm-token py-xs-token rounded-full text-xs-token font-semibold uppercase tracking-wider mb-md-token bg-brand-primary-dark/10 text-brand-primary-dark border border-brand-primary-dark/20 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Next-Generation Event Orchestration</span>
            </div>

            {/* Main Headline */}
            <h1 className={`text-display-token md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight-token max-w-4xl mx-auto mb-md-token ${
              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
            }`}>
              Where Grand Expos Meet{' '}
              <span className={isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}>
                Seamless Digital Innovation
              </span>
            </h1>

            {/* Subheading */}
            <p className={`text-base-token md:text-lg-token leading-normal-token max-w-2xl mx-auto mb-lg-token md:mb-xl-token ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}>
              EventSphere unifies attendees, world-class exhibitors, and organizers into a single high-performance platform with real-time booth allocations, QR tickets, and live analytics.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-sm-token md:gap-md-token max-w-md mx-auto">
              <Link
                to="/expos"
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-lg-token py-sm-token rounded-md-token text-sm-token md:text-base-token font-semibold shadow-lg transition-all transform hover:-translate-y-0.5 ${
                  isDarkMode
                    ? 'bg-brand-primary-dark text-text-on-primary-dark hover:bg-accent-hover-dark shadow-brand-primary-dark/20'
                    : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light shadow-brand-primary-light/25'
                }`}
              >
                <span>Explore Live Expos</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/register"
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-lg-token py-sm-token rounded-md-token text-sm-token md:text-base-token font-semibold border transition-all ${
                  isDarkMode
                    ? 'border-glass-border-dark bg-glass-dark text-text-primary-dark hover:bg-bg-hover-dark'
                    : 'border-glass-border-light bg-glass-light text-text-primary-light hover:bg-bg-hover-light'
                }`}
              >
                Create Account
              </Link>
            </div>
          </div>
        </section>

        {/* ── 2. Live Now / Ongoing Spotlight (if any) ──────────────── */}
        {liveExpos.length > 0 && (
          <section className="max-w-6xl mx-auto px-md-token md:px-lg-token mb-xl-token md:mb-xxl-token">
            <div className="flex items-center justify-between gap-sm-token mb-md-token">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <h2 className={`text-lg-token md:text-xl-token font-bold ${
                  isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                }`}>
                  Live & Happening Now
                </h2>
              </div>
              <Link
                to="/expos"
                className={`text-xs-token md:text-sm-token font-medium inline-flex items-center gap-1 ${
                  isDarkMode ? 'text-brand-primary-dark hover:underline' : 'text-brand-primary-light hover:underline'
                }`}
              >
                View all expos <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-md-token">
              {liveExpos.map((expo) => (
                <Link
                  key={expo._id}
                  to={`/expos/${expo._id}`}
                  className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-dark rounded-lg-token"
                >
                  <BentoCard className="h-full p-md-token transition-all hover:border-brand-primary-dark/40 hover:-translate-y-1">
                    <div className="flex items-center justify-between gap-2 mb-sm-token">
                      <span className="px-2 py-0.5 rounded-full text-xs-token font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Live Now
                      </span>
                      <span className={`text-xs-token ${isDarkMode ? 'text-text-tertiary-dark' : 'text-text-tertiary-light'}`}>
                        {expo.category || 'Technology'}
                      </span>
                    </div>

                    <h3 className={`text-base-token font-bold mb-xs-token line-clamp-1 group-hover:text-brand-primary-dark transition-colors ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}>
                      {expo.name}
                    </h3>

                    <p className={`text-xs-token leading-normal-token line-clamp-2 mb-sm-token ${
                      isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                    }`}>
                      {expo.description || 'Join attendees and exhibitors at this premiere event.'}
                    </p>

                    <div className={`mt-auto pt-sm-token border-t flex flex-col gap-1 text-xs-token ${
                      isDarkMode ? 'border-border-base-dark text-text-secondary-dark' : 'border-border-base-light text-text-secondary-light'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-brand-primary-dark" />
                        <span>{formatDate(expo.startDate)} – {formatDate(expo.endDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-brand-primary-dark" />
                        <span className="truncate">{expo.venueName || 'Main Convention Center'}</span>
                      </div>
                    </div>
                  </BentoCard>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── 3. Upcoming Expos Showcase ─────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-md-token md:px-lg-token mb-xl-token md:mb-xxl-token">
          <div className="flex items-center justify-between gap-sm-token mb-md-token">
            <div>
              <h2 className={`text-lg-token md:text-xl-token font-bold ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}>
                Featured Upcoming Expos
              </h2>
              <p className={`text-xs-token md:text-sm-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}>
                Reserve tickets early or apply for exhibitor booths before slots close
              </p>
            </div>
            <Link
              to="/expos"
              className={`text-xs-token md:text-sm-token font-semibold inline-flex items-center gap-1 shrink-0 ${
                isDarkMode ? 'text-brand-primary-dark hover:underline' : 'text-brand-primary-light hover:underline'
              }`}
            >
              Browse all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md-token">
              {[1, 2, 3].map((n) => (
                <BentoCard key={n} className="h-44 p-md-token animate-pulse">
                  <div className={`h-4 w-1/3 rounded mb-3 ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                  <div className={`h-6 w-3/4 rounded mb-2 ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                  <div className={`h-4 w-full rounded mb-4 ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                </BentoCard>
              ))}
            </div>
          ) : upcomingExpos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md-token">
              {upcomingExpos.map((expo) => (
                <Link
                  key={expo._id}
                  to={`/expos/${expo._id}`}
                  className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-dark rounded-lg-token"
                >
                  <BentoCard className="h-full p-md-token transition-all hover:border-brand-primary-dark/40 hover:-translate-y-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-xs-token">
                        <span className={`text-xs-token font-medium px-2 py-0.5 rounded-md-token ${
                          isDarkMode ? 'bg-bg-hover-dark text-text-secondary-dark' : 'bg-bg-hover-light text-text-secondary-light'
                        }`}>
                          {expo.category || 'Exhibition'}
                        </span>
                        <span className="text-xs-token text-brand-primary-dark font-medium">
                          Registration Open
                        </span>
                      </div>

                      <h3 className={`text-base-token font-bold mb-xs-token group-hover:text-brand-primary-dark transition-colors line-clamp-1 ${
                        isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                      }`}>
                        {expo.name}
                      </h3>

                      <p className={`text-xs-token leading-normal-token line-clamp-2 mb-sm-token ${
                        isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                      }`}>
                        {expo.description || 'Explore exhibitors, keynote sessions, and groundbreaking demonstrations.'}
                      </p>
                    </div>

                    <div className={`pt-sm-token border-t flex flex-col gap-1 text-xs-token ${
                      isDarkMode ? 'border-border-base-dark text-text-secondary-dark' : 'border-border-base-light text-text-secondary-light'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-brand-primary-dark" />
                        <span>{formatDate(expo.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-brand-primary-dark" />
                        <span className="truncate">{expo.venueName || 'Convention Hall'}</span>
                      </div>
                    </div>
                  </BentoCard>
                </Link>
              ))}
            </div>
          ) : (
            <BentoCard className="p-xl-token text-center">
              <Calendar className={`w-8 h-8 mx-auto mb-sm-token ${isDarkMode ? 'text-text-tertiary-dark' : 'text-text-tertiary-light'}`} />
              <p className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                No upcoming expos found right now. Check back soon!
              </p>
            </BentoCard>
          )}
        </section>

        {/* ── 4. How It Works (Role-Based Journey) ──────────────────── */}
        <section className="max-w-6xl mx-auto px-md-token md:px-lg-token mb-xl-token md:mb-xxl-token">
          <div className="text-center max-w-2xl mx-auto mb-lg-token">
            <h2 className={`text-display-token font-bold mb-xs-token ${
              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
            }`}>
              Built for Every Stakeholder
            </h2>
            <p className={`text-sm-token md:text-base-token ${
              isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
            }`}>
              Whether you are discovering, showcasing, or orchestrating — EventSphere streamlines your workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-md-token">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <BentoCard key={idx} className="p-lg-token flex flex-col justify-between relative overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between mb-md-token">
                      <div className="w-11 h-11 rounded-lg-token flex items-center justify-center bg-brand-primary-dark/10 text-brand-primary-dark border border-brand-primary-dark/20">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-xs-token font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isDarkMode ? 'bg-bg-hover-dark text-text-tertiary-dark' : 'bg-bg-hover-light text-text-tertiary-light'
                      }`}>
                        {step.badge}
                      </span>
                    </div>

                    <h3 className={`text-lg-token font-bold mb-xs-token ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}>
                      {step.title}
                    </h3>

                    <p className={`text-sm-token leading-normal-token ${
                      isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                    }`}>
                      {step.desc}
                    </p>
                  </div>

                  <div className="mt-md-token pt-sm-token border-t border-glass-border-dark/50 flex items-center justify-between text-xs-token font-semibold text-brand-primary-dark">
                    <span>{step.role} Workflow</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </BentoCard>
              );
            })}
          </div>
        </section>

        {/* ── 5. Feature Highlights ──────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-md-token md:px-lg-token mb-xxl-token">
          <BentoCard className="p-lg-token md:p-xl-token">
            <div className="text-center max-w-xl mx-auto mb-lg-token">
              <h2 className={`text-xl-token md:text-2xl-token font-bold mb-xs-token ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}>
                Powering Modern Expos
              </h2>
              <p className={`text-xs-token md:text-sm-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}>
                Engineered with enterprise-grade reliability, responsive glass aesthetics, and instant live interactions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md-token">
              {features.map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div key={idx} className="flex flex-col gap-2">
                    <div className="w-9 h-9 rounded-md-token flex items-center justify-center bg-brand-primary-dark/10 text-brand-primary-dark">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h4 className={`text-sm-token font-bold ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}>
                      {feat.title}
                    </h4>
                    <p className={`text-xs-token leading-normal-token ${
                      isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                    }`}>
                      {feat.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </BentoCard>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className={`border-t py-lg-token px-md-token md:px-lg-token backdrop-blur-md transition-colors ${
        isDarkMode
          ? 'bg-glass-dark border-glass-border-dark text-text-secondary-dark'
          : 'bg-glass-light border-glass-border-light text-text-secondary-light'
      }`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-sm-token text-xs-token">
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
              EventSphere
            </span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex items-center gap-md-token">
            <Link to="/expos" className="hover:underline">Browse Expos</Link>
            <Link to="/login" className="hover:underline">Sign In</Link>
            <Link to="/register" className="hover:underline">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
