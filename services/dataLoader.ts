
import { DataSource, DatasetStats, IntegratedInteraction, Interaction, GeneMapping, PathwayMapping, RegulationDirection, InteractionMetadata } from '../types';

interface RawInteraction {
  tf: string;
  target: string;
  source: 'TARGET' | 'DAP' | 'CHIP';
  direction?: RegulationDirection;
  metadata?: any;
}

const VALID_SOURCES = ['TARGET', 'DAP', 'CHIP'] as const;

export interface IntegratedDataset {
  interactions: IntegratedInteraction[];
  geneMapping: GeneMapping;
  pathwayMapping: PathwayMapping;
  goAnnotations: Record<string, string[]>;
  totalInteractions: number;
  stats?: DatasetStats;
}

interface SupabaseConfig {
  url: string;
  anonKey: string;
  initialRows: number;
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

interface SupabaseInteractionRow {
  tf: string;
  target: string;
  source: string;
  experimentos?: string | null;
  experimentos_pos?: string | null;
  experimentos_neg?: string | null;
}

interface SupabaseMappingRow {
  gene_id: string;
  symbol: string;
}

interface SupabaseProcessRow {
  gene_id: string;
  process: string;
}

interface SupabaseGoRow {
  go_term: string;
  gene_id: string;
}

interface SupabaseTfOptionRow {
  tf: string;
}

interface SupabaseStatsRow {
  total_interactions: number | string;
  target_count: number | string;
  dap_count: number | string;
  chip_count: number | string;
  high_confidence_3: number | string;
  unique_tfs: number | string;
  unique_targets: number | string;
}

interface SupabaseTfTargetSetRow {
  tf: string;
  target_ids: string[] | null;
}

interface SupabaseEnrichmentTargetRow extends SupabaseTfTargetSetRow {
  min_evidence: number | string;
  source_key: string;
}

export interface ExplorePageResult {
  rows: IntegratedInteraction[];
  total: number;
}

interface ExploreQueryParams {
  searchTerm?: string;
  minConfidence?: number;
  selectedSources?: string[];
  exactTF?: string | null;
}

interface SupabaseIntegratedRow {
  tf: string;
  target: string;
  tf_id?: string | null;
  target_id?: string | null;
  sources: ('TARGET' | 'DAP' | 'CHIP')[] | string;
  evidence_count: number | string;
  direction?: RegulationDirection | null;
  details?: Record<string, InteractionMetadata> | null;
}

const getSupabaseConfig = (): SupabaseConfig | null => {
  const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!url || !anonKey) return null;

  return {
    url,
    anonKey,
    initialRows: Number(import.meta.env.VITE_SUPABASE_INITIAL_ROWS || 10000),
    tables: {
      integrated: (import.meta.env.VITE_SUPABASE_INTEGRATED_VIEW || '').trim() || undefined,
      stats: (import.meta.env.VITE_SUPABASE_STATS_VIEW || '').trim() || undefined,
      tfOptions: (import.meta.env.VITE_SUPABASE_TF_OPTIONS_VIEW || '').trim() || undefined,
      enrichmentTargets: (import.meta.env.VITE_SUPABASE_ENRICHMENT_VIEW || '').trim() || undefined,
      interactions: (import.meta.env.VITE_SUPABASE_INTERACTIONS_TABLE || 'print_interactions').trim(),
      mapping: (import.meta.env.VITE_SUPABASE_MAPPING_TABLE || 'print_gene_mapping').trim(),
      process: (import.meta.env.VITE_SUPABASE_PROCESS_TABLE || 'print_process_annotations').trim(),
      go: (import.meta.env.VITE_SUPABASE_GO_TABLE || 'print_go_annotations').trim()
    }
  };
};

const fetchSupabaseTablePage = async <T>(
  config: SupabaseConfig,
  table: string,
  select: string,
  orderBy: string,
  from: number,
  pageSize: number
): Promise<T[]> => {
  const to = from + pageSize - 1;
  const url = `${config.url}/rest/v1/${table}?select=${encodeURIComponent(select)}&order=${encodeURIComponent(orderBy)}`;
  const res = await fetch(url, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Range-Unit': 'items',
      Range: `${from}-${to}`
    }
  });

  if (!res.ok) {
    throw new Error(`Supabase query failed for ${table}: ${res.status}`);
  }

  const rows = (await res.json()) as T[];
  return Array.isArray(rows) ? rows : [];
};

