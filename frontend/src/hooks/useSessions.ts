import { useState, useEffect } from 'react';
import { sessionService } from '../services/sessionService';

export function useSessions(expoId: string) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expoId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    sessionService
      .list(expoId)
      .then((data: any) => {
        if (!cancelled)
          setSessions(data?.sessions ?? (Array.isArray(data) ? data : []));
      })
      .catch((err: any) => {
        if (!cancelled)
          setError(err?.response?.data?.message || err?.message || 'Failed to load sessions');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [expoId]);

  return { sessions, loading, error };
}
