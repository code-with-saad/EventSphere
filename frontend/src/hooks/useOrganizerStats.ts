import { useState, useEffect } from 'react';
import { statsService } from '../services/statsService';

export function useOrganizerStats() {
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = () => {
      statsService
        .getOrganizerDashboard()
        .then((data: any) => {
          setStats(data);
          setError(null);
        })
        .catch((err: any) => {
          setError(
            err?.response?.data?.message || err?.message || 'Failed to load stats'
          );
        })
        .finally(() => setLoading(false));
    };

    // Fetch immediately on mount
    fetchStats();

    // Refresh every 60 seconds (REQ-10.4)
    const intervalId = setInterval(fetchStats, 60_000);

    // Cleanup: clear interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  return { stats, loading, error };
}
