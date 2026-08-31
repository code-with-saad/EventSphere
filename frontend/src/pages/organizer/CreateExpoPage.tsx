import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { expoService } from '../../services/expoService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import ExpoForm from '../../components/expo/ExpoForm';
import toast from 'react-hot-toast';

export default function CreateExpoPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      await expoService.create(data as Record<string, any>);
      toast.success('Expo created successfully!');
      navigate('/organizer/expos');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create expo';
      toast.error(msg);
      throw err; // re-throw so ExpoForm shows the inline error too
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Create Expo" />
        <main className={`flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token ${
          isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'
        }`}>
          <div className="max-w-2xl mx-auto">
            <h2 className={`text-xl-token font-semibold mb-lg-token leading-tight-token ${
              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
            }`}>
              Create New Expo
            </h2>
            <div className={`rounded-lg-token border p-lg-token ${
              isDarkMode
                ? 'bg-bg-surface-dark border-border-base-dark'
                : 'bg-bg-surface-light border-border-base-light'
            }`}>
              <ExpoForm
                onSubmit={handleSubmit}
                submitLabel="Create Expo"
                isLoading={isLoading}
              />
            </div>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
