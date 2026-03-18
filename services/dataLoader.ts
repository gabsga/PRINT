import { fetchSupabaseExploreAll, fetchSupabaseExplorePage } from './supabase/explorerQueries';
import { fetchSupabaseTFOptions, fetchSupabaseHierarchyForTF, fetchSupabaseInteractionsForTF } from './supabase/networkQueries';
import {
  fetchSupabaseGeneMappingForGenes,
  fetchSupabaseGoAnnotationsByTerms,
  fetchSupabasePathwayMappingForGenes,
  fetchSupabaseStatsSummary,
  fetchSupabaseTfTargetSets
} from './supabase/annotationQueries';
import { getSupabaseConfig } from './supabase/client';
import { loadIntegratedDataFromSupabase } from './supabase/datasetLoader';
import { loadIntegratedDataFromStaticFiles } from './staticDatasetLoader';

export type { ExplorePageResult, IntegratedDataset } from './supabase/types';
export {
  fetchSupabaseExploreAll,
  fetchSupabaseExplorePage,
  fetchSupabaseGeneMappingForGenes,
  fetchSupabaseGoAnnotationsByTerms,
  fetchSupabaseHierarchyForTF,
  fetchSupabaseInteractionsForTF,
  fetchSupabasePathwayMappingForGenes,
  fetchSupabaseStatsSummary,
  fetchSupabaseTFOptions,
  fetchSupabaseTfTargetSets
};

export const loadIntegratedData = async (onProgress?: (msg: string) => void) => {
  // Compatibility fallback: some feature hooks still need a full local snapshot
  // when Supabase subsets are unavailable. This is no longer part of the happy path.
  if (getSupabaseConfig()) {
    try {
      const supabaseDataset = await loadIntegratedDataFromSupabase(onProgress);
      if (supabaseDataset) {
        return supabaseDataset;
      }
    } catch (error) {
      console.warn('Supabase load failed, falling back to static files.', error);
      onProgress?.('Supabase unavailable, using bundled datasets...');
    }
  }

  return loadIntegratedDataFromStaticFiles(onProgress);
};
