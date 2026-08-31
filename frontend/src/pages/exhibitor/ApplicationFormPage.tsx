import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { applicationService } from '../../services/applicationService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import ApplicationForm from '../../components/application/ApplicationForm';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function ApplicationFormPage() {
  const { id: expoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!expoId) return;
    setIsLoading(true);
    try {
      await applicationService.submit(expoId, data);
      toast.success('Application submitted successfully!');
      navigate('/exhibitor/applications');
    } catch (err: unknown) {
      const code = (err as any)?.response?.data?.code;
      if (code === 'DUPLICATE_APPLICATION') {
        toast.error('You already have an active application for this expo.');
      } else {
        toast.error(
          (err as any)?.response?.data?.message ||
          (err as any)?.message ||
          'Submission failed. Please try again.'
        );
      }
      throw err; // re-throw so ApplicationForm shows inline error too
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Apply to Exhibit" />
        <main className={`flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token ${
          isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'
        }`}>
          <div className="max-w-2xl mx-auto">
            <h2 className={`text-xl-token font-semibold mb-lg-token leading-tight-token ${
              isDarkMode ? 'text-text-primary-dark' : 'text-text-primary-light'
            }`}>
              Apply to Exhibit
            </h2>
            <div className={`rounded-lg-token border p-lg-token ${
              isDarkMode
                ? 'bg-bg-surface-dark border-border-base-dark'
                : 'bg-bg-surface-light border-border-base-light'
            }`}>
              <ApplicationForm
                onSubmit={handleSubmit}
                isLoading={isLoading}
                submitLabel="Submit Application"
              />
            </div>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
