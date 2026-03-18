import { loadIntegratedData, fetchSupabaseExploreAll, fetchSupabasePathwayMappingForGenes } from '../dataLoader';
import { filterInteractions } from '../explorer/filterInteractions';

interface ExplorerExportOptions {
  exportFormat: 'symbol' | 'geneId';
  filters: {
    minConfidence: number;
    priorityTfFilter: string | null;
    searchTerm: string;
    selectedSources: string[];
  };
  onProgress?: (message: string) => void;
}

export async function exportExplorerAsTsv({
  exportFormat,
  filters,
  onProgress
}: ExplorerExportOptions) {
  onProgress?.('Preparing export...');

  const remoteRows = await fetchSupabaseExploreAll(
    {
      searchTerm: filters.searchTerm,
      minConfidence: filters.minConfidence,
      selectedSources: filters.selectedSources,
      exactTF: filters.priorityTfFilter
    },
    (loaded, total) => {
      onProgress?.(`Preparing export... ${loaded.toLocaleString()} / ${total.toLocaleString()}`);
    }
  );

  let sourceRows = remoteRows;
  let pathwayMapping: Record<string, string[]> = {};

  if (remoteRows && remoteRows.length > 0) {
    const genes = Array.from(new Set(
      remoteRows.flatMap((row) => [row.targetId || '', row.target || '']).filter(Boolean)
    ));
    pathwayMapping = (await fetchSupabasePathwayMappingForGenes(genes)) || {};
  } else {
    // Compatibility fallback until TSV export moves server-side.
    const dataset = await loadIntegratedData();
    sourceRows = filterInteractions(dataset.interactions, {
      minConfidence: filters.minConfidence,
      priorityTfFilter: filters.priorityTfFilter,
      searchTerm: filters.searchTerm,
      selectedSources: filters.selectedSources
    });
    pathwayMapping = dataset.pathwayMapping;
  }

  const rows = (sourceRows || []).map((row) => {
    const sanitizeTSVCell = (value: string | number) => String(value).replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
    const tfVal = exportFormat === 'symbol' ? row.tf : (row.tfId || row.tf);
    const targetVal = exportFormat === 'symbol' ? row.target : (row.targetId || row.target);
    const processes = Array.from(new Set([
      ...(pathwayMapping[row.target.toUpperCase()] || []),
      ...(pathwayMapping[(row.targetId || '').toUpperCase()] || [])
    ])).join('|');

    return [
      sanitizeTSVCell(tfVal),
      sanitizeTSVCell(targetVal),
      sanitizeTSVCell(row.sources.join('|')),
      sanitizeTSVCell(row.direction),
      sanitizeTSVCell(row.evidenceCount),
      sanitizeTSVCell(processes)
    ].join('\t');
  });

  const blob = new Blob([
    ['TF', 'Target', 'Evidence_Sources', 'Direction', 'Evidence_Count', 'Processes'].join('\t') + '\n' + rows.join('\n')
  ], { type: 'text/tab-separated-values' });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `genereg_export_${exportFormat}_${new Date().toISOString().split('T')[0]}.tsv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
