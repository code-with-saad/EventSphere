import { Store } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import { BentoCard } from '../../components/common/BentoCard';

export default function ExhibitorDashboard() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user } = useAuth();

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Dashboard" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">

          <h2 className={`text-xl-token font-semibold mb-lg-token leading-tight-token ${
            isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
          }`}>
            Welcome, {user?.fullName ?? 'Exhibitor'}!
          </h2>

          <BentoCard>
            <div className="flex flex-col items-center text-center py-xl-token gap-md-token">
              <Store
                className={`w-16 h-16 ${isDarkMode ? 'text-brand-primary-dark' : 'text-brand-primary-light'}`}
                aria-hidden="true"
              />
              <h3 className={`text-base-token font-semibold leading-tight-token ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}>Booth Management</h3>
              <p className={`text-sm-token leading-normal-token max-w-sm ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}>
                Manage your exhibitor booth, showcase products, and connect with attendees. Coming in Phase 2.
              </p>
            </div>
          </BentoCard>

        </main>
      </div>
      <BottomNav />
    </div>
  );
}