const fetchSupabaseTableWindow = async <T>(
  config: SupabaseConfig,
  table: string,
  select: string,
  orderBy: string,
  totalWanted: number,
  requestPageSize = 1000
): Promise<T[]> => {
  const allRows: T[] = [];
  let from = 0;

  while (allRows.length < totalWanted) {
    const remaining = totalWanted - allRows.length;
    const rows = await fetchSupabaseTablePage<T>(
      config,
      table,
      select,
      orderBy,
      from,
      Math.min(requestPageSize, remaining)
    );

    if (rows.length === 0) break;
    allRows.push(...rows);
    if (rows.length < Math.min(requestPageSize, remaining)) break;
    from += rows.length;
  }

  return allRows;
};

const fetchSupabaseTable = async <T>(
  config: SupabaseConfig,
  table: string,
  select: string,
  orderBy: string,
  pageSize = 1000
): Promise<T[]> => {
  const allRows: T[] = [];
  let from = 0;

  for (;;) {
    const to = from + pageSize - 1;
    const url = `${config.url}/rest/v1/${table}?select=${encodeURIComponent(select)}&order=${encodeURIComponent(orderBy)}`;
    const res = await fetch(url, {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Range-Unit': 'items',
        Range: `${from}-${to}`
      }
    });

    if (!res.ok) {
      throw new Error(`Supabase query failed for ${table}: ${res.status}`);
    }

    const rows = (await res.json()) as T[];
    if (!Array.isArray(rows) || rows.length === 0) break;
    allRows.push(...rows);
    if (rows.length < pageSize) break;
    from += rows.length;
  }

  return allRows;
};

