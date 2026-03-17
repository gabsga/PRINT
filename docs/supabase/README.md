# Supabase SQL Editor Runbook (PRINT)

This runbook creates and loads the PRINT database in Supabase using SQL Editor + Table imports.

## 1) Run SQL files in order

1. `docs/supabase/01_schema.sql`
2. `docs/supabase/02_staging.sql`
3. Import TSV files into `staging.*` tables (next section)
4. `docs/supabase/03_transform.sql`
5. `select public.print_load_from_staging();`
6. `docs/supabase/04_security.sql`
7. `docs/supabase/05_checks.sql`
8. `docs/supabase/06_integrated_view.sql`
9. `docs/supabase/07_integrated_materialized.sql`
10. `docs/supabase/08_tf_options_materialized.sql`
11. `docs/supabase/09_stats_materialized.sql`

## 2) Import raw files into staging tables

Use Supabase Dashboard -> Table Editor -> each `staging.*` table -> Import data.

- `staging.target_raw` <= `public/data/target.tsv` (delimiter: tab, header: yes)
- `staging.chip_raw` <= `public/data/chip.tsv` (delimiter: tab, header: yes)
- `staging.dap_raw` <= merge of `public/data/dap.part*.tsv` (delimiter: tab, header: yes)
- `staging.mapping_raw` <= `public/data/mapping.tsv` (delimiter: tab, header: no)
- `staging.process_raw` <= `public/data/process.txt` (delimiter: tab, header: yes)
- `staging.go_raw` <= `public/data/go_annotations.tsv` (delimiter: tab, header: yes)

## 3) Merge split DAP files before import

Locally in this repo:

```bash
awk 'FNR==1 && NR!=1 {next} {print}' public/data/dap.part*.tsv > /tmp/dap_merged.tsv
```

Then import `/tmp/dap_merged.tsv` into `staging.dap_raw`.

## 4) Frontend env variables

Set in local `.env.local` or Cloudflare Pages env:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-jwt>
VITE_SUPABASE_INTEGRATED_VIEW=print_interactions_integrated_mat
VITE_SUPABASE_STATS_VIEW=print_interaction_stats_mat
VITE_SUPABASE_TF_OPTIONS_VIEW=print_tf_options_mat
VITE_SUPABASE_INITIAL_ROWS=10000
VITE_SUPABASE_INTERACTIONS_TABLE=print_interactions
VITE_SUPABASE_MAPPING_TABLE=print_gene_mapping
VITE_SUPABASE_PROCESS_TABLE=print_process_annotations
VITE_SUPABASE_GO_TABLE=print_go_annotations
```

## 5) Re-load updates

When new TSV files arrive:

1. `select staging.truncate_all_raw_tables();`
2. Re-import files into `staging.*`
3. Optionally clear final tables for a full refresh:
   - `truncate table public.print_interactions, public.print_gene_mapping, public.print_process_annotations, public.print_go_annotations restart identity;`
4. `select public.print_load_from_staging();`
5. Run checks from `05_checks.sql`.

## 6) Optional helper scripts in this repo

These scripts are convenience tools and are not required by SQL Editor workflow.

- `scripts/prepareSupabaseCsv.mjs`: generate CSV files for manual import into final tables.
- `scripts/wipeSupabaseTables.mjs`: wipe final tables via Supabase REST API.

Generated files are written under `upload/` and are gitignored.
