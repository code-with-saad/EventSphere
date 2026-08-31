import { useState, useEffect } from 'react';
import { ticketService } from '../services/ticketService';

export function useTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    ticketService
      .getMine()
      .then((data: any) => {
        if (!cancelled)
          setTickets(data?.tickets ?? (Array.isArray(data) ? data : []));
      })
      .catch((err: any) => {
        if (!cancelled)
          setError(err?.response?.data?.message || err?.message || 'Failed to load tickets');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { tickets, loading, error };
}
