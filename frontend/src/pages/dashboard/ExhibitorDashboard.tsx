import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, FileText, CheckCircle, Clock, Compass } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { applicationService } from '../../services/applicationService';
import { expoService } from '../../services/expoService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { BentoCard } from '../../components/common/BentoCard';
import ApplicationStatusBadge from '../../components/application/ApplicationStatusBadge';

interface EnrichedApplication {
  _id: string;
  expoId: string;
  companyName: string;
  companyDescription?: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  submittedAt: string;
  boothLabel?: string;
  expoName?: string;
  startDate?: string;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ExhibitorDashboard() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadExhibitorData() {
      setLoading(true);
      setError(null);
      try {
        const rawApps = await applicationService.listAllMine();
        const appList: any[] = Array.isArray(rawApps) ? rawApps : (rawApps?.applications ?? []);

        // Fetch expos for names if not directly attached
        let exposMap: Record<string, any> = {};
        try {
          const exposData = await expoService.list({ limit: 100 });
          const exposList: any[] = exposData?.expos ?? [];
          exposList.forEach((e) => {
            exposMap[e._id] = e;
          });
        } catch {
          // Continue if expo lookup fails
        }

        const enriched: EnrichedApplication[] = appList.map((app) => {
          const eid = typeof app.expoId === 'object' ? app.expoId?._id : app.expoId;
          const expoInfo = exposMap[eid];
          return {
            _id: app._id,
            expoId: eid,
            companyName: app.companyName,
            companyDescription: app.companyDescription,
            category: app.category,
            status: app.status,
            submittedAt: app.submittedAt,
            boothLabel: app.boothLabel,
            expoName: app.expoName || expoInfo?.name || 'Expo',
            startDate: app.startDate || expoInfo?.startDate,
          };
        });

        if (!cancelled) {
          setApplications(enriched);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load exhibitor applications');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadExhibitorData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Compute status counts client-side
  const totalCount = applications.length;
  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;

  // Recent applications preview (up to 3, sorted by submission date descending)
  const recentApplications = [...applications]
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 3);

  // ── Shared button styles matching OrganizerDashboard ─────────────────────
  const secondaryBtnBase = [
    'inline-flex items-center gap-xs-token',
    'px-md-token py-sm-token rounded-md-token',
    'text-sm-token font-medium',
    'bg-transparent border',
    'transition-colors duration-[120ms]',
  ].join(' ');

  const secondaryBtnDark = 'border-border-strong-dark text-text-primary-dark hover:bg-bg-hover-dark';
  const secondaryBtnLight = 'border-border-strong-light text-text-primary-light hover:bg-bg-hover-light';
  const dividerClass = isDarkMode ? 'border-border-base-dark' : 'border-border-base-light';

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Dashboard" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">

          {/* 1. Welcome heading */}
          <h2
            className={`text-xl-token font-semibold mb-lg-token leading-tight-token ${
              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
            }`}
          >
            Welcome, {user?.fullName ?? 'Exhibitor'}!
          </h2>

          {/* 2. Quick-action buttons */}
          <div className="flex flex-wrap gap-sm-token mb-lg-token">
            <button
              type="button"
              onClick={() => navigate('/expos')}
              className={`${secondaryBtnBase} ${isDarkMode ? secondaryBtnDark : secondaryBtnLight}`}
            >
              <Compass className="w-4 h-4" aria-hidden="true" />
              Browse Expos
            </button>
            <button
              type="button"
              onClick={() => navigate('/exhibitor/applications')}
              className={`${secondaryBtnBase} ${isDarkMode ? secondaryBtnDark : secondaryBtnLight}`}
            >
              <FileText className="w-4 h-4" aria-hidden="true" />
              My Applications
            </button>
          </div>

          {/* 3. Stats row */}
          <div className="mb-lg-token">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md-token">
                {[0, 1, 2].map((i) => (
                  <BentoCard key={i}>
                    <div className="flex flex-col gap-md-token animate-pulse">
                      <div className="flex items-center gap-sm-token">
                        <div className={`w-6 h-6 rounded-md-token ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                        <div className={`h-3 w-24 rounded-sm-token ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                      </div>
                      <div className={`h-8 w-16 rounded-md-token ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                    </div>
                  </BentoCard>
                ))}
              </div>
            ) : error ? (
              <BentoCard>
                <p className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                  {error}. Refresh the page to try again.
                </p>
              </BentoCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md-token">
                <BentoCard>
                  <div className="flex flex-col gap-md-token">
                    <div className="flex items-center gap-sm-token">
                      <FileText
                        className={`w-6 h-6 flex-shrink-0 ${
                          isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
                        }`}
                        aria-hidden="true"
                      />
                      <span className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                        Total Applications
                      </span>
                    </div>
                    <span className={`text-2xl-token font-bold leading-tight-token ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}>
                      {totalCount}
                    </span>
                  </div>
                </BentoCard>

                <BentoCard>
                  <div className="flex flex-col gap-md-token">
                    <div className="flex items-center gap-sm-token">
                      <Clock
                        className={`w-6 h-6 flex-shrink-0 ${
                          isDarkMode ? 'text-text-warning-dark' : 'text-text-warning-light'
                        }`}
                        aria-hidden="true"
                      />
                      <span className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                        Pending Review
                      </span>
                    </div>
                    <span className={`text-2xl-token font-bold leading-tight-token ${
                      isDarkMode ? 'text-text-warning-dark' : 'text-text-warning-light'
                    }`}>
                      {pendingCount}
                    </span>
                  </div>
                </BentoCard>

                <BentoCard>
                  <div className="flex flex-col gap-md-token">
                    <div className="flex items-center gap-sm-token">
                      <CheckCircle
                        className={`w-6 h-6 flex-shrink-0 ${
                          isDarkMode ? 'text-text-success-dark' : 'text-text-success-light'
                        }`}
                        aria-hidden="true"
                      />
                      <span className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                        Approved
                      </span>
                    </div>
                    <span className={`text-2xl-token font-bold leading-tight-token ${
                      isDarkMode ? 'text-text-success-dark' : 'text-text-success-light'
                    }`}>
                      {approvedCount}
                    </span>
                  </div>
                </BentoCard>
              </div>
            )}
          </div>

          {/* 4. Recent applications preview list */}
          <section aria-label="Recent Applications">
            <h3
              className={`text-base-token font-semibold mb-sm-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              Recent Applications
            </h3>

            {loading ? (
              <BentoCard>
                <div className="flex flex-col gap-sm-token animate-pulse py-sm-token">
                  <div className={`h-4 w-48 rounded-sm-token ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                  <div className={`h-3 w-32 rounded-sm-token ${isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'}`} />
                </div>
              </BentoCard>
            ) : recentApplications.length === 0 ? (
              <BentoCard>
                <div className="flex flex-col items-center text-center py-xl-token gap-md-token">
                  <div
                    className={`w-16 h-16 rounded-xl-token flex items-center justify-center ${
                      isDarkMode ? 'bg-bg-hover-dark' : 'bg-bg-hover-light'
                    }`}
                  >
                    <Store
                      className={`w-8 h-8 ${
                        isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                  <h4 className={`text-base-token font-semibold leading-tight-token ${
                    isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                  }`}>
                    No applications yet
                  </h4>
                  <p className={`text-sm-token max-w-xs ${
                    isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                  }`}>
                    Explore open expos and submit booth applications to showcase your business.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/expos')}
                    className={`
                      mt-sm-token px-md-token py-sm-token rounded-md-token
                      text-sm-token font-medium transition-colors duration-150
                      ${
                        isDarkMode
                          ? 'bg-brand-primary-dark text-accent-bg-dark hover:bg-accent-hover-dark'
                          : 'bg-brand-primary-light text-text-on-primary-light hover:bg-accent-hover-light'
                      }
                    `}
                  >
                    Browse Expos
                  </button>
                </div>
              </BentoCard>
            ) : (
              <BentoCard>
                <ul role="list">
                  {recentApplications.map((app, index) => {
                    const isLast = index === recentApplications.length - 1;
                    return (
                      <li
                        key={app._id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate('/exhibitor/applications')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate('/exhibitor/applications');
                          }
                        }}
                        className={[
                          'flex justify-between items-center py-sm-token cursor-pointer',
                          'transition-colors duration-[120ms] rounded-sm-token px-xs-token -mx-xs-token',
                          isDarkMode ? 'hover:bg-bg-hover-dark' : 'hover:bg-bg-hover-light',
                          !isLast ? `border-b ${dividerClass}` : '',
                        ].filter(Boolean).join(' ')}
                      >
                        <div className="flex flex-col gap-xs-token">
                          <span
                            className={`text-sm-token font-medium leading-normal-token ${
                              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                            }`}
                          >
                            {app.expoName}
                          </span>
                          <span className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                            {app.companyName} · Submitted {formatDate(app.submittedAt)}
                            {app.boothLabel ? ` · Booth ${app.boothLabel}` : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-sm-token">
                          <ApplicationStatusBadge status={app.status} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </BentoCard>
            )}
          </section>

        </main>
      </div>
      <BottomNav />
    </div>
  );
}
