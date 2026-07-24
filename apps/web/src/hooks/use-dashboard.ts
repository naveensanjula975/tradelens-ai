import { useState, useEffect } from 'react';
import { DashboardData } from '@/types/domain';
import { fetchDashboard } from '@/lib/api-client';

export function useDashboard(commodity: string = 'Copper', pollIntervalMs: number = 30000) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetchDashboard(commodity);
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    if (pollIntervalMs > 0) {
      const interval = setInterval(refresh, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [commodity, pollIntervalMs]);

  return { data, loading, error, refresh };
}
