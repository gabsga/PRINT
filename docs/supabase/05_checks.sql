-- 05_checks.sql
-- Validation queries after import + transform.

select 'print_interactions' as table_name, count(*) as rows from public.print_interactions
union all
select 'print_gene_mapping', count(*) from public.print_gene_mapping
union all
select 'print_process_annotations', count(*) from public.print_process_annotations
union all
select 'print_go_annotations', count(*) from public.print_go_annotations;

select source, count(*) as rows
from public.print_interactions
group by source
order by source;

-- Check if the six priority GO terms are populated.
select go_term, count(*) as genes
from public.print_go_annotations
where go_term in (
  'Water deprivation',
  'Response to ABA',
  'Salt stress',
  'Osmotic stress',
  'Response to auxin',
  'Response to nitrate'
)
group by go_term
order by go_term;

-- Sanity: a few example records.
select * from public.print_interactions order by id desc limit 10;
select * from public.print_gene_mapping order by id desc limit 10;
select * from public.print_process_annotations order by id desc limit 10;
select * from public.print_go_annotations order by id desc limit 10;
