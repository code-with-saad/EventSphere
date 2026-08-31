import { useState, useEffect, useCallback } from 'react';
import { bookmarkService } from '../services/bookmarkService';

export function useBookmarks(expoId: string) {
  const [bookmarkedSessions, setBookmarkedSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!expoId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    bookmarkService
      .getMine(expoId)
      .then((data: any) =>
        setBookmarkedSessions(data?.sessions ?? (Array.isArray(data) ? data : []))
      )
      .catch((err: any) =>
        setError(err?.response?.data?.message || err?.message || 'Failed to load bookmarks')
      )
      .finally(() => setLoading(false));
  }, [expoId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { bookmarkedSessions, loading, error, refetch };
}
