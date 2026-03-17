-- 08_tf_options_materialized.sql
-- Small helper relation for full TF selectors in the frontend.

drop materialized view if exists public.print_tf_options_mat;

create materialized view public.print_tf_options_mat as
select distinct tf
from public.print_interactions_integrated_mat
where coalesce(tf, '') <> ''
order by tf;

create unique index if not exists uq_print_tf_options_mat_tf
  on public.print_tf_options_mat (tf);

grant select on public.print_tf_options_mat to anon, authenticated;
