import { SupabaseConfig } from './types';

export const getSupabaseConfig = (): SupabaseConfig | null => {
  const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!url || !anonKey) return null;

  return {
    url,
    anonKey,
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

type RangeOptions = {
  from?: number;
  to?: number;
  preferCount?: 'exact' | 'planned';
};

function buildHeaders(config: SupabaseConfig, range?: RangeOptions) {
  const headers: Record<string, string> = {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`
  };

  if (typeof range?.from === 'number' && typeof range?.to === 'number') {
    headers['Range-Unit'] = 'items';
    headers.Range = `${range.from}-${range.to}`;
  }

  if (range?.preferCount) {
    headers.Prefer = `count=${range.preferCount}`;
  }

  return headers;
}

function buildTableUrl(config: SupabaseConfig, table: string, query: string) {
  return `${config.url}/rest/v1/${table}?${query}`;
}

export const fetchSupabasePage = async <T>(
  config: SupabaseConfig,
  table: string,
  query: string,
  options: RangeOptions = {}
): Promise<{ rows: T[]; total: number | null }> => {
  const res = await fetch(buildTableUrl(config, table, query), {
    headers: buildHeaders(config, options)
  });

  if (!res.ok) {
    throw new Error(`Supabase query failed for ${table}: ${res.status}`);
  }

  const rows = (await res.json()) as T[];
  const contentRange = res.headers.get('content-range') || '';
  const total = Number(contentRange.split('/')[1]);

  return {
    rows: Array.isArray(rows) ? rows : [],
    total: Number.isFinite(total) ? total : null
  };
};

export const fetchSupabaseTablePage = async <T>(
  config: SupabaseConfig,
  table: string,
  select: string,
  orderBy: string,
  from: number,
  pageSize: number,
  preferCount?: 'exact' | 'planned'
): Promise<{ rows: T[]; total: number | null }> => {
  const to = from + pageSize - 1;
  const query = new URLSearchParams({
    select,
    order: orderBy
  }).toString();

  return fetchSupabasePage<T>(config, table, query, {
    from,
    to,
    preferCount
  });
};

export const fetchSupabaseTable = async <T>(
  config: SupabaseConfig,
  table: string,
  select: string,
  orderBy: string,
  pageSize = 1000
): Promise<T[]> => {
  const allRows: T[] = [];
  let from = 0;

  for (;;) {
    const { rows } = await fetchSupabaseTablePage<T>(config, table, select, orderBy, from, pageSize);
    if (rows.length === 0) break;
    allRows.push(...rows);
    if (rows.length < pageSize) break;
    from += rows.length;
  }

  return allRows;
};

export const fetchSupabaseFilteredRows = async <T>(
  config: SupabaseConfig,
  table: string,
  query: string,
  pageSize = 1000
): Promise<T[]> => {
  const allRows: T[] = [];
  let from = 0;

  for (;;) {
    const to = from + pageSize - 1;
    const { rows } = await fetchSupabasePage<T>(config, table, query, { from, to });
    if (rows.length === 0) break;
    allRows.push(...rows);
    if (rows.length < pageSize) break;
    from += rows.length;
  }

  return allRows;
};

export const postSupabaseRpc = async <T>(
  config: SupabaseConfig,
  rpcName: string,
  body: unknown
): Promise<T> => {
  const res = await fetch(`${config.url}/rest/v1/rpc/${rpcName}`, {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`Supabase RPC ${rpcName} failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
};
