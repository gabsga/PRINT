-- 04_security.sql
-- RLS and access policies for client-side read access.

alter table public.print_interactions enable row level security;
alter table public.print_gene_mapping enable row level security;
alter table public.print_process_annotations enable row level security;
alter table public.print_go_annotations enable row level security;

-- Public read policies for anon key (frontend).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'print_interactions'
      and policyname = 'print_interactions_select_anon'
  ) then
    create policy print_interactions_select_anon
      on public.print_interactions
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'print_gene_mapping'
      and policyname = 'print_gene_mapping_select_anon'
  ) then
    create policy print_gene_mapping_select_anon
      on public.print_gene_mapping
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'print_process_annotations'
      and policyname = 'print_process_annotations_select_anon'
  ) then
    create policy print_process_annotations_select_anon
      on public.print_process_annotations
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'print_go_annotations'
      and policyname = 'print_go_annotations_select_anon'
  ) then
    create policy print_go_annotations_select_anon
      on public.print_go_annotations
      for select
      to anon
      using (true);
  end if;
end
$$;

-- Keep writes limited to privileged roles (service_role, SQL editor, etc.).
revoke all on public.print_interactions from anon, authenticated;
revoke all on public.print_gene_mapping from anon, authenticated;
revoke all on public.print_process_annotations from anon, authenticated;
revoke all on public.print_go_annotations from anon, authenticated;

grant select on public.print_interactions to anon, authenticated;
grant select on public.print_gene_mapping to anon, authenticated;
grant select on public.print_process_annotations to anon, authenticated;
grant select on public.print_go_annotations to anon, authenticated;
