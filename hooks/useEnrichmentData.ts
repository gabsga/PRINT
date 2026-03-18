import { useEffect, useMemo, useState } from 'react';
import { fetchSupabaseGoAnnotationsByTerms, fetchSupabaseTfTargetSets, loadIntegratedData } from '../services/dataLoader';

const GO_TERMS = [
  'Water deprivation',
  'Response to ABA',
  'Salt stress',
  'Osmotic stress',
  'Response to auxin',
  'Response to nitrate'
];

export function useEnrichmentData(selectedSources: string[], minConfidence: number) {
  const [goAnnotations, setGoAnnotations] = useState<Record<string, string[]>>({});
  const [tfTargets, setTfTargets] = useState<Map<string, Set<string>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const [remoteGoAnnotations, remoteTfTargets] = await Promise.all([
          fetchSupabaseGoAnnotationsByTerms(GO_TERMS),
          fetchSupabaseTfTargetSets({
            minConfidence,
            selectedSources
          })
        ]);

        if (cancelled) return;

        if (remoteGoAnnotations && Object.keys(remoteGoAnnotations).length > 0) {
          setGoAnnotations(remoteGoAnnotations);
        } else {
          // Compatibility fallback: keep enrichment functional in static/local mode.
          const dataset = await loadIntegratedData();
          if (!cancelled) {
            setGoAnnotations(
              Object.fromEntries(
                GO_TERMS.map((term) => [term, dataset.goAnnotations[term] || []])
              )
            );
          }
        }

        if (!cancelled) {
          setTfTargets(remoteTfTargets);
        }
      } catch (loadError) {
        console.warn('Supabase enrichment data unavailable, using local dataset.', loadError);
        try {
          // Compatibility fallback: keep enrichment functional in static/local mode.
          const dataset = await loadIntegratedData();
          if (cancelled) return;

          const localTfTargets = new Map<string, Set<string>>();
          dataset.interactions.forEach((interaction) => {
            if (interaction.evidenceCount < minConfidence) return;
            if (!interaction.sources.some((source) => selectedSources.includes(source))) return;

            const key = interaction.tf;
            const targetId = (interaction.targetId || interaction.target || '').toUpperCase();
            if (!targetId) return;
            const entry = localTfTargets.get(key) || new Set<string>();
            entry.add(targetId);
            localTfTargets.set(key, entry);
          });

          setGoAnnotations(
            Object.fromEntries(
              GO_TERMS.map((term) => [term, dataset.goAnnotations[term] || []])
            )
          );
          setTfTargets(localTfTargets);
        } catch (fallbackError) {
          console.error(fallbackError);
          if (!cancelled) {
            setError('Error cargando datos de enrichment.');
            setGoAnnotations({});
            setTfTargets(null);
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
  }, [minConfidence, selectedSources]);

  return useMemo(() => ({
    error,
    goAnnotations,
    loading,
    tfTargets
  }), [error, goAnnotations, loading, tfTargets]);
}
