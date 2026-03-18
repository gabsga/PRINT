import { fetchSupabaseTable } from './client';
import { getSupabaseConfig } from './client';
import { mapIntegratedRows } from './mappers';
import { fetchSupabaseAnnotationBundle } from './annotationQueries';
import { IntegratedDataset, SupabaseIntegratedRow, SupabaseInteractionRow, VALID_SOURCES, ValidSource } from './types';
import { GeneMapping, IntegratedInteraction, RegulationDirection } from '../../types';

interface RawInteraction {
  tf: string;
  target: string;
  source: ValidSource;
  direction?: RegulationDirection;
  metadata?: {
    experimentos?: string;
    experimentos_pos?: string;
    experimentos_neg?: string;
  };
}

const buildIntegratedInteractions = (rows: RawInteraction[], geneMapping: GeneMapping) => {
  const map = new Map<string, IntegratedInteraction>();
  const resolve = (id: string) => geneMapping[id.toUpperCase()] || id.toUpperCase();

  rows.forEach((item) => {
    const tfLabel = resolve(item.tf);
    const targetLabel = resolve(item.target);
    const key = `${tfLabel}::${targetLabel}`;

    if (!map.has(key)) {
      map.set(key, {
        tf: tfLabel,
        target: targetLabel,
        tfId: item.tf,
        targetId: item.target,
        sources: [item.source],
        evidenceCount: 1,
        isHighConfidence: false,
        direction: item.direction || 'unknown',
        details: { [item.source]: item.metadata }
      });
      return;
    }

    const entry = map.get(key)!;
    if (!entry.sources.includes(item.source)) {
      entry.sources.push(item.source);
      entry.evidenceCount = entry.sources.length;
    }
    if (entry.direction === 'unknown' && item.direction && item.direction !== 'unknown') {
      entry.direction = item.direction;
    }
    if (!entry.details[item.source]) {
      entry.details[item.source] = item.metadata;
    }
  });

  return Array.from(map.values())
    .map((value) => ({
      ...value,
      isHighConfidence: value.evidenceCount >= 2
    }))
    .sort((a, b) => b.evidenceCount - a.evidenceCount);
};

export const loadIntegratedDataFromSupabase = async (
  onProgress?: (msg: string) => void
): Promise<IntegratedDataset | null> => {
  const config = getSupabaseConfig();
  if (!config) return null;

  onProgress?.('Loading datasets from Supabase...');

  if (config.tables.integrated) {
    try {
      onProgress?.('Loading integrated interactions from Supabase view...');
      const [integratedRows, annotations] = await Promise.all([
        fetchSupabaseTable<SupabaseIntegratedRow>(
          config,
          config.tables.integrated,
          'tf,target,tf_id,target_id,sources,evidence_count,direction,details',
          'tf.asc,target.asc'
        ),
        fetchSupabaseAnnotationBundle()
      ]);

      if (!annotations) return null;
      const interactions = mapIntegratedRows(integratedRows);

      return {
        interactions,
        geneMapping: annotations.geneMapping,
        pathwayMapping: annotations.pathwayMapping,
        goAnnotations: annotations.goAnnotations,
        totalInteractions: annotations.stats?.totalInteractions || interactions.length,
        stats: annotations.stats
      };
    } catch (error) {
      console.warn('Integrated Supabase view unavailable, falling back to raw tables.', error);
    }
  }

  const annotations = await fetchSupabaseAnnotationBundle();
  if (!annotations) return null;

  const interactionRows = await fetchSupabaseTable<SupabaseInteractionRow>(
    config,
    config.tables.interactions,
    'tf,target,source,experimentos,experimentos_pos,experimentos_neg',
    'tf.asc,target.asc,source.asc'
  );

  const rawRows: RawInteraction[] = [];
  const seenSources = new Set<ValidSource>();

  interactionRows.forEach((row) => {
    if (!row.tf || !row.target || !row.source) return;
    const source = row.source.trim().toUpperCase() as ValidSource;
    if (!VALID_SOURCES.includes(source)) return;
    seenSources.add(source);

    const p = (row.experimentos_pos || '').trim();
    const n = (row.experimentos_neg || '').trim();
    let direction: RegulationDirection = 'unknown';
    if (p && !n) direction = 'activation';
    else if (n && !p) direction = 'repression';
    else if (p && n) direction = 'both';

    rawRows.push({
      tf: row.tf.trim(),
      target: row.target.trim(),
      source,
      direction,
      metadata: {
        experimentos: (row.experimentos || '').trim(),
        experimentos_pos: p,
        experimentos_neg: n
      }
    });
  });

  if (interactionRows.length > 0 && seenSources.size < VALID_SOURCES.length) {
    const missing = VALID_SOURCES.filter((source) => !seenSources.has(source));
    throw new Error(`Supabase interactions missing source datasets: ${missing.join(', ')}`);
  }

  onProgress?.('Integrating network model...');
  const interactions = buildIntegratedInteractions(rawRows, annotations.geneMapping);

  return {
    interactions,
    geneMapping: annotations.geneMapping,
    pathwayMapping: annotations.pathwayMapping,
    goAnnotations: annotations.goAnnotations,
    totalInteractions: annotations.stats?.totalInteractions || interactions.length,
    stats: annotations.stats
  };
};
