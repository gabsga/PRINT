-- 03_transform.sql
-- Transform staged raw imports into final normalized tables.

create or replace function public.print_load_from_staging()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_target int := 0;
  v_chip int := 0;
  v_dap int := 0;
  v_map int := 0;
  v_proc int := 0;
  v_go int := 0;
  v_rows int := 0;
begin
  -- Interactions
  insert into public.print_interactions (
    tf, target, source, experimentos, experimentos_pos, experimentos_neg
  )
  select
    upper(trim(tf)),
    upper(trim(target)),
    'TARGET',
    null,
    nullif(trim(experimentos_pos), ''),
    nullif(trim(experimentos_neg), '')
  from staging.target_raw
  where coalesce(trim(tf), '') <> '' and coalesce(trim(target), '') <> ''
  on conflict (tf, target, source) do update
    set
      experimentos_pos = excluded.experimentos_pos,
      experimentos_neg = excluded.experimentos_neg;
  get diagnostics v_target = row_count;

  insert into public.print_interactions (
    tf, target, source, experimentos, experimentos_pos, experimentos_neg
  )
  select
    upper(trim(tf)),
    upper(trim(target)),
    'CHIP',
    nullif(trim(experimentos), ''),
    null,
    null
  from staging.chip_raw
  where coalesce(trim(tf), '') <> '' and coalesce(trim(target), '') <> ''
  on conflict (tf, target, source) do update
    set experimentos = excluded.experimentos;
  get diagnostics v_chip = row_count;

  insert into public.print_interactions (
    tf, target, source, experimentos, experimentos_pos, experimentos_neg
  )
  select
    upper(trim(tf)),
    upper(trim(target)),
    'DAP',
    nullif(trim(experimentos), ''),
    null,
    null
  from staging.dap_raw
  where coalesce(trim(tf), '') <> '' and coalesce(trim(target), '') <> ''
  on conflict (tf, target, source) do update
    set experimentos = excluded.experimentos;
  get diagnostics v_dap = row_count;

  -- Mapping
  insert into public.print_gene_mapping (gene_id, symbol)
  select
    upper(trim(gene_id)),
    trim(symbol)
  from staging.mapping_raw
  where coalesce(trim(gene_id), '') <> '' and coalesce(trim(symbol), '') <> ''
  on conflict (gene_id) do update
    set symbol = excluded.symbol;
  get diagnostics v_map = row_count;

  -- Process annotations (2 columns -> normalized rows)
  insert into public.print_process_annotations (gene_id, process)
  select upper(trim("Water deprivation")), 'Water deprivation'
  from staging.process_raw
  where coalesce(trim("Water deprivation"), '') <> ''
  on conflict (gene_id, process) do nothing;
  get diagnostics v_proc = row_count;

  insert into public.print_process_annotations (gene_id, process)
  select upper(trim("Response to ABA")), 'Response to ABA'
  from staging.process_raw
  where coalesce(trim("Response to ABA"), '') <> ''
  on conflict (gene_id, process) do nothing;
  get diagnostics v_rows = row_count;
  v_proc := v_proc + v_rows;

  -- GO annotations (6 columns -> normalized rows)
  insert into public.print_go_annotations (go_term, gene_id)
  select 'Water deprivation', upper(trim("Water deprivation"))
  from staging.go_raw
  where coalesce(trim("Water deprivation"), '') <> ''
  on conflict (go_term, gene_id) do nothing;
  get diagnostics v_go = row_count;

  insert into public.print_go_annotations (go_term, gene_id)
  select 'Response to ABA', upper(trim("Response to ABA"))
  from staging.go_raw
  where coalesce(trim("Response to ABA"), '') <> ''
  on conflict (go_term, gene_id) do nothing;
  get diagnostics v_rows = row_count;
  v_go := v_go + v_rows;

  insert into public.print_go_annotations (go_term, gene_id)
  select 'Salt stress', upper(trim("Salt stress"))
  from staging.go_raw
  where coalesce(trim("Salt stress"), '') <> ''
  on conflict (go_term, gene_id) do nothing;
  get diagnostics v_rows = row_count;
  v_go := v_go + v_rows;

  insert into public.print_go_annotations (go_term, gene_id)
  select 'Osmotic stress', upper(trim("Osmotic stress"))
  from staging.go_raw
  where coalesce(trim("Osmotic stress"), '') <> ''
  on conflict (go_term, gene_id) do nothing;
  get diagnostics v_rows = row_count;
  v_go := v_go + v_rows;

  insert into public.print_go_annotations (go_term, gene_id)
  select 'Response to auxin', upper(trim("Response to auxin"))
  from staging.go_raw
  where coalesce(trim("Response to auxin"), '') <> ''
  on conflict (go_term, gene_id) do nothing;
  get diagnostics v_rows = row_count;
  v_go := v_go + v_rows;

  insert into public.print_go_annotations (go_term, gene_id)
  select 'Response to nitrate', upper(trim("Response to nitrate"))
  from staging.go_raw
  where coalesce(trim("Response to nitrate"), '') <> ''
  on conflict (go_term, gene_id) do nothing;
  get diagnostics v_rows = row_count;
  v_go := v_go + v_rows;

  return jsonb_build_object(
    'target_upserts', v_target,
    'chip_upserts', v_chip,
    'dap_upserts', v_dap,
    'mapping_upserts', v_map,
    'process_inserts', v_proc,
    'go_inserts', v_go
  );
end;
$$;

-- Convenience view for optional server-side analytics/debugging.
create or replace view public.print_interactions_with_direction as
select
  i.*,
  case
    when coalesce(nullif(trim(i.experimentos_pos), ''), '') <> ''
      and coalesce(nullif(trim(i.experimentos_neg), ''), '') = ''
      then 'activation'
    when coalesce(nullif(trim(i.experimentos_neg), ''), '') <> ''
      and coalesce(nullif(trim(i.experimentos_pos), ''), '') = ''
      then 'repression'
    when coalesce(nullif(trim(i.experimentos_pos), ''), '') <> ''
      and coalesce(nullif(trim(i.experimentos_neg), ''), '') <> ''
      then 'both'
    else 'unknown'
  end as direction
from public.print_interactions i;
