import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { expoService } from '../../services/expoService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import PageHeader from '../../components/layout/PageHeader';
import ExpoForm from '../../components/expo/ExpoForm';
import ExpoStatusTransitionButton from '../../components/expo/ExpoStatusTransitionButton';
import ExpoStatusBadge from '../../components/expo/ExpoStatusBadge';
import toast from 'react-hot-toast';

export default function EditExpoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [expo, setExpo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    expoService.getByIdForOrganizer(id)
      .then((data: any) => setExpo(data?.expo ?? data))
      .catch((err: any) => setError(err?.response?.data?.message || err?.message || 'Failed to load expo'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!id) return;
    setIsSaving(true);
    try {
      await expoService.update(id, data as Record<string, any>);
      toast.success('Expo updated successfully!');
      navigate('/organizer/expos');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update expo';
      toast.error(msg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const toDatetimeLocal = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const initialData = expo ? {
    name: expo.name ?? '',
    description: expo.description ?? '',
    startDate: toDatetimeLocal(expo.startDate),
    endDate: toDatetimeLocal(expo.endDate),
    venueName: expo.venueName ?? '',
    venueAddress: expo.venueAddress ?? '',
    totalBooths: expo.totalBooths ?? '',
    bannerUrl: expo.bannerUrl ?? '',
    websiteUrl: expo.websiteUrl ?? '',
    category: expo.category ?? '',
    tags: Array.isArray(expo.tags) ? expo.tags.join(', ') : (expo.tags ?? ''),
    venueMapUrl: expo.venueMapUrl ?? '',
  } : undefined;

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Edit Expo" />
        <main className="flex-1 p-md-token md:p-lg-token">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );

  if (loading) return (
    <Shell>
      <p className={`text-sm-token ${isDarkMode ? 'text-text-secondary-dark' : 'text-text-secondary-light'}`}>
        Loading expo…
      </p>
    </Shell>
  );

  if (error || !expo) return (
    <Shell>
      <p className={`text-sm-token ${isDarkMode ? 'text-text-danger-dark' : 'text-text-danger-light'}`}>
        {error || 'Expo not found.'}
      </p>
    </Shell>
  );

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Edit Expo" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">
          <div className="max-w-3xl mx-auto">
            <PageHeader
              title={expo.name}
              subtitle="Edit your expo details. Changes are saved immediately."
              backFallback="/organizer/expos"
              backLabel="My Expos"
              actions={<ExpoStatusBadge status={expo.status} />}
            />

            {/* Status transition actions — minimal, no card wrapper */}
            {(expo.status === 'draft' || expo.status === 'published' || expo.status === 'ongoing') && (
              <div className="flex flex-wrap gap-sm-token mb-lg-token">
                {expo.status === 'draft' && (
                  <ExpoStatusTransitionButton
                    expoId={expo._id}
                    action="publish"
                    onSuccess={() => {
                      toast.success('Expo published!');
                      expoService.getByIdForOrganizer(id!).then((d: any) => setExpo(d?.expo ?? d));
                    }}
                    onError={(msg) => toast.error(msg)}
                  />
                )}
                {expo.status === 'published' && (
                  <ExpoStatusTransitionButton
                    expoId={expo._id}
                    action="ongoing"
                    onSuccess={() => {
                      toast.success('Expo is now ongoing!');
                      expoService.getByIdForOrganizer(id!).then((d: any) => setExpo(d?.expo ?? d));
                    }}
                    onError={(msg) => toast.error(msg)}
                  />
                )}
                {expo.status === 'ongoing' && (
                  <ExpoStatusTransitionButton
                    expoId={expo._id}
                    action="complete"
                    onSuccess={() => {
                      toast.success('Expo completed!');
                      expoService.getByIdForOrganizer(id!).then((d: any) => setExpo(d?.expo ?? d));
                    }}
                    onError={(msg) => toast.error(msg)}
                  />
                )}
                {(expo.status === 'published' || expo.status === 'ongoing') && (
                  <ExpoStatusTransitionButton
                    expoId={expo._id}
                    action="archive"
                    onSuccess={() => { toast.success('Expo archived.'); navigate('/organizer/expos'); }}
                    onError={(msg) => toast.error(msg)}
                  />
                )}
              </div>
            )}

            <ExpoForm
              initialData={initialData}
              onSubmit={handleSubmit}
              submitLabel="Save Changes"
              isLoading={isSaving}
            />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
