drop materialized view if exists public.print_tf_target_sets_mat;

create materialized view public.print_tf_target_sets_mat as
with source_filters as (
  select source_key, selected_sources
  from (
    values
      ('TARGET', array['TARGET']::text[]),
      ('DAP', array['DAP']::text[]),
      ('CHIP', array['CHIP']::text[]),
      ('TARGET|DAP', array['TARGET', 'DAP']::text[]),
      ('TARGET|CHIP', array['TARGET', 'CHIP']::text[]),
      ('DAP|CHIP', array['DAP', 'CHIP']::text[]),
      ('TARGET|DAP|CHIP', array['TARGET', 'DAP', 'CHIP']::text[])
  ) as filters(source_key, selected_sources)
),
evidence_levels as (
  select min_evidence
  from (values (1), (2), (3)) as levels(min_evidence)
),
eligible as (
  select
    i.tf,
    e.min_evidence,
    s.source_key,
    upper(coalesce(nullif(trim(i.target_id), ''), trim(i.target))) as target_id
  from public.print_interactions_integrated_mat i
  join source_filters s
    on i.sources && s.selected_sources
  join evidence_levels e
    on i.evidence_count >= e.min_evidence
  where coalesce(nullif(trim(i.target_id), ''), trim(i.target)) <> ''
)
select
  tf,
  min_evidence,
  source_key,
  array_agg(distinct target_id order by target_id) as target_ids
from eligible
group by tf, min_evidence, source_key;

create unique index if not exists uq_print_tf_target_sets_mat_lookup
  on public.print_tf_target_sets_mat (source_key, min_evidence, tf);

grant select on public.print_tf_target_sets_mat to anon, authenticated;
