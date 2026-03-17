-- 10_enrichment_rpc.sql
-- Remote helper for enrichment: returns one row per TF with its filtered target IDs.

create or replace function public.print_tf_target_sets(
  min_evidence int default 1,
  selected_sources text[] default array['TARGET', 'DAP', 'CHIP']
)
returns table (
  tf text,
  target_ids text[]
)
language sql
stable
as $$
  select
    i.tf,
    array_agg(distinct coalesce(nullif(trim(i.target_id), ''), trim(i.target)) order by coalesce(nullif(trim(i.target_id), ''), trim(i.target))) as target_ids
  from public.print_interactions_integrated_mat i
  where i.evidence_count >= min_evidence
    and (
      cardinality(selected_sources) = 0
      or i.sources && selected_sources
    )
  group by i.tf
  order by i.tf;
$$;

grant execute on function public.print_tf_target_sets(int, text[]) to anon, authenticated;
