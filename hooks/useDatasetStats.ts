import { useEffect, useState } from 'react';
import { DatasetStats } from '../types';
import { fetchSupabaseStatsSummary } from '../services/dataLoader';

export function useDatasetStats(enabled: boolean) {
  const [stats, setStats] = useState<DatasetStats | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    fetchSupabaseStatsSummary()
      .then((result) => {
        if (!cancelled && result) {
          setStats(result);
        }
      })
      .catch((loadError) => {
        console.warn('Supabase stats unavailable during initial bootstrap.', loadError);
        if (!cancelled) {
          setError('No se pudieron cargar las estadisticas del dataset.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    error,
    stats
  };
}
