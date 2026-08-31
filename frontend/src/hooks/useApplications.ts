import { useState, useEffect, useCallback } from 'react';
import { applicationService } from '../services/applicationService';

export function useApplications(expoId: string, role: 'organizer' | 'exhibitor') {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!expoId) return;
    setLoading(true);
    setError(null);

    const fetch =
      role === 'organizer'
        ? applicationService.listForExpo(expoId).then((data: any) => [
            ...(data?.pending ?? []),
            ...(data?.approved ?? []),
            ...(data?.rejected ?? []),
          ])
        : applicationService.getMine(expoId).then((data: any) =>
            data?.application ? [data.application] : data ? [data] : []
          );

    fetch
      .then((list: any[]) => setApplications(list))
      .catch((err: any) =>
        setError(err?.response?.data?.message || err?.message || 'Failed to load applications')
      )
      .finally(() => setLoading(false));
  }, [expoId, role]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { applications, loading, error, refetch };
}
