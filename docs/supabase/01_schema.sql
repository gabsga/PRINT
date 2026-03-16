-- 01_schema.sql
-- Core schema for PRINT on Supabase (Postgres)

create extension if not exists pgcrypto;

-- Normalized interactions used directly by the frontend loader.
create table if not exists public.print_interactions (
  id bigint generated always as identity primary key,
  tf text not null,
  target text not null,
  source text not null check (source in ('TARGET', 'DAP', 'CHIP')),
  experimentos text,
  experimentos_pos text,
  experimentos_neg text,
  created_at timestamptz not null default now()
);

-- Gene ID -> display symbol mapping.
create table if not exists public.print_gene_mapping (
  id bigint generated always as identity primary key,
  gene_id text not null,
  symbol text not null,
  created_at timestamptz not null default now(),
  unique (gene_id)
);

-- Process annotations flattened as (gene_id, process).
create table if not exists public.print_process_annotations (
  id bigint generated always as identity primary key,
  gene_id text not null,
  process text not null,
  created_at timestamptz not null default now(),
  unique (gene_id, process)
);

-- GO annotations flattened as (go_term, gene_id).
create table if not exists public.print_go_annotations (
  id bigint generated always as identity primary key,
  go_term text not null,
  gene_id text not null,
  created_at timestamptz not null default now(),
  unique (go_term, gene_id)
);

-- Helpful indexes for REST queries and optional server-side filtering.
create index if not exists idx_print_interactions_tf on public.print_interactions (tf);
create index if not exists idx_print_interactions_target on public.print_interactions (target);
create index if not exists idx_print_interactions_source on public.print_interactions (source);
create index if not exists idx_print_gene_mapping_gene_id on public.print_gene_mapping (gene_id);
create index if not exists idx_print_process_gene_id on public.print_process_annotations (gene_id);
create index if not exists idx_print_go_term on public.print_go_annotations (go_term);
create index if not exists idx_print_go_gene_id on public.print_go_annotations (gene_id);

-- Optional: deduplicate identical interactions while preserving three sources.
create unique index if not exists uq_print_interactions_triplet
  on public.print_interactions (tf, target, source);
