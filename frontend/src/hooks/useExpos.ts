import { useState, useEffect } from 'react';
import { expoService } from '../services/expoService';

interface UseExposOptions {
  organizerOnly?: boolean;
  query?: Record<string, any>;
}

export function useExpos({ organizerOnly = false, query }: UseExposOptions = {}) {
  const [expos, setExpos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetch = organizerOnly
      ? expoService.listMine()
      : expoService.list(query);

    fetch
      .then((data: any) => {
        if (!cancelled) {
          // listMine returns array directly; list returns { expos, pagination }
          setExpos(Array.isArray(data) ? data : (data?.expos ?? []));
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load expos');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizerOnly, JSON.stringify(query)]);

  return { expos, loading, error };
}
