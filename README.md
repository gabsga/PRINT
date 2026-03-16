# PRINT (Plant Regulatory Information Network Tool)

PRINT is a React + TypeScript web tool for integrating and exploring plant gene regulatory interactions with pathway and GO annotations.

## Project Overview

The application integrates three interaction evidence sources:

- `TARGET`
- `CHIP`
- `DAP`

And enriches those interactions with:

- Gene ID to symbol mapping
- Process annotations
- GO annotations

The frontend can load data from:

- Supabase tables (preferred for production)
- Static files in `public/data/` (fallback)

## Quick Start

Requirements:

- Node.js 18+

Install and run:

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## Data Layout

Static dataset files (fallback mode):

- `public/data/target.tsv`
- `public/data/chip.tsv`
- `public/data/dap.part01.tsv` ... `public/data/dap.partNN.tsv`
- `public/data/mapping.tsv`
- `public/data/process.txt`
- `public/data/go_annotations.tsv`

Raw files too large for static hosting are kept outside deploy assets:

- `docs/raw_data/`

## Supabase Mode

Set these variables in `.env.local` or your deployment environment:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-jwt>

# Optional table names (defaults shown)
VITE_SUPABASE_INTERACTIONS_TABLE=print_interactions
VITE_SUPABASE_MAPPING_TABLE=print_gene_mapping
VITE_SUPABASE_PROCESS_TABLE=print_process_annotations
VITE_SUPABASE_GO_TABLE=print_go_annotations
```

Canonical DB setup and import guide:

- `docs/supabase/README.md`

## Important Docs

- `docs/supabase/README.md`: full SQL + import runbook
- `docs/REGLAS_DISENO_PRINT.md`: design rules
- `scripts/prepareSupabaseCsv.mjs`: generates CSVs for manual Supabase upload
- `scripts/wipeSupabaseTables.mjs`: wipes target Supabase tables

## Pre-Push Checklist

Run before opening PR:

```bash
npm run build
git status
```

Ensure you do not commit generated artifacts:

- `upload/`
- `supabase/.temp/`
- local `.env*`

## Git Workflow (Suggested)

- Work from `dev` using `feature/*` branches.
- Open PRs to `dev` first.
- Merge `dev` to `main` only when stable.
