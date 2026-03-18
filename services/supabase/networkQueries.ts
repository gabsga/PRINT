import { fetchSupabaseFilteredRows, fetchSupabaseTable } from './client';
import { getSupabaseConfig } from './client';
import { dedupeIntegratedInteractions, filterInteractionsBySources, mapIntegratedRows } from './mappers';
import { IntegratedInteraction } from '../../types';
import { SupabaseIntegratedRow, SupabaseTfOptionRow } from './types';

const INTEGRATED_SELECT = 'tf,target,tf_id,target_id,sources,evidence_count,direction,details';
const INTEGRATED_ORDER = 'tf.asc,target.asc';

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
  const selectedTF = tf.trim();
  if (!config?.tables.integrated || !selectedTF) return [];

  const query = new URLSearchParams({
    select: INTEGRATED_SELECT,
    order: 'target.asc',
    tf: `eq.${selectedTF}`
  }).toString();

  const rows = await fetchSupabaseFilteredRows<SupabaseIntegratedRow>(
    config,
    config.tables.integrated,
    query
  );

  return mapIntegratedRows(rows);
};

export const fetchSupabaseHierarchyForTF = async (
  tf: string,
  selectedSources?: string[]
): Promise<IntegratedInteraction[]> => {
  const config = getSupabaseConfig();
  const selectedTF = tf.trim();
  if (!config?.tables.integrated || !selectedTF) return [];

  const directRows = await fetchSupabaseFilteredRows<SupabaseIntegratedRow>(
    config,
    config.tables.integrated,
    new URLSearchParams({
      select: INTEGRATED_SELECT,
      order: INTEGRATED_ORDER,
      tf: `eq.${selectedTF}`
    }).toString()
  );

  const directInteractions = filterInteractionsBySources(mapIntegratedRows(directRows), selectedSources);
  const downstreamTFs = Array.from(
    new Set(
      directInteractions
        .map((row) => (row.target || '').trim())
        .filter(Boolean)
    )
  );

  const upstreamRows = await fetchSupabaseFilteredRows<SupabaseIntegratedRow>(
    config,
    config.tables.integrated,
    new URLSearchParams({
      select: INTEGRATED_SELECT,
      order: INTEGRATED_ORDER,
      target: `eq.${selectedTF}`
    }).toString()
  );

  const downstreamRows: SupabaseIntegratedRow[] = [];
  if (downstreamTFs.length > 0) {
    const chunkSize = 20;
    for (let index = 0; index < downstreamTFs.length; index += chunkSize) {
      const chunk = downstreamTFs.slice(index, index + chunkSize);
      const orClause = chunk
        .map((targetTf) => `tf.eq.${String(targetTf).replace(/[%(),]/g, ' ')}`)
        .join(',');

      try {
        const chunkRows = await fetchSupabaseFilteredRows<SupabaseIntegratedRow>(
          config,
          config.tables.integrated,
          `${new URLSearchParams({
            select: INTEGRATED_SELECT,
            order: INTEGRATED_ORDER
          }).toString()}&or=(${orClause})`
        );
        downstreamRows.push(...chunkRows);
      } catch (error) {
        console.warn(`Skipping downstream hierarchy chunk for ${selectedTF}.`, error);
      }
    }
  }

  return dedupeIntegratedInteractions(
    filterInteractionsBySources(
      mapIntegratedRows([...directRows, ...upstreamRows, ...downstreamRows]),
      selectedSources
    )
  );
};
