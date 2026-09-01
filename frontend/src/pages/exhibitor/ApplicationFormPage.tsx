import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { applicationService } from '../../services/applicationService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import PageHeader from '../../components/layout/PageHeader';
import ApplicationForm from '../../components/application/ApplicationForm';
import toast from 'react-hot-toast';

export default function ApplicationFormPage() {
  const { id: expoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isLoading, setIsLoading] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check for existing application on mount — redirect if already applied
  useEffect(() => {
    if (!expoId) return;
    applicationService.getMine(expoId)
      .then((data: any) => {
        const app = data?.application ?? data;
        if (app && (app.status === 'pending' || app.status === 'approved')) {
          setAlreadyApplied(true);
          toast.error('You already have an active application for this expo.');
          navigate(`/expos/${expoId}`, { replace: true });
        }
      })
      .catch(() => { /* no application found — proceed */ })
      .finally(() => setChecking(false));
  }, [expoId, navigate]);

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
        navigate(`/expos/${expoId}`, { replace: true });
      } else {
        toast.error(
          (err as any)?.response?.data?.message ||
          (err as any)?.message ||
          'Submission failed.'
        );
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  if (checking || alreadyApplied) return null;

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Apply to Exhibit" />
        <main className={`flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token ${
          isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'
        }`}>
          <div className="max-w-3xl mx-auto">
            <PageHeader
              title="Apply to Exhibit"
              subtitle="Complete both steps to submit your application. The organizer will review it before approval."
              backFallback={expoId ? `/expos/${expoId}` : '/expos'}
              backLabel="Back to Expo"
            />
            <ApplicationForm onSubmit={handleSubmit} isLoading={isLoading} submitLabel="Submit Application" />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
