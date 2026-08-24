import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { BentoCard } from '../../components/common/BentoCard';

export default function AttendeeDashboard() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user } = useAuth();

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
            Welcome, {user?.fullName ?? 'Attendee'}!
          </h2>

          {/* Coming soon card */}
          <BentoCard>
            <div className="flex flex-col items-center text-center py-xl-token gap-md-token">
              <span className="text-[48px] leading-none" aria-hidden="true">🎫</span>
              <h3
                className={`text-base-token font-semibold leading-tight-token ${
                  isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
                }`}
              >
                Event Discovery
              </h3>
              <p
                className={`text-sm-token leading-normal-token max-w-sm ${
                  isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
                }`}
              >
                Browse upcoming events, register for sessions, and manage your tickets. Coming in Phase 2.
              </p>
            </div>
          </BentoCard>
        </main>
      </div>

      {/* Fixed bottom nav — mobile only */}
      <BottomNav />
    </div>
  );
}
