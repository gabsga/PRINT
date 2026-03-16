-- 02_staging.sql
-- Temporary staging tables for importing raw TSV files from this repo.
-- Use Supabase Table Editor -> Import data from CSV/TSV into these tables.

create schema if not exists staging;

-- TARGET and CHIP/DAP imports (tab-delimited).
create table if not exists staging.target_raw (
  tf text,
  target text,
  experimentos_pos text,
  experimentos_neg text
);

create table if not exists staging.chip_raw (
  tf text,
  target text,
  experimentos text
);

create table if not exists staging.dap_raw (
  tf text,
  target text,
  experimentos text
);

-- mapping.tsv (2 columns, no header in source file)
create table if not exists staging.mapping_raw (
  gene_id text,
  symbol text
);

-- process.txt has two process columns with header names exactly as in source file.
create table if not exists staging.process_raw (
  "Water deprivation" text,
  "Response to ABA" text
);

-- go_annotations.tsv has six GO-term columns with header names exactly as in source file.
create table if not exists staging.go_raw (
  "Water deprivation" text,
  "Response to ABA" text,
  "Salt stress" text,
  "Osmotic stress" text,
  "Response to auxin" text,
  "Response to nitrate" text
);

-- Optional cleanup helper before re-import.
create or replace function staging.truncate_all_raw_tables()
returns void
language plpgsql
as $$
begin
  truncate table
    staging.target_raw,
    staging.chip_raw,
    staging.dap_raw,
    staging.mapping_raw,
    staging.process_raw,
    staging.go_raw;
end;
$$;
