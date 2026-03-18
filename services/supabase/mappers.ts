import { DatasetStats, IntegratedInteraction, PathwayMapping } from '../../types';
import {
  SupabaseGoRow,
  SupabaseIntegratedRow,
  SupabaseProcessRow,
  SupabaseStatsRow,
  VALID_SOURCES,
  ValidSource
} from './types';

export const normalizeSources = (value: SupabaseIntegratedRow['sources']): ValidSource[] => {
  const raw = Array.isArray(value) ? value : String(value || '').split(',');
  const normalized = raw
    .map((item) => String(item).replace(/[{}"]/g, '').trim().toUpperCase())
    .filter((item): item is ValidSource => VALID_SOURCES.includes(item as ValidSource));

  return Array.from(new Set(normalized));
};

export const mapIntegratedRow = (row: SupabaseIntegratedRow): IntegratedInteraction | null => {
  const sources = normalizeSources(row.sources);
  const evidenceCount = Number(row.evidence_count) || sources.length;
  const interaction: IntegratedInteraction = {
    tf: (row.tf || '').trim(),
    target: (row.target || '').trim(),
    tfId: (row.tf_id || '').trim() || undefined,
    targetId: (row.target_id || '').trim() || undefined,
    sources,
    evidenceCount,
    isHighConfidence: evidenceCount >= 2,
    direction: row.direction || 'unknown',
    details: (row.details || {}) as IntegratedInteraction['details']
  };

  if (!interaction.tf || !interaction.target || interaction.sources.length === 0) {
    return null;
  }

  return interaction;
};

export const mapIntegratedRows = (rows: SupabaseIntegratedRow[]): IntegratedInteraction[] => (
  rows
    .map(mapIntegratedRow)
    .filter((row): row is IntegratedInteraction => Boolean(row))
);

export const dedupeIntegratedInteractions = (rows: IntegratedInteraction[]): IntegratedInteraction[] => {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = [
      row.tf,
      row.target,
      row.evidenceCount,
      row.direction,
      row.sources.join('|')
    ].join('::');

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const normalizeSourceList = (sources?: string[]): ValidSource[] => {
  const normalized = (sources || VALID_SOURCES)
    .map((source) => String(source || '').trim().toUpperCase())
    .filter((source): source is ValidSource => VALID_SOURCES.includes(source as ValidSource));

  return Array.from(new Set(normalized));
};

export const filterInteractionsBySources = (
  rows: IntegratedInteraction[],
  selectedSources?: string[]
): IntegratedInteraction[] => {
  const allowed = new Set(normalizeSourceList(selectedSources));
  return rows.filter((row) => row.sources.some((source) => allowed.has(source)));
};

export const getSourceFilterKey = (sources?: string[]): string => {
  const normalized = normalizeSourceList(sources);
  const ordered = VALID_SOURCES.filter((source) => normalized.includes(source));
  return ordered.join('|');
};

export const parseSupabaseStatsRow = (row?: SupabaseStatsRow): DatasetStats | undefined => {
  if (!row) return undefined;

  return {
    totalInteractions: Number(row.total_interactions) || 0,
    sourceCounts: [
      { name: 'TARGET', count: Number(row.target_count) || 0 },
      { name: 'DAP', count: Number(row.dap_count) || 0 },
      { name: 'CHIP', count: Number(row.chip_count) || 0 }
    ],
    highConfidence3: Number(row.high_confidence_3) || 0,
    uniqueTFs: Number(row.unique_tfs) || 0,
    uniqueTargets: Number(row.unique_targets) || 0
  };
};

export const parsePathwayRows = (rows: SupabaseProcessRow[]): PathwayMapping => {
  const mapping: PathwayMapping = {};
  rows.forEach((row) => {
    const gene = (row.gene_id || '').trim().toUpperCase();
    const process = (row.process || '').trim();
    if (!gene || !process) return;
    if (!mapping[gene]) mapping[gene] = [];
    if (!mapping[gene].includes(process)) mapping[gene].push(process);
  });
  return mapping;
};

export const parseGORows = (rows: SupabaseGoRow[]): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  rows.forEach((row) => {
    const term = (row.go_term || '').trim();
    const gene = (row.gene_id || '').trim().toUpperCase();
    if (!term || !gene) return;
    if (!result[term]) result[term] = [];
    result[term].push(gene);
  });
  return result;
};
