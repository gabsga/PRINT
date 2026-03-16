#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');
const OUT_DIR = resolve(ROOT, 'upload', 'supabase_csv');

function readText(relPath) {
  const p = resolve(ROOT, relPath);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

function parseTSVWithHeader(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const headers = lines[0].split('\t').map(h => h.trim());
  const rows = lines.slice(1).map(line => line.split('\t').map(c => c.trim()));
  return { headers, rows };
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function writeCSV(filePath, headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(','));
  }
  writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

function loadInteractions() {
  const out = [];

  const tText = readText('public/data/target.tsv');
  if (tText) {
    const { rows } = parseTSVWithHeader(tText);
    for (const [tf, target, pos, neg] of rows) {
      if (!tf || !target) continue;
      out.push([tf.toUpperCase(), target.toUpperCase(), 'TARGET', '', pos || '', neg || '']);
    }
  }

  const cText = readText('public/data/chip.tsv');
  if (cText) {
    const { rows } = parseTSVWithHeader(cText);
    for (const [tf, target, exp] of rows) {
      if (!tf || !target) continue;
      out.push([tf.toUpperCase(), target.toUpperCase(), 'CHIP', exp || '', '', '']);
    }
  }

  // Merge dap.partXX.tsv
  let dHeader = '';
  let dBody = '';
  for (let i = 1; i <= 99; i++) {
    const part = String(i).padStart(2, '0');
    const pText = readText(`public/data/dap.part${part}.tsv`);
    if (!pText) break;
    const lines = pText.split(/\r?\n/);
    if (!dHeader) dHeader = lines[0] || '';
    dBody += (i === 1 ? lines.slice(1) : lines.slice(1)).join('\n') + '\n';
  }

  if (dHeader) {
    const merged = `${dHeader}\n${dBody}`;
    const { rows } = parseTSVWithHeader(merged);
    for (const [tf, target, exp] of rows) {
      if (!tf || !target) continue;
      out.push([tf.toUpperCase(), target.toUpperCase(), 'DAP', exp || '', '', '']);
    }
  }

  // Deduplicate by tf,target,source
  const seen = new Set();
  const dedup = [];
  for (const row of out) {
    const key = `${row[0]}::${row[1]}::${row[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(row);
  }
  return dedup;
}

function loadMapping() {
  const text = readText('public/data/mapping.tsv');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const genePattern = /^AT[1-5CM]G[0-9]{5}$/;
  const out = [];
  const seen = new Set();

  for (const line of lines) {
    const [aRaw, bRaw] = line.split('\t').map(c => (c || '').trim());
    if (!aRaw || !bRaw) continue;

    const a = aRaw.toUpperCase();
    const b = bRaw.toUpperCase();

    let gene = '';
    let symbol = '';

    if (genePattern.test(a) && !genePattern.test(b)) {
      gene = a;
      symbol = bRaw;
    } else if (!genePattern.test(a) && genePattern.test(b)) {
      gene = b;
      symbol = aRaw;
    } else if (genePattern.test(a) && genePattern.test(b)) {
      // If both look like gene IDs, keep first as gene and second as symbol-like fallback.
      gene = a;
      symbol = bRaw;
    } else {
      // Skip rows where neither side looks like a gene ID.
      continue;
    }

    if (seen.has(gene)) continue;
    seen.add(gene);
    out.push([gene, symbol]);
  }

  return out;
}

function loadProcess() {
  const text = readText('public/data/process.txt');
  const { headers, rows } = parseTSVWithHeader(text);
  const out = [];
  for (const row of rows) {
    for (let c = 0; c < headers.length; c++) {
      const gene = (row[c] || '').trim();
      if (!gene) continue;
      out.push([gene.toUpperCase(), headers[c]]);
    }
  }
  const seen = new Set();
  return out.filter(([gene, proc]) => {
    const k = `${gene}::${proc}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function loadGo() {
  const text = readText('public/data/go_annotations.tsv');
  const { headers, rows } = parseTSVWithHeader(text);
  const out = [];
  for (const row of rows) {
    for (let c = 0; c < headers.length; c++) {
      const gene = (row[c] || '').trim();
      if (!gene) continue;
      out.push([headers[c], gene.toUpperCase()]);
    }
  }
  const seen = new Set();
  return out.filter(([term, gene]) => {
    const k = `${term}::${gene}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function chunkRows(rows, size) {
  const chunks = [];
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
  return chunks;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const interactions = loadInteractions();
  const mapping = loadMapping();
  const processRows = loadProcess();
  const goRows = loadGo();

  const iChunks = chunkRows(interactions, 400000);
  iChunks.forEach((chunk, idx) => {
    const n = String(idx + 1).padStart(2, '0');
    writeCSV(
      resolve(OUT_DIR, `print_interactions.part${n}.csv`),
      ['tf', 'target', 'source', 'experimentos', 'experimentos_pos', 'experimentos_neg'],
      chunk
    );
  });

  writeCSV(
    resolve(OUT_DIR, 'print_gene_mapping.csv'),
    ['gene_id', 'symbol'],
    mapping
  );

  writeCSV(
    resolve(OUT_DIR, 'print_process_annotations.csv'),
    ['gene_id', 'process'],
    processRows
  );

  writeCSV(
    resolve(OUT_DIR, 'print_go_annotations.csv'),
    ['go_term', 'gene_id'],
    goRows
  );

  const summary = [
    'CSV files ready for Supabase import:',
    ...iChunks.map((_, idx) => `- print_interactions.part${String(idx + 1).padStart(2, '0')}.csv`),
    '- print_gene_mapping.csv',
    '- print_process_annotations.csv',
    '- print_go_annotations.csv',
    '',
    `Counts:`,
    `- interactions: ${interactions.length}`,
    `- gene_mapping: ${mapping.length}`,
    `- process_annotations: ${processRows.length}`,
    `- go_annotations: ${goRows.length}`,
  ].join('\n');

  writeFileSync(resolve(OUT_DIR, 'IMPORT_SUMMARY.txt'), summary + '\n', 'utf8');
  console.log(summary);
  console.log(`\nOutput dir: ${OUT_DIR}`);
}

main();
