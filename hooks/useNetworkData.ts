import { useEffect, useMemo, useState } from 'react';
import { IntegratedInteraction, PathwayMapping } from '../types';
import {
  fetchSupabaseGeneMappingForGenes,
  fetchSupabasePathwayMappingForGenes,
  fetchSupabaseTFOptions,
  fetchSupabaseHierarchyForTF,
  fetchSupabaseInteractionsForTF,
  loadIntegratedData
} from '../services/dataLoader';
import { PathwayData } from '../services/pathwayLoader';

export function useNetworkData(selectedTF: string, pathwayData?: PathwayData | null) {
  const [tfOptions, setTfOptions] = useState<string[]>([]);
  const [directData, setDirectData] = useState<IntegratedInteraction[]>([]);
  const [hierarchyData, setHierarchyData] = useState<IntegratedInteraction[]>([]);
  const [pathwayMapping, setPathwayMapping] = useState<PathwayMapping>({});
  const [geneMapping, setGeneMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchSupabaseTFOptions()
      .then(async (rows) => {
        if (cancelled) return;
        if (rows.length > 0) {
          setTfOptions(rows);
          return;
        }

        // Compatibility fallback: derive TF options from the bundled dataset when remote subsets are unavailable.
        const dataset = await loadIntegratedData();
        if (!cancelled) {
          setTfOptions(Array.from(new Set(dataset.interactions.map((interaction) => interaction.tf))).sort());
        }
      })
      .catch(async (loadError) => {
        console.warn('Failed to load TF options from Supabase.', loadError);
        try {
          // Compatibility fallback: derive TF options from the bundled dataset when remote subsets are unavailable.
          const dataset = await loadIntegratedData();
          if (!cancelled) {
            setTfOptions(Array.from(new Set(dataset.interactions.map((interaction) => interaction.tf))).sort());
          }
        } catch (fallbackError) {
          console.error(fallbackError);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!selectedTF) {
      setDirectData([]);
      setHierarchyData([]);
      setPathwayMapping({});
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const [directResult, hierarchyResult] = await Promise.allSettled([
          fetchSupabaseInteractionsForTF(selectedTF),
          fetchSupabaseHierarchyForTF(selectedTF, ['TARGET', 'CHIP'])
        ]);

        const directRows = directResult.status === 'fulfilled' ? directResult.value : [];
        const hierarchyRows = hierarchyResult.status === 'fulfilled' ? hierarchyResult.value : [];

        if (cancelled) return;

        if (directRows.length > 0 || hierarchyRows.length > 0) {
          setDirectData(directRows);
          setHierarchyData(hierarchyRows);
          if (hierarchyResult.status === 'rejected') {
            console.warn(`Hierarchy query failed for ${selectedTF}; continuing with direct network data.`, hierarchyResult.reason);
          }

          const genes = Array.from(new Set(
            [...directRows, ...hierarchyRows].flatMap((row) => [
              row.tf,
              row.target,
              row.tfId || '',
              row.targetId || ''
            ]).filter(Boolean)
          ));

          try {
            const subsetMapping = await fetchSupabasePathwayMappingForGenes(genes);
            if (!cancelled && subsetMapping) {
              setPathwayMapping(subsetMapping);
            }
          } catch (mappingError) {
            console.warn(`Pathway mapping subset query failed for ${selectedTF}; continuing without GO grouping metadata.`, mappingError);
            if (!cancelled) {
              setPathwayMapping({});
            }
          }
          return;
        }

        // Compatibility fallback: load the full bundled dataset only if per-feature Supabase queries fail.
        const dataset = await loadIntegratedData();
        if (cancelled) return;

        const localDirect = dataset.interactions.filter((interaction) => interaction.tf === selectedTF);
        const localHierarchy = dataset.interactions.filter((interaction) => (
          interaction.tf === selectedTF ||
          interaction.target === selectedTF ||
          localDirect.some((direct) => direct.target === interaction.tf)
        ));

        const genes = Array.from(new Set(
          [...localDirect, ...localHierarchy].flatMap((row) => [
            row.tf,
            row.target,
            row.tfId || '',
            row.targetId || ''
          ]).filter(Boolean)
        ));
        const localPathwayMapping = Object.fromEntries(
          genes.map((gene) => [gene.toUpperCase(), dataset.pathwayMapping[gene.toUpperCase()] || []])
        );

        setDirectData(localDirect);
        setHierarchyData(localHierarchy);
        setPathwayMapping(localPathwayMapping);
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError('Error cargando datos de network.');
          setDirectData([]);
          setHierarchyData([]);
          setPathwayMapping({});
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
  }, [selectedTF]);

  useEffect(() => {
    let cancelled = false;

    if (!pathwayData) {
      setGeneMapping({});
      return () => {
        cancelled = true;
      };
    }

    const geneIds = Array.from(new Set(
      pathwayData.nodeContent
        .map((node) => node.gene_or_compound_id)
        .filter((gene) => gene && /^AT/i.test(gene))
    ));

    if (geneIds.length === 0) {
      setGeneMapping({});
      return () => {
        cancelled = true;
      };
    }

    fetchSupabaseGeneMappingForGenes(geneIds)
      .then(async (mapping) => {
        if (cancelled) return;
        if (mapping && Object.keys(mapping).length > 0) {
          setGeneMapping(mapping);
          return;
        }

        // Compatibility fallback: resolve pathway labels locally if subset annotation queries are unavailable.
        const dataset = await loadIntegratedData();
        if (!cancelled) {
          setGeneMapping(
            Object.fromEntries(
              geneIds
                .map((geneId) => [geneId.toUpperCase(), dataset.geneMapping[geneId.toUpperCase()]])
                .filter(([, symbol]) => Boolean(symbol))
            )
          );
        }
      })
      .catch(async (loadError) => {
        console.warn('Failed to load gene mapping subset from Supabase.', loadError);
        try {
          // Compatibility fallback: resolve gene symbols locally if subset annotation queries are unavailable.
          const dataset = await loadIntegratedData();
          if (!cancelled) {
            setGeneMapping(
              Object.fromEntries(
                geneIds
                  .map((geneId) => [geneId.toUpperCase(), dataset.geneMapping[geneId.toUpperCase()]])
                  .filter(([, symbol]) => Boolean(symbol))
              )
            );
          }
        } catch (fallbackError) {
          console.error(fallbackError);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pathwayData]);

  return useMemo(() => ({
    directData,
    error,
    geneMapping,
    hierarchyData,
    loading,
    pathwayMapping,
    tfOptions
  }), [directData, error, geneMapping, hierarchyData, loading, pathwayMapping, tfOptions]);
}
