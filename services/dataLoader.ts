
import { DataSource, IntegratedInteraction, Interaction, GeneMapping, PathwayMapping, RegulationDirection } from '../types';

interface RawInteraction {
  tf: string;
  target: string;
  source: 'TARGET' | 'DAP' | 'CHIP';
  direction?: RegulationDirection;
  metadata?: any;
}

export interface IntegratedDataset {
  interactions: IntegratedInteraction[];
  geneMapping: GeneMapping;
  pathwayMapping: PathwayMapping;
  goAnnotations: Record<string, string[]>;
  totalInteractions: number;
}

interface SupabaseConfig {
  url: string;
  anonKey: string;
  tables: {
    interactions: string;
    mapping: string;
    process: string;
    go: string;
  };
}

interface SupabaseInteractionRow {
  tf: string;
  target: string;
  source: 'TARGET' | 'DAP' | 'CHIP';
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

const getSupabaseConfig = (): SupabaseConfig | null => {
  const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!url || !anonKey) return null;

  return {
    url,
    anonKey,
    tables: {
      interactions: (import.meta.env.VITE_SUPABASE_INTERACTIONS_TABLE || 'print_interactions').trim(),
      mapping: (import.meta.env.VITE_SUPABASE_MAPPING_TABLE || 'print_gene_mapping').trim(),
      process: (import.meta.env.VITE_SUPABASE_PROCESS_TABLE || 'print_process_annotations').trim(),
      go: (import.meta.env.VITE_SUPABASE_GO_TABLE || 'print_go_annotations').trim()
    }
  };
};

const fetchSupabaseTable = async <T>(
  config: SupabaseConfig,
  table: string,
  select: string,
  pageSize = 5000
): Promise<T[]> => {
  const allRows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const url = `${config.url}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
    const res = await fetch(url, {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
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
  }

  return allRows;
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

  const [interactionRows, mappingRows, processRows, goRows] = await Promise.all([
    fetchSupabaseTable<SupabaseInteractionRow>(
      config,
      config.tables.interactions,
      'tf,target,source,experimentos,experimentos_pos,experimentos_neg'
    ),
    fetchSupabaseTable<SupabaseMappingRow>(
      config,
      config.tables.mapping,
      'gene_id,symbol'
    ),
    fetchSupabaseTable<SupabaseProcessRow>(
      config,
      config.tables.process,
      'gene_id,process'
    ),
    fetchSupabaseTable<SupabaseGoRow>(
      config,
      config.tables.go,
      'go_term,gene_id'
    )
  ]);

  const dapData: RawInteraction[] = [];
  const chipData: RawInteraction[] = [];
  const targetData: RawInteraction[] = [];

  interactionRows.forEach((row) => {
    if (!row.tf || !row.target || !row.source) return;
    const source = row.source;
    if (!['TARGET', 'DAP', 'CHIP'].includes(source)) return;

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
