-- 06_integrated_view.sql
-- Optional but strongly recommended for frontend performance.
-- This view pre-aggregates raw interactions into one row per display TF -> display target pair.

create or replace view public.print_interactions_integrated as
with normalized as (
  select
    coalesce(tf_map.symbol, i.tf) as tf,
    coalesce(target_map.symbol, i.target) as target,
    i.tf as tf_id,
    i.target as target_id,
    i.source,
    i.experimentos,
    i.experimentos_pos,
    i.experimentos_neg,
    case
      when coalesce(nullif(trim(i.experimentos_pos), ''), '') <> ''
        and coalesce(nullif(trim(i.experimentos_neg), ''), '') <> ''
        then 'both'
      when coalesce(nullif(trim(i.experimentos_pos), ''), '') <> ''
        then 'activation'
      when coalesce(nullif(trim(i.experimentos_neg), ''), '') <> ''
        then 'repression'
      else 'unknown'
    end as direction
  from public.print_interactions i
  left join public.print_gene_mapping tf_map
    on tf_map.gene_id = i.tf
  left join public.print_gene_mapping target_map
    on target_map.gene_id = i.target
)
select
  tf,
  target,
  min(tf_id) as tf_id,
  min(target_id) as target_id,
  array_agg(distinct source order by source) as sources,
  count(distinct source)::int as evidence_count,
  case
    when bool_or(direction = 'both') then 'both'
    when bool_or(direction = 'activation') and bool_or(direction = 'repression') then 'both'
    when bool_or(direction = 'activation') then 'activation'
    when bool_or(direction = 'repression') then 'repression'
    else 'unknown'
  end as direction,
  jsonb_object_agg(
    source,
    jsonb_build_object(
      'experimentos', experimentos,
      'experimentos_pos', experimentos_pos,
      'experimentos_neg', experimentos_neg
    )
  ) as details
from normalized
group by tf, target;