const fetchSupabaseExactCount = async (
  config: SupabaseConfig,
  table: string
): Promise<number | null> => {
  const url = `${config.url}/rest/v1/${table}?select=*&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      Prefer: 'count=exact'
    }
  });

  if (!res.ok) return null;

  const contentRange = res.headers.get('content-range') || '';
  const total = Number(contentRange.split('/')[1]);
  return Number.isFinite(total) ? total : null;
};

export const fetchSupabaseTFOptions = async (): Promise<string[]> => {
  const config = getSupabaseConfig();
  if (!config?.tables.tfOptions) return [];

  const rows = await fetchSupabaseTable<SupabaseTfOptionRow>(
    config,
    config.tables.tfOptions,
    'tf',
    'tf.asc',
    1000
  );

  return rows
    .map((row) => (row.tf || '').trim())
    .filter(Boolean);
};

export const fetchSupabaseInteractionsForTF = async (tf: string): Promise<IntegratedInteraction[]> => {
  const config = getSupabaseConfig();
  if (!config?.tables.integrated || !tf.trim()) return [];

  const allRows: SupabaseIntegratedRow[] = [];
  const pageSize = 1000;
  let from = 0;
  const tfParam = encodeURIComponent(`eq.${tf}`);

  for (;;) {
    const to = from + pageSize - 1;
    const url = `${config.url}/rest/v1/${config.tables.integrated}?select=${encodeURIComponent('tf,target,tf_id,target_id,sources,evidence_count,direction,details')}&tf=${tfParam}&order=${encodeURIComponent('target.asc')}`;
    const res = await fetch(url, {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Range-Unit': 'items',
        Range: `${from}-${to}`
      }
    });

    if (!res.ok) {
      throw new Error(`Supabase TF query failed for ${tf}: ${res.status}`);
    }

    const rows = (await res.json()) as SupabaseIntegratedRow[];
    if (!Array.isArray(rows) || rows.length === 0) break;
    allRows.push(...rows);
    if (rows.length < pageSize) break;
    from += rows.length;
  }

  return allRows.map((row) => {
    const sources = normalizeSources(row.sources);
    const evidenceCount = Number(row.evidence_count) || sources.length;
    return {
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
  }).filter((row) => row.tf && row.target && row.sources.length > 0);
};

const buildExploreQuery = (params: ExploreQueryParams): URLSearchParams => {
  const query = new URLSearchParams();
  query.set('select', 'tf,target,tf_id,target_id,sources,evidence_count,direction,details');
  query.set('order', 'tf.asc,target.asc');

  const search = (params.searchTerm || '').trim();
  const selectedSources = (params.selectedSources || []).filter(Boolean);
  const exactTF = (params.exactTF || '').trim();
  const orClauses: string[] = [];

  if (exactTF) {
    query.set('tf', `eq.${exactTF}`);
  }

  if (search && !exactTF) {
    const escaped = search.replace(/[%(),]/g, ' ');
    orClauses.push(`tf.ilike.*${escaped}*`);
    orClauses.push(`target.ilike.*${escaped}*`);
    orClauses.push(`tf_id.ilike.*${escaped.toUpperCase()}*`);
    orClauses.push(`target_id.ilike.*${escaped.toUpperCase()}*`);
  }

  if (selectedSources.length > 0 && selectedSources.length < VALID_SOURCES.length) {
    selectedSources.forEach((source) => {
      orClauses.push(`sources.cs.{${source.toUpperCase()}}`);
    });
  }

  if (orClauses.length > 0) {
    query.set('or', `(${orClauses.join(',')})`);
  }

  if ((params.minConfidence || 1) > 1) {
    query.set('evidence_count', `gte.${params.minConfidence}`);
  }

  return query;
};

const normalizeSourceList = (sources?: string[]): string[] => {
  const normalized = (sources || VALID_SOURCES)
    .map((source) => String(source || '').trim().toUpperCase())
    .filter((source): source is typeof VALID_SOURCES[number] => VALID_SOURCES.includes(source as any));

  return Array.from(new Set(normalized));
};

const getSourceFilterKey = (sources?: string[]): string => {
  const normalized = normalizeSourceList(sources);
  const ordered = VALID_SOURCES.filter((source) => normalized.includes(source));
  return ordered.join('|');
};

const mapExploreRows = (rows: SupabaseIntegratedRow[]): IntegratedInteraction[] => {
  return rows
    .map((row) => {
      const sources = normalizeSources(row.sources);
      const evidenceCount = Number(row.evidence_count) || sources.length;
      return {
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
    })
    .filter((row) => row.tf && row.target && row.sources.length > 0);
};

export const fetchSupabaseExplorePage = async (params: ExploreQueryParams & {
  page?: number;
  pageSize?: number;
}): Promise<ExplorePageResult | null> => {
  const config = getSupabaseConfig();
  if (!config?.tables.integrated) return null;

  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, Math.min(500, params.pageSize || 100));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const query = buildExploreQuery(params);

  const url = `${config.url}/rest/v1/${config.tables.integrated}?${query.toString()}`;
  const res = await fetch(url, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      Prefer: 'count=exact',
      'Range-Unit': 'items',
      Range: `${from}-${to}`
    }
  });

  if (!res.ok) {
    throw new Error(`Supabase explorer query failed: ${res.status}`);
  }

  const rows = mapExploreRows((await res.json()) as SupabaseIntegratedRow[]);

  const contentRange = res.headers.get('content-range') || '';
  const total = Number(contentRange.split('/')[1]);

  return {
    rows,
    total: Number.isFinite(total) ? total : rows.length
  };
};

export const fetchSupabaseExploreAll = async (
  params: ExploreQueryParams,
  onProgress?: (loaded: number, total: number) => void
): Promise<IntegratedInteraction[] | null> => {
  const config = getSupabaseConfig();
  if (!config?.tables.integrated) return null;

  const pageSize = 1000;
  const query = buildExploreQuery(params);
  const allRows: IntegratedInteraction[] = [];
  let from = 0;
  let total = 0;

  for (;;) {
    const to = from + pageSize - 1;
    const url = `${config.url}/rest/v1/${config.tables.integrated}?${query.toString()}`;
    const res = await fetch(url, {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        Prefer: 'count=exact',
        'Range-Unit': 'items',
        Range: `${from}-${to}`
      }
    });

    if (!res.ok) {
      throw new Error(`Supabase explorer export failed: ${res.status}`);
    }

    const rows = mapExploreRows((await res.json()) as SupabaseIntegratedRow[]);
    const contentRange = res.headers.get('content-range') || '';
    const nextTotal = Number(contentRange.split('/')[1]);
    if (Number.isFinite(nextTotal)) total = nextTotal;

    allRows.push(...rows);
    onProgress?.(allRows.length, total || allRows.length);

    if (rows.length < pageSize) break;
    from += rows.length;
  }

  return allRows;
};

export const fetchSupabaseTfTargetSets = async (params: {
  minConfidence?: number;
  selectedSources?: string[];
}): Promise<Map<string, Set<string>> | null> => {
  const config = getSupabaseConfig();
  if (!config) return null;

  const minEvidence = Math.max(1, Math.min(3, params.minConfidence || 1));
  const sourceKey = getSourceFilterKey(params.selectedSources);

  if (config.tables.enrichmentTargets) {
    const allRows: SupabaseEnrichmentTargetRow[] = [];
    const pageSize = 1000;
    let from = 0;

    for (;;) {
      const to = from + pageSize - 1;
      const url = `${config.url}/rest/v1/${config.tables.enrichmentTargets}?select=${encodeURIComponent('tf,target_ids,min_evidence,source_key')}&min_evidence=eq.${minEvidence}&source_key=eq.${encodeURIComponent(sourceKey)}&order=${encodeURIComponent('tf.asc')}`;
      const res = await fetch(url, {
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          'Range-Unit': 'items',
          Range: `${from}-${to}`
        }
      });

      if (!res.ok) {
        throw new Error(`Supabase enrichment view query failed: ${res.status}`);
      }

      const rows = (await res.json()) as SupabaseEnrichmentTargetRow[];
      if (!Array.isArray(rows) || rows.length === 0) break;
      allRows.push(...rows);
      if (rows.length < pageSize) break;
      from += rows.length;
    }

    const map = new Map<string, Set<string>>();
    allRows.forEach((row) => {
      const tf = (row.tf || '').trim();
      if (!tf) return;
      const ids = new Set(
        (row.target_ids || [])
          .map((id) => String(id || '').trim().toUpperCase())
          .filter(Boolean)
      );
      map.set(tf, ids);
    });

    return map;
  }

  const res = await fetch(`${config.url}/rest/v1/rpc/print_tf_target_sets`, {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      min_evidence: minEvidence,
      selected_sources: normalizeSourceList(params.selectedSources)
    })
  });

  if (!res.ok) {
    throw new Error(`Supabase enrichment RPC failed: ${res.status}`);
  }

  const rows = (await res.json()) as SupabaseTfTargetSetRow[];
  const map = new Map<string, Set<string>>();

  rows.forEach((row) => {
    const tf = (row.tf || '').trim();
    if (!tf) return;
    const ids = new Set(
      (row.target_ids || [])
        .map((id) => String(id || '').trim().toUpperCase())
        .filter(Boolean)
    );
    map.set(tf, ids);
  });

  return map;
};

const fetchSupabaseStats = async (config: SupabaseConfig): Promise<DatasetStats | undefined> => {
  if (!config.tables.stats) return undefined;

  const rows = await fetchSupabaseTablePage<SupabaseStatsRow>(
    config,
    config.tables.stats,
    'total_interactions,target_count,dap_count,chip_count,high_confidence_3,unique_tfs,unique_targets',
    'total_interactions.desc',
    0,
    1
  );

  const row = rows[0];
  if (!row) return undefined;

  return {
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

const parsePathwayRows = (rows: SupabaseProcessRow[]): PathwayMapping => {
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

const parseGORows = (rows: SupabaseGoRow[]): Record<string, string[]> => {
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

const normalizeSources = (value: SupabaseIntegratedRow['sources']): ('TARGET' | 'DAP' | 'CHIP')[] => {
  const raw = Array.isArray(value) ? value : String(value || '').split(',');
  const normalized = raw
    .map((item) => String(item).replace(/[{}"]/g, '').trim().toUpperCase())
    .filter((item): item is 'TARGET' | 'DAP' | 'CHIP' => VALID_SOURCES.includes(item as any));

  return Array.from(new Set(normalized));
};

const fetchText = async (url: string): Promise<string> => {
  const res = await fetch(url);
  if (!res.ok) return '';
  return res.text();
};

const loadDataText = async (baseName: string): Promise<string> => {
  const single = await fetchText(`/data/${baseName}`);
  if (single) return single;

  const partTexts: string[] = [];
  for (let idx = 1; idx <= 99; idx += 1) {
    const suffix = String(idx).padStart(2, '0');
    const part = await fetchText(`/data/${baseName.replace('.tsv', `.part${suffix}.tsv`)}`);
    if (!part) break;
    partTexts.push(part);
  }

  if (partTexts.length === 0) return '';

  // Remove repeated headers from split parts before merging.
  return partTexts
    .map((text, idx) => {
      if (idx === 0) return text;
      const lines = text.split(/\r?\n/);
      return lines.slice(1).join('\n');
    })
    .join('\n');
};

const loadIntegratedDataFromSupabase = async (
  config: SupabaseConfig,
  onProgress?: (msg: string) => void
): Promise<IntegratedDataset> => {
  onProgress?.('Loading datasets from Supabase...');

  if (config.tables.integrated) {
    try {
      onProgress?.('Loading integrated interactions from Supabase view...');
      const [integratedRows, mappingRows, processRows, goRows, stats] = await Promise.all([
        fetchSupabaseTableWindow<SupabaseIntegratedRow>(
          config,
          config.tables.integrated,
          'tf,target,tf_id,target_id,sources,evidence_count,direction,details',
          'tf.asc,target.asc',
          config.initialRows
        ),
        fetchSupabaseTable<SupabaseMappingRow>(
          config,
          config.tables.mapping,
          'gene_id,symbol',
          'gene_id.asc'
        ),
        fetchSupabaseTable<SupabaseProcessRow>(
          config,
          config.tables.process,
          'gene_id,process',
          'gene_id.asc,process.asc'
        ),
        fetchSupabaseTable<SupabaseGoRow>(
          config,
          config.tables.go,
          'go_term,gene_id',
          'go_term.asc,gene_id.asc'
        ),
        fetchSupabaseStats(config)
      ]);
      const exactCount = await fetchSupabaseExactCount(config, config.tables.integrated);
      if (exactCount && exactCount > integratedRows.length) {
        onProgress?.(`Loaded initial ${integratedRows.length.toLocaleString()} of ${exactCount.toLocaleString()} interactions...`);
      }

      const interactions: IntegratedInteraction[] = integratedRows.map((row) => {
        const sources = normalizeSources(row.sources);
        const evidenceCount = Number(row.evidence_count) || sources.length;
        return {
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
      }).filter((row) => row.tf && row.target && row.sources.length > 0);

      return {
        interactions,
        geneMapping: Object.fromEntries(
          mappingRows
            .map((row) => [String(row.gene_id || '').trim().toUpperCase(), String(row.symbol || '').trim()] as const)
            .filter(([id, symbol]) => id && symbol)
        ),
        pathwayMapping: parsePathwayRows(processRows),
        goAnnotations: parseGORows(goRows),
        totalInteractions: exactCount ?? interactions.length,
        stats
      };
    } catch (error) {
      console.warn('Integrated Supabase view unavailable, falling back to raw tables.', error);
    }
  }

  const [interactionRows, mappingRows, processRows, goRows] = await Promise.all([
    fetchSupabaseTable<SupabaseInteractionRow>(
      config,
      config.tables.interactions,
      'tf,target,source,experimentos,experimentos_pos,experimentos_neg',
      'tf.asc,target.asc,source.asc'
    ),
    fetchSupabaseTable<SupabaseMappingRow>(
      config,
      config.tables.mapping,
      'gene_id,symbol',
      'gene_id.asc'
    ),
    fetchSupabaseTable<SupabaseProcessRow>(
      config,
      config.tables.process,
      'gene_id,process',
      'gene_id.asc,process.asc'
    ),
    fetchSupabaseTable<SupabaseGoRow>(
      config,
      config.tables.go,
      'go_term,gene_id',
      'go_term.asc,gene_id.asc'
    )
  ]);

  const dapData: RawInteraction[] = [];
  const chipData: RawInteraction[] = [];
  const targetData: RawInteraction[] = [];
  const seenSources = new Set<typeof VALID_SOURCES[number]>();

  interactionRows.forEach((row) => {
    if (!row.tf || !row.target || !row.source) return;
    const source = row.source.trim().toUpperCase() as typeof VALID_SOURCES[number];
    if (!VALID_SOURCES.includes(source)) return;
    seenSources.add(source);

    const p = (row.experimentos_pos || '').trim();
    const n = (row.experimentos_neg || '').trim();
    let direction: RegulationDirection = 'unknown';
    if (p && !n) direction = 'activation';
    else if (n && !p) direction = 'repression';
    else if (p && n) direction = 'both';

    const item: RawInteraction = {
      tf: row.tf.trim(),
      target: row.target.trim(),
      source,
      direction,
      metadata: {
        experimentos: (row.experimentos || '').trim(),
        experimentos_pos: p,
        experimentos_neg: n
      }
    };

    if (source === 'DAP') dapData.push(item);
    else if (source === 'CHIP') chipData.push(item);
    else targetData.push(item);
  });

  if (interactionRows.length > 0 && seenSources.size < VALID_SOURCES.length) {
    const missing = VALID_SOURCES.filter((source) => !seenSources.has(source));
    throw new Error(`Supabase interactions missing source datasets: ${missing.join(', ')}`);
  }

  const geneMapping: GeneMapping = {};
  mappingRows.forEach((row) => {
    const id = (row.gene_id || '').trim().toUpperCase();
    const symbol = (row.symbol || '').trim();
    if (id && symbol) geneMapping[id] = symbol;
  });

  const pathwayMapping = parsePathwayRows(processRows);
  const goAnnotations = parseGORows(goRows);

  onProgress?.('Integrating network model...');
  const map = new Map<string, IntegratedInteraction>();
  const resolve = (id: string) => geneMapping[id.toUpperCase()] || id.toUpperCase();

  [...dapData, ...chipData, ...targetData].forEach(item => {
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
    } else {
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
    }
  });

  const integrated = Array.from(map.values()).map(val => ({
    ...val,
    isHighConfidence: val.evidenceCount >= 2
  })).sort((a, b) => b.evidenceCount - a.evidenceCount);

  return {
    interactions: integrated,
    geneMapping,
    pathwayMapping,
    goAnnotations,
    totalInteractions: integrated.length
  };
};

const parseTSV = (text: string, source: 'TARGET' | 'DAP' | 'CHIP'): RawInteraction[] => {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return [];

  // Detect headers
  const delimiter = '\t';
  const headers = lines[0].split(delimiter).map(h => h.trim().toUpperCase());

  const tfIdx = headers.indexOf('TF');
  const targetIdx = headers.indexOf('TARGET');
  const posIdx = headers.indexOf('EXPERIMENTOS_POS');
  const negIdx = headers.indexOf('EXPERIMENTOS_NEG');

  if (tfIdx === -1 || targetIdx === -1) return [];

  return lines.slice(1).map(line => {
    const parts = line.split(delimiter);
    let direction: RegulationDirection = 'unknown';

    // Direction logic mostly for TARGET (or if DAP/CHIP has exp columns)
    const p = parts[posIdx]?.trim();
    const n = parts[negIdx]?.trim();

    if (p && !n) direction = 'activation';
    else if (n && !p) direction = 'repression';
    else if (p && n) direction = 'both';

    return {
      tf: (parts[tfIdx] || '').trim(),
      target: (parts[targetIdx] || '').trim(),
      source,
      direction,
      metadata: { experimentos_pos: p, experimentos_neg: n }
    };
  }).filter(i => i.tf && i.target);
};

const parseMapping = (text: string): GeneMapping => {
  const mapping: GeneMapping = {};
  text.split(/\r?\n/).forEach(line => {
    const [id, symbol] = line.split('\t').map(s => s.trim());
    if (id && symbol) mapping[id.toUpperCase()] = symbol;
  });
  return mapping;
};

const parsePathways = (text: string): PathwayMapping => {
  const mapping: PathwayMapping = {};
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return mapping;

  const headers = lines[0].split('\t').map(h => h.trim());

  lines.slice(1).forEach(line => {
    const parts = line.split('\t');
    parts.forEach((gene, colIdx) => {
      const gId = gene.trim().toUpperCase();
      const pName = headers[colIdx];
      if (gId && pName) {
        if (!mapping[gId]) mapping[gId] = [];
        if (!mapping[gId].includes(pName)) mapping[gId].push(pName);
      }
    });
  });
  return mapping;
};

// Returns Map: GO Term -> Set of Gene IDs
const parseGOAnnotations = (text: string): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return result;

  const headers = lines[0].split('\t').map(h => h.trim());
  headers.forEach(h => { if (h) result[h] = []; });

  lines.slice(1).forEach(line => {
    const parts = line.split('\t');
    parts.forEach((gene, colIdx) => {
      const gId = gene.trim().toUpperCase();
      const term = headers[colIdx];
      if (gId && term) {
        result[term].push(gId);
      }
    });
  });
  return result;
};

export const loadIntegratedData = async (onProgress?: (msg: string) => void): Promise<IntegratedDataset> => {
  const supabaseConfig = getSupabaseConfig();
  if (supabaseConfig) {
    try {
      return await loadIntegratedDataFromSupabase(supabaseConfig, onProgress);
    } catch (error) {
      console.warn('Supabase load failed, falling back to static files.', error);
      onProgress?.('Supabase unavailable, using bundled datasets...');
    }
  }

  onProgress?.("Loading regulatory datasets...");

  try {
    const [dapText, chipText, targetText, mapText, procText, goText] = await Promise.all([
      loadDataText('dap.tsv'),
      loadDataText('chip.tsv'),
      loadDataText('target.tsv'),
      loadDataText('mapping.tsv'),
      loadDataText('process.txt'),
      loadDataText('go_annotations.tsv')
    ]);

    onProgress?.("Parsing datasets...");

    const dapData = parseTSV(dapText, 'DAP');
    const chipData = parseTSV(chipText, 'CHIP');
    const targetData = parseTSV(targetText, 'TARGET');

    onProgress?.("Processing annotations...");
    const geneMapping = parseMapping(mapText);
    const pathwayMapping = parsePathways(procText);
    const goAnnotations = parseGOAnnotations(goText);

    onProgress?.("Integrating network model...");
    const map = new Map<string, IntegratedInteraction>();

    const resolve = (id: string) => geneMapping[id.toUpperCase()] || id.toUpperCase();

    [...dapData, ...chipData, ...targetData].forEach(item => {
      // Use resolved symbols for aggregation key
      const tfLabel = resolve(item.tf);
      const targetLabel = resolve(item.target);
      const key = `${tfLabel}::${targetLabel}`;

      if (!map.has(key)) {
        map.set(key, {
          tf: tfLabel,
          target: targetLabel,
          tfId: item.tf, // The raw input is usually the ID (e.g. AT1G...)
          targetId: item.target,
          sources: [item.source],
          evidenceCount: 1,
          isHighConfidence: false, // Will calculate after
          direction: item.direction || 'unknown',
          details: { [item.source]: item.metadata }
        });
      } else {
        const entry = map.get(key)!;
        if (!entry.sources.includes(item.source)) {
          entry.sources.push(item.source);
          entry.evidenceCount = entry.sources.length;
        }
        // If we find a specific direction later, overwrite 'unknown'
        if (entry.direction === 'unknown' && item.direction && item.direction !== 'unknown') {
          entry.direction = item.direction;
        }
        // Merge metadata
        if (!entry.details[item.source]) {
          entry.details[item.source] = item.metadata;
        }
      }
    });

    // Final pass for confidence
    const integrated = Array.from(map.values()).map(val => ({
      ...val,
      isHighConfidence: val.evidenceCount >= 2 // Example rule
    })).sort((a, b) => b.evidenceCount - a.evidenceCount);

    return {
      interactions: integrated,
      geneMapping,
      pathwayMapping,
      goAnnotations,
      totalInteractions: integrated.length
    };

  } catch (error) {
    console.error("Data loading failed", error);
    throw error;
  }
};
