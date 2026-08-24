import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { BentoCard } from '../../components/common/BentoCard';

// Stat card data — values are placeholders for Phase 1 (no API calls yet)
const STAT_CARDS = [
  { label: 'Total Users', value: '—' },
  { label: 'Pending Approvals', value: '—' },
  { label: 'Active Organizers', value: '—' },
];

export default function SuperAdminDashboard() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'}`}>
      {/* Fixed sidebar — desktop only */}
      <Sidebar />

      {/* Main content — offset by sidebar width on md+ */}
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Dashboard" />

        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">
          {/* Greeting */}
          <h2
            className={`text-xl-token font-semibold mb-lg-token leading-tight-token ${
              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
            }`}
          >
            Welcome, {user?.fullName ?? 'Admin'}!
          </h2>

          {/* ── Stats row ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-md-token mb-lg-token">
            {STAT_CARDS.map((stat) => (
              <BentoCard key={stat.label}>
                <p
                  className={`text-sm-token font-medium mb-xs-token ${
                    isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                  }`}
                >
                  {stat.label}
                </p>
                <p
                  className={`text-xl-token font-bold ${
                    isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'
                  }`}
                >
                  {stat.value}
                </p>
              </BentoCard>
            ))}
          </div>

          {/* ── Action tiles ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md-token">
            {/* Organizer Approvals */}
            <div
              onClick={() => navigate('/admin/approvals')}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/approvals')}
              aria-label="Navigate to Organizer Approvals"
            >
              <BentoCard hover>
                <div className="flex flex-col gap-sm-token">
                  <span className="text-xl-token leading-none" aria-hidden="true">✅</span>
                  <h3
                    className={`text-base-token font-semibold leading-tight-token ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}
                  >
                    Organizer Approvals
                  </h3>
                  <p
                    className={`text-sm-token leading-normal-token ${
                      isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                    }`}
                  >
                    Review and approve pending organizer accounts
                  </p>
                </div>
              </BentoCard>
            </div>

            {/* All Organizers */}
            <div
              onClick={() => navigate('/admin/organizers')}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/organizers')}
              aria-label="Navigate to All Organizers"
            >
              <BentoCard hover>
                <div className="flex flex-col gap-sm-token">
                  <span className="text-xl-token leading-none" aria-hidden="true">👥</span>
                  <h3
                    className={`text-base-token font-semibold leading-tight-token ${
                      isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                    }`}
                  >
                    All Organizers
                  </h3>
                  <p
                    className={`text-sm-token leading-normal-token ${
                      isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                    }`}
                  >
                    View all registered organizers
                  </p>
                </div>
              </BentoCard>
            </div>
          </div>
        </main>
      </div>

      {/* Fixed bottom nav — mobile only */}
      <BottomNav />
    </div>
  );
}
