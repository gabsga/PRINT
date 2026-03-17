-- 09_stats_materialized.sql
-- Exact summary stats for the dashboard, independent of any client-side sample window.

drop materialized view if exists public.print_interaction_stats_mat;

create materialized view public.print_interaction_stats_mat as
select
  count(*)::bigint as total_interactions,
  count(*) filter (where 'TARGET' = any(sources))::bigint as target_count,
  count(*) filter (where 'DAP' = any(sources))::bigint as dap_count,
  count(*) filter (where 'CHIP' = any(sources))::bigint as chip_count,
  count(*) filter (where evidence_count = 3)::bigint as high_confidence_3,
  count(distinct tf)::bigint as unique_tfs,
  count(distinct target)::bigint as unique_targets
from public.print_interactions_integrated_mat;

grant select on public.print_interaction_stats_mat to anon, authenticated;
