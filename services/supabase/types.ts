import { DatasetStats, GeneMapping, IntegratedInteraction, InteractionMetadata, PathwayMapping, RegulationDirection } from '../../types';

export const VALID_SOURCES = ['TARGET', 'DAP', 'CHIP'] as const;

export type ValidSource = typeof VALID_SOURCES[number];

export interface IntegratedDataset {
  interactions: IntegratedInteraction[];
  geneMapping: GeneMapping;
  pathwayMapping: PathwayMapping;
  goAnnotations: Record<string, string[]>;
  totalInteractions: number;
  stats?: DatasetStats;
}

export interface ExplorePageResult {
  rows: IntegratedInteraction[];
  total: number;
}

export interface ExploreQueryParams {
  searchTerm?: string;
  minConfidence?: number;
  selectedSources?: string[];
  exactTF?: string | null;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  tables: {
    integrated?: string;
    stats?: string;
    tfOptions?: string;
    enrichmentTargets?: string;
    interactions: string;
    mapping: string;
    process: string;
    go: string;
  };
}

export interface SupabaseIntegratedRow {
  tf: string;
  target: string;
  tf_id?: string | null;
  target_id?: string | null;
  sources: ValidSource[] | string;
  evidence_count: number | string;
  direction?: RegulationDirection | null;
  details?: Record<string, InteractionMetadata> | null;
}

export interface SupabaseInteractionRow {
  tf: string;
  target: string;
  source: string;
  experimentos?: string | null;
  experimentos_pos?: string | null;
  experimentos_neg?: string | null;
}

export interface SupabaseMappingRow {
  gene_id: string;
  symbol: string;
}

export interface SupabaseProcessRow {
  gene_id: string;
  process: string;
}

export interface SupabaseGoRow {
  go_term: string;
  gene_id: string;
}

export interface SupabaseTfOptionRow {
  tf: string;
}

export interface SupabaseStatsRow {
  total_interactions: number | string;
  target_count: number | string;
  dap_count: number | string;
  chip_count: number | string;
  high_confidence_3: number | string;
  unique_tfs: number | string;
  unique_targets: number | string;
}

export interface SupabaseTfTargetSetRow {
  tf: string;
  target_ids: string[] | null;
}

export interface SupabaseEnrichmentTargetRow extends SupabaseTfTargetSetRow {
  min_evidence: number | string;
  source_key: string;
}
