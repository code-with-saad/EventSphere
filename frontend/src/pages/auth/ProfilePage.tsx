import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Header } from '../../components/layout/Header';
import { Sidebar } from '../../components/layout/Sidebar';
import { BottomNav } from '../../components/layout/BottomNav';
import { BentoCard } from '../../components/common/BentoCard';
import { User, Mail, Shield, Lock } from 'lucide-react';

export default function ProfilePage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { user } = useAuth();
  const navigate = useNavigate();

  // The backend does not currently expose a created_at or member-since date in the /me endpoint
  // so we'll omit it or put a generic message.
  
  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="My Profile" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token max-w-3xl mx-auto w-full">
          
          <div className="mb-lg-token">
            <h2
              className={`text-2xl-token font-bold leading-tight-token ${
                isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
              }`}
            >
              Account Details
            </h2>
            <p
              className={`text-sm-token mt-xs-token ${
                isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'
              }`}
            >
              Manage your personal information and security preferences.
            </p>
          </div>

          <div className="flex flex-col gap-md-token">
            <BentoCard>
              <div className="flex flex-col gap-lg-token">
                
                {/* Display Name */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-sm-token">
                    <User className={`w-4 h-4 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`} />
                    <span className={`text-sm-token font-medium ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                      Display Name
                    </span>
                  </div>
                  <div className={`p-sm-token rounded-md-token bg-black/5 dark:bg-white/5 border ${isDarkMode ? 'border-border-base-dark text-text-primary-dark' : 'border-border-base-light text-text-primary-light'} cursor-not-allowed`}>
                    {user?.fullName}
                  </div>
                  <p className={`text-xs-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                    Display name updates are currently disabled.
                  </p>
                </div>

                {/* Email Address */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-sm-token">
                    <Mail className={`w-4 h-4 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`} />
                    <span className={`text-sm-token font-medium ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                      Email Address
                    </span>
                  </div>
                  <div className={`p-sm-token rounded-md-token bg-black/5 dark:bg-white/5 border ${isDarkMode ? 'border-border-base-dark text-text-primary-dark' : 'border-border-base-light text-text-primary-light'} cursor-not-allowed`}>
                    {user?.email}
                  </div>
                </div>

                {/* Role */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-sm-token">
                    <Shield className={`w-4 h-4 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`} />
                    <span className={`text-sm-token font-medium ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                      Account Role
                    </span>
                  </div>
                  <div className={`p-sm-token rounded-md-token bg-black/5 dark:bg-white/5 border ${isDarkMode ? 'border-border-base-dark text-text-primary-dark' : 'border-border-base-light text-text-primary-light'} cursor-not-allowed capitalize`}>
                    {user?.role}
                  </div>
                </div>

              </div>
            </BentoCard>

            <BentoCard>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md-token">
                <div>
                  <h3 className={`text-lg-token font-semibold ${isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'}`}>
                    Security
                  </h3>
                  <p className={`text-sm-token mt-1 ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
                    Update your password and secure your account.
                  </p>
                </div>
                
                <button
                  onClick={() => navigate('/forgot-password')}
                  className={`inline-flex items-center justify-center gap-2 px-md-token py-sm-token rounded-md-token text-sm-token font-medium transition-colors ${
                    isDarkMode 
                      ? 'bg-bg-hover-dark hover:bg-white/10 text-text-primary-dark border border-border-base-dark' 
                      : 'bg-bg-hover-light hover:bg-black/5 text-text-primary-light border border-border-base-light'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  Change Password
                </button>
              </div>
            </BentoCard>

          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
