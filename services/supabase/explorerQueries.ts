import { fetchSupabaseFilteredRows, fetchSupabasePage } from './client';
import { getSupabaseConfig } from './client';
import { mapIntegratedRows } from './mappers';
import { ExplorePageResult, ExploreQueryParams, SupabaseIntegratedRow, VALID_SOURCES } from './types';

const EXPLORE_SELECT = 'tf,target,tf_id,target_id,sources,evidence_count,direction,details';
const EXPLORE_ORDER = 'tf.asc,target.asc';

const sanitizeFilterValue = (value: string) => value.replace(/[%(),]/g, ' ');

const buildExploreQuery = (params: ExploreQueryParams): URLSearchParams => {
  const query = new URLSearchParams();
  query.set('select', EXPLORE_SELECT);
  query.set('order', EXPLORE_ORDER);

  const search = (params.searchTerm || '').trim();
  const selectedSources = (params.selectedSources || []).filter(Boolean);
  const exactTF = (params.exactTF || '').trim();
  const orClauses: string[] = [];

  if (exactTF) {
    query.set('tf', `eq.${exactTF}`);
  }

  if (search && !exactTF) {
    const escaped = sanitizeFilterValue(search);
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
  const query = buildExploreQuery(params).toString();

  const { rows, total } = await fetchSupabasePage<SupabaseIntegratedRow>(
    config,
    config.tables.integrated,
    query,
    { from, to, preferCount: 'planned' }
  );

  const mappedRows = mapIntegratedRows(rows);
  return {
    rows: mappedRows,
    total: total ?? (from + mappedRows.length + (mappedRows.length === pageSize ? 1 : 0))
  };
};

export const fetchSupabaseExploreAll = async (
  params: ExploreQueryParams,
  onProgress?: (loaded: number, total: number) => void
) => {
  const config = getSupabaseConfig();
  if (!config?.tables.integrated) return null;

  const pageSize = 1000;
  const rows = await fetchSupabaseFilteredRows<SupabaseIntegratedRow>(
    config,
    config.tables.integrated,
    buildExploreQuery(params).toString(),
    pageSize
  );

  const mappedRows = mapIntegratedRows(rows);
  onProgress?.(mappedRows.length, mappedRows.length);
  return mappedRows;
};
