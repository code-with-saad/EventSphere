import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { expoService } from '../../services/expoService';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { BottomNav } from '../../components/layout/BottomNav';
import PageHeader from '../../components/layout/PageHeader';
import ExpoForm from '../../components/expo/ExpoForm';
import toast from 'react-hot-toast';

export default function CreateExpoPage() {
  const navigate = useNavigate();

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
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title="Create Expo" />
        <main className="flex-1 p-md-token md:p-lg-token pb-16 md:pb-lg-token">
          <div className="max-w-3xl mx-auto">
            <PageHeader
              title="Create New Expo"
              subtitle="Fill in the details below to list your event on EventSphere."
              backFallback="/organizer/expos"
              backLabel="My Expos"
            />
            <ExpoForm onSubmit={handleSubmit} submitLabel="Create Expo" isLoading={isLoading} />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
