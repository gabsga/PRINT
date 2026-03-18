import { useEffect, useMemo, useState } from 'react';
import { IntegratedInteraction } from '../types';
import { fetchSupabaseExplorePage, loadIntegratedData } from '../services/dataLoader';
import { filterInteractions } from '../services/explorer/filterInteractions';

interface ExplorerFilterState {
  minConfidence: number;
  priorityTfFilter: string | null;
  searchTerm: string;
  selectedSources: string[];
}

const explorerPageSize = 100;

export function useExplorerData({
  enabled,
  filters,
  page
}: {
  enabled: boolean;
  filters: ExplorerFilterState;
  page: number;
}) {
  const [source, setSource] = useState<'remote' | 'local'>('remote');
  const [rows, setRows] = useState<IntegratedInteraction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localRows, setLocalRows] = useState<IntegratedInteraction[]>([]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const result = await fetchSupabaseExplorePage({
          searchTerm: filters.searchTerm,
          minConfidence: filters.minConfidence,
          selectedSources: filters.selectedSources,
          exactTF: filters.priorityTfFilter,
          page,
          pageSize: explorerPageSize
        });

        if (cancelled) return;

        if (result) {
          setSource('remote');
          setRows(result.rows);
          setTotal(result.total);
          setLocalRows([]);
          return;
        }

        // Compatibility fallback for local/static mode when paged Supabase queries are unavailable.
        const dataset = await loadIntegratedData();
        if (cancelled) return;

        const filtered = filterInteractions(dataset.interactions, {
          minConfidence: filters.minConfidence,
          priorityTfFilter: filters.priorityTfFilter,
          searchTerm: filters.searchTerm,
          selectedSources: filters.selectedSources
        });

        setSource('local');
        setRows([]);
        setTotal(filtered.length);
        setLocalRows(filtered);
      } catch (loadError) {
        console.warn('Remote explorer query unavailable, using local sample.', loadError);

        try {
          // Compatibility fallback for local/static mode when paged Supabase queries are unavailable.
          const dataset = await loadIntegratedData();
          if (cancelled) return;

          const filtered = filterInteractions(dataset.interactions, {
            minConfidence: filters.minConfidence,
            priorityTfFilter: filters.priorityTfFilter,
            searchTerm: filters.searchTerm,
            selectedSources: filters.selectedSources
          });

          setSource('local');
          setRows([]);
          setTotal(filtered.length);
          setLocalRows(filtered);
        } catch (fallbackError) {
          console.error(fallbackError);
          if (!cancelled) {
            setSource('remote');
            setRows([]);
            setTotal(0);
            setLocalRows([]);
            setError('Error cargando datos del explorer.');
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled, filters.minConfidence, filters.priorityTfFilter, filters.searchTerm, filters.selectedSources, page]);

  const displayRows = useMemo(() => (
    source === 'remote'
      ? rows
      : localRows.slice((page - 1) * explorerPageSize, page * explorerPageSize)
  ), [localRows, page, rows, source]);

  const displayTotal = source === 'remote' ? total : localRows.length;
  const totalPages = Math.max(1, Math.ceil(displayTotal / explorerPageSize));

  return {
    displayRows,
    displayTotal,
    error,
    loading,
    source,
    totalPages
  };
}
