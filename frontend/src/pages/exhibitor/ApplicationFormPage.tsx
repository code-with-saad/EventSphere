import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isLoading, setIsLoading] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingApplication, setExistingApplication] = useState<any | null>(null);

  // Prevent duplicate toast in React 18 Strict Mode (useEffect runs twice in dev)
  const toastFiredRef = useRef(false);

  // Edit mode: navigation state carries { editing: true }
  const locationState = location.state as any;
  const isEditing = locationState?.editing === true;

  useEffect(() => {
    if (!expoId) return;

    if (isEditing) {
      // Edit flow: fetch existing application to pre-populate the form
      applicationService.getMine(expoId)
        .then((data: any) => {
          const app = data?.application ?? data;
          if (app) setExistingApplication(app);
        })
        .catch(() => { /* no data — show empty form as fallback */ })
        .finally(() => setChecking(false));
      return;
    }

    // New application: block if pending/approved already exists for this expo
    applicationService.getMine(expoId)
      .then((data: any) => {
        const app = data?.application ?? data;
        if (app && (app.status === 'pending' || app.status === 'approved')) {
          setAlreadyApplied(true);
          if (!toastFiredRef.current) {
            toastFiredRef.current = true;
            toast.error('You already have an active application for this expo.');
          }
          navigate(`/expos/${expoId}`, { replace: true });
        }
      })
      .catch(() => { /* no application found — show the form */ })
      .finally(() => setChecking(false));
  }, [expoId, navigate, isEditing]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!expoId) return;
    setIsLoading(true);
    try {
      if (isEditing && existingApplication?._id) {
        await applicationService.edit(expoId, existingApplication._id, data);
        toast.success('Application updated successfully!');
      } else {
        await applicationService.submit(expoId, data);
        toast.success('Application submitted successfully!');
      }
      navigate('/exhibitor/applications');
    } catch (err: unknown) {
      const code = (err as any)?.response?.data?.code;
      if (code === 'DUPLICATE_APPLICATION') {
        if (!toastFiredRef.current) {
          toastFiredRef.current = true;
          toast.error('You already have an active application for this expo.');
        }
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

  const initialData = isEditing && existingApplication ? {
    companyName: existingApplication.companyName ?? '',
    companyDescription: existingApplication.companyDescription ?? '',
    category: existingApplication.category ?? '',
    phoneNumber: existingApplication.phoneNumber ?? '',
    websiteUrl: existingApplication.websiteUrl ?? '',
    logoUrl: existingApplication.logoUrl ?? '',
    organizerNote: existingApplication.organizerNote ?? '',
  } : undefined;

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title={isEditing ? 'Edit Application' : 'Apply to Exhibit'} />
        <main className={`flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token ${
          isDarkMode ? 'bg-bg-base-dark' : 'bg-bg-base-light'
        }`}>
          <div className="max-w-3xl mx-auto">
            <PageHeader
              title={isEditing ? 'Edit Application' : 'Apply to Exhibit'}
              subtitle={isEditing
                ? 'Update your application details below.'
                : 'Complete both steps to submit your application. The organizer will review it before approval.'
              }
              backFallback="/exhibitor/applications"
              backLabel={isEditing ? 'My Applications' : 'Back'}
            />
            <ApplicationForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              submitLabel={isEditing ? 'Save Changes' : 'Submit Application'}
              initialData={initialData}
            />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
