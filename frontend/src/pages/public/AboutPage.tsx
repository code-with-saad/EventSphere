import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import PublicNavBar from '../../components/layout/PublicNavBar';
import {
  Info,
  Ticket,
  Store,
  QrCode,
  ArrowRight,
  CheckCircle,
  Zap,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';

export default function AboutPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const pillars = [
    {
      icon: Ticket,
      color: 'blue',
      label: 'For Attendees',
      title: 'Discover. Attend. Remember.',
      desc: 'Browse cutting-edge industry expos with rich detail pages, reserve digital QR tickets in one click, build your personalised multi-day session schedule, and download official PDF passes. Your verified check-in history is always at your fingertips.',
      points: [
        'Instant QR digital ticket generation',
        'Personalised session bookmarks & schedule',
        'Verified multi-day check-in history',
        'Interactive 2D floorplan with booth locator',
      ],
      cta: { label: 'Browse Expos', to: '/expos' },
    },
    {
      icon: Store,
      color: 'purple',
      label: 'For Exhibitors',
      title: 'Showcase. Connect. Grow.',
      desc: 'Apply for exhibition booths with an intuitive application form, submit showcase materials, receive real-time status notifications from organizers, and engage directly via integrated messaging. Your brand ratings are showcased to attendees.',
      points: [
        'Streamlined booth application workflow',
        'Direct messaging with organizers',
        'Real-time application status tracking',
        'Attendee rating & review showcase',
      ],
      cta: { label: 'Get Started', to: '/register' },
    },
    {
      icon: QrCode,
      color: 'emerald',
      label: 'For Organizers',
      title: 'Host. Orchestrate. Analyse.',
      desc: 'Publish interactive 2D floorplans, review and approve exhibitor applications, manage multi-track schedule builders, and scan visitor badges with ultra-fast camera recognition. Turnout analytics keep you in full control of every metric.',
      points: [
        '2D spatial booth layout designer',
        'Multi-track schedule builder',
        'Camera-based QR scanner check-in',
        'Full-spectrum turnout analytics',
      ],
      cta: { label: 'Organizer Registration', to: '/register' },
    },
  ];

  const values = [
    {
      icon: Zap,
      title: 'Built for Speed',
      desc: 'Real-time updates, instant QR validation, and sub-second data sync across all roles.',
    },
    {
      icon: ShieldCheck,
      title: 'Secure & Verified',
      desc: 'Cryptographically unique tickets, OTP-verified accounts, and role-based access control.',
    },
    {
      icon: TrendingUp,
      title: 'Data-First Analytics',
      desc: 'Live attendee throughput, booth fill-rates, and exhibitor pipeline metrics always available.',
    },
    {
      icon: Users,
      title: 'Multi-Role Ecosystem',
      desc: 'One platform, four roles — SuperAdmin, Organizer, Exhibitor, and Attendee — each with dedicated dashboards.',
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-500',    border: 'border-blue-500/20' },
    purple:  { bg: 'bg-purple-500/10',  text: 'text-purple-500',  border: 'border-purple-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavBar />

      <main className="flex-1">
        {/* ── Hero Banner ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-xl-token md:pt-xxl-token pb-xl-token px-md-token md:px-lg-token">
          <div className="max-w-6xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-xs-token px-sm-token py-xs-token rounded-full text-xs-token font-semibold uppercase tracking-wider mb-md-token bg-brand-primary-dark/10 text-brand-primary-dark border border-brand-primary-dark/20 backdrop-blur-sm">
              <Info className="w-3.5 h-3.5" aria-hidden="true" />
              <span>About EventSphere</span>
            </div>

            <h1
              className={`text-display-token md:text-5xl font-extrabold tracking-tight leading-tight-token max-w-3xl mx-auto mb-md-token ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}
            >
              The All-In-One Modern{' '}
              <span className={isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}>
                Expo &amp; Exhibition Ecosystem
              </span>
            </h1>

            <p
              className={`text-base-token md:text-lg-token leading-normal-token max-w-2xl mx-auto mb-lg-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              EventSphere bridges the gap between world-class organizers, innovative exhibitor companies, and
              enthusiastic attendees — with speed, spatial clarity, and verified attendance at its core.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-sm-token">
              <Link
                to="/register"
                className={`inline-flex items-center gap-2 px-lg-token py-sm-token rounded-md-token text-sm-token font-semibold shadow-lg transition-all hover:-translate-y-0.5 ${
                  isDarkMode
                    ? 'bg-brand-primary-dark text-text-on-primary-dark hover:bg-accent-hover-dark shadow-brand-primary-dark/20'
                    : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light shadow-brand-primary-light/25'
                }`}
              >
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/expos"
                className={`inline-flex items-center gap-2 px-lg-token py-sm-token rounded-md-token text-sm-token font-semibold border transition-all ${
                  isDarkMode
                    ? 'border-glass-border-dark bg-glass-dark text-text-primary-dark hover:bg-bg-hover-dark'
                    : 'border-glass-border-light bg-glass-light text-text-primary-light hover:bg-bg-hover-light'
                }`}
              >
                Browse Expos
              </Link>
            </div>
          </div>
        </section>

        {/* ── Three-Pillar Cards ──────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-md-token md:px-lg-token mb-xl-token md:mb-xxl-token">
          <div className="text-center mb-lg-token">
            <h2
              className={`text-xl-token md:text-2xl-token font-bold mb-xs-token ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}
            >
              Built for Every Stakeholder
            </h2>
            <p
              className={`text-sm-token max-w-xl mx-auto ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              Whether you are discovering events, showcasing your brand, or orchestrating the entire exhibition —
              EventSphere streamlines your workflow end-to-end.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-md-token">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              const c = colorMap[pillar.color];
              return (
                <div
                  key={pillar.label}
                  className={`flex flex-col rounded-xl-token border p-lg-token transition-all hover:-translate-y-1 ${
                    isDarkMode
                      ? 'bg-bg-surface-dark border-border-base-dark'
                      : 'bg-white border-border-base-light'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-md-token border ${c.bg} ${c.text} ${c.border}`}>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>

                  <span className={`text-[11px] font-bold uppercase tracking-widest mb-1 ${c.text}`}>
                    {pillar.label}
                  </span>
                  <h3
                    className={`text-lg-token font-bold mb-sm-token ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}
                  >
                    {pillar.title}
                  </h3>
                  <p
                    className={`text-xs-token md:text-sm-token leading-normal-token mb-md-token flex-1 ${
                      isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                    }`}
                  >
                    {pillar.desc}
                  </p>

                  <ul className="flex flex-col gap-1.5 mb-md-token">
                    {pillar.points.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <CheckCircle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${c.text}`} aria-hidden="true" />
                        <span
                          className={`text-xs-token ${
                            isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                          }`}
                        >
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={pillar.cta.to}
                    className={`inline-flex items-center gap-1.5 text-xs-token font-semibold transition-colors mt-auto ${c.text} hover:underline`}
                  >
                    {pillar.cta.label} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Core Values ─────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-md-token md:px-lg-token mb-xxl-token">
          <div
            className={`rounded-2xl border p-lg-token md:p-xl-token ${
              isDarkMode
                ? 'bg-bg-surface-dark border-border-base-dark'
                : 'bg-bg-surface-light border-border-base-light'
            }`}
          >
            <div className="text-center max-w-xl mx-auto mb-lg-token">
              <h2
                className={`text-xl-token md:text-2xl-token font-bold mb-xs-token ${
                  isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                }`}
              >
                Our Core Principles
              </h2>
              <p
                className={`text-sm-token ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                Engineered with enterprise-grade reliability, responsive glass aesthetics, and instant live
                interactions built in from the ground up.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md-token">
              {values.map((val) => {
                const Icon = val.icon;
                return (
                  <div key={val.title} className="flex flex-col gap-2">
                    <div className="w-9 h-9 rounded-md-token flex items-center justify-center bg-brand-primary-dark/10 text-brand-primary-dark">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <h4
                      className={`text-sm-token font-bold ${
                        isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                      }`}
                    >
                      {val.title}
                    </h4>
                    <p
                      className={`text-xs-token leading-normal-token ${
                        isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                      }`}
                    >
                      {val.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
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
            <Link to="/gallery" className="hover:underline">Gallery</Link>
            <Link to="/expos" className="hover:underline">Browse Expos</Link>
            <Link to="/login" className="hover:underline">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
