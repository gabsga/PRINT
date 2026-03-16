#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');

function readEnvLocal() {
  const envPath = resolve(ROOT, '.env.local');
  if (!existsSync(envPath)) throw new Error('.env.local not found');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = readEnvLocal();
const SUPABASE_URL = env['VITE_SUPABASE_URL'];
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

const tables = [
  'print_go_annotations',
  'print_process_annotations',
  'print_gene_mapping',
  'print_interactions',
];

async function fetchBoundaryId(table, order) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=id&order=id.${order}&limit=1`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Boundary query failed for ${table}: ${res.status} ${await res.text()}`);
  }
  const rows = await res.json();
  if (!rows.length) return null;
  return Number(rows[0].id);
}

async function deleteRange(table, startId, endId) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=gte.${startId}&id=lte.${endId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { ...headers, Prefer: 'return=minimal' },
  });
  if (!res.ok) {
    throw new Error(`Delete failed for ${table} [${startId}-${endId}]: ${res.status} ${await res.text()}`);
  }
}

async function wipeTable(table, step = 50000) {
  const minId = await fetchBoundaryId(table, 'asc');
  const maxId = await fetchBoundaryId(table, 'desc');

  if (minId === null || maxId === null) {
    console.log(`${table}: already empty`);
    return;
  }

  let done = 0;
  const total = maxId - minId + 1;
  for (let start = minId; start <= maxId; start += step) {
    const end = Math.min(start + step - 1, maxId);
    await deleteRange(table, start, end);
    done += end - start + 1;
    process.stdout.write(`\r${table}: ${done.toLocaleString()} / ${total.toLocaleString()} ids processed`);
  }
  process.stdout.write('\n');
}

async function countTable(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=id`;
  const res = await fetch(url, {
    headers: { ...headers, Prefer: 'count=exact' },
  });
  if (!res.ok) return 'unknown';
  const range = res.headers.get('content-range') || '';
  const total = range.includes('/') ? range.split('/')[1] : 'unknown';
  return total;
}

async function main() {
  console.log('Wiping Supabase tables...');
  for (const table of tables) {
    await wipeTable(table);
  }

  console.log('\nPost-wipe counts:');
  for (const table of tables) {
    const count = await countTable(table);
    console.log(`- ${table}: ${count}`);
  }
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
