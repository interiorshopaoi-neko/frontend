#!/usr/bin/env node
/**
 * check-api-routes.mjs
 *
 * 【目的】
 * 1. フロントから呼ばれる /api/* に対応する root api/ function が存在するか確認
 * 2. frontend/api/ にのみ存在する危険なファイルを検出（本番では動かない）
 * 3. root api/ と frontend/api/ の同期ズレを検出
 *
 * 【使い方】
 *   node scripts/check-api-routes.mjs          # root から実行
 *   npm run check:api-routes                   # frontend/ ディレクトリから実行する場合
 *
 * 【重要】
 *   Vercel は root api/ のみを serverless function として認識する。
 *   frontend/api/ に置いても本番では /api/... にならない（405 になる）。
 *   インシデント #7 参照: docs/INCIDENTS.md
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, relative } from 'path';

const ROOT         = resolve(process.cwd());
const SRC_DIR      = join(ROOT, 'frontend', 'src');
const ROOT_API     = join(ROOT, 'api');
const FRONTEND_API = join(ROOT, 'frontend', 'api');

// ── root api/ の全ファイルを収集 ────────────────────────────────────────────
function collectApiFiles(dir, prefix = '') {
  const files = new Map(); // route → fullPath
  let entries;
  try { entries = readdirSync(dir); } catch { return files; }
  for (const entry of entries) {
    if (entry === 'WARNING.md' || entry.endsWith('.md')) continue;
    const full = join(dir, entry);
    const st   = statSync(full);
    if (st.isDirectory()) {
      collectApiFiles(full, `${prefix}/${entry}`).forEach((v, k) => files.set(k, v));
    } else if (entry.endsWith('.ts') || entry.endsWith('.js')) {
      const name = entry.replace(/\.(ts|js)$/, '');
      files.set(`${prefix}/${name}`, full);
    }
  }
  return files;
}

// ── frontend/src 内の /api/* 呼び出しを収集 ─────────────────────────────────
function collectApiCalls(dir) {
  const calls = new Map(); // endpoint → Set<sourceFile>
  const pattern = /(?:fetch|api\.(?:get|post|put|delete|patch))\s*\(\s*['"`]([^'"`]+)['"`]/g;

  function walk(d) {
    let entries;
    try { entries = readdirSync(d); } catch { return; }
    for (const entry of entries) {
      const full = join(d, entry);
      const st   = statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry)) {
        const src = readFileSync(full, 'utf8');
        let m;
        while ((m = pattern.exec(src)) !== null) {
          const path = m[1];
          let endpoint = null;
          if (path.startsWith('/api/')) {
            endpoint = path.replace('/api', '');
          } else if (!path.startsWith('/') && !path.startsWith('http')) {
            endpoint = '/' + path;
          } else if (path.startsWith('/') && !path.startsWith('/api')) {
            endpoint = path;
          }
          if (endpoint) {
            const clean = endpoint.split('?')[0];
            if (!calls.has(clean)) calls.set(clean, new Set());
            calls.get(clean).add(relative(ROOT, full));
          }
        }
        pattern.lastIndex = 0;
      }
    }
  }
  walk(dir);
  return calls;
}

// ── Legacy: Supabase 直接統合前の旧 REST API ────────────────────────────────
// serverless function が存在しないが既知の問題として記録済み
const LEGACY_ROUTES = new Set([
  '/estimates', '/estimates/my', '/estimates/craftsman',
  '/estimates/:id', '/estimates/${id}',
  '/estimates/:id/book',    '/estimates/${id}/book',
  '/estimates/:id/confirm', '/estimates/${id}/confirm',
  '/estimates/:id/reject',  '/estimates/${id}/reject',
  '/estimates/:id/photos',  '/estimates/${id}/photos',
  '/bookings',
]);

function normalize(ep) {
  return ep
    .split('?')[0]
    .replace(/\/\$\{[^}]+\}/g, '/:param')
    .replace(/\/\d+/g, '/:id');
}

function routeExists(normalized, rootRoutes) {
  if (rootRoutes.has(normalized)) return true;
  return [...rootRoutes.keys()].some(r => {
    const rp = r.split('/');
    const ep = normalized.split('/');
    if (rp.length !== ep.length) return false;
    return rp.every((p, i) => p === ep[i] || ep[i] === ':param' || p === ':param' || ep[i] === ':id' || p === ':id');
  });
}

// ────────────────────────────────────────────────────────────────────────────

const rootFiles     = collectApiFiles(ROOT_API);
const frontendFiles = collectApiFiles(FRONTEND_API);
const apiCalls      = collectApiCalls(SRC_DIR);

let hasError   = false;
let hasWarning = false;

// ─── セクション1: フロント呼び出し vs root api/ ───────────────────────────
console.log('\n📡 Vercel API Route Check');
console.log('='.repeat(60));
console.log(`Root api/ functions:      ${rootFiles.size}`);
console.log(`Frontend api/ files:      ${frontendFiles.size} (本番では動かない)`);
console.log(`Frontend /api/* calls:    ${apiCalls.size}`);
console.log('');
console.log('── [1] フロント呼び出し → root api/ 対応確認 ──────────────────');

const sorted = [...apiCalls.entries()].sort((a, b) => a[0].localeCompare(b[0]));
for (const [endpoint, files] of sorted) {
  const norm = normalize(endpoint);
  if (LEGACY_ROUTES.has(norm) || LEGACY_ROUTES.has(endpoint)) {
    console.log(`  ⚪ LEGACY  ${endpoint}`);
    continue;
  }
  if (routeExists(norm, rootFiles)) {
    console.log(`  ✅ OK      ${endpoint}`);
  } else {
    console.log(`  ❌ MISSING ${endpoint}`);
    console.log(`             呼び出し元: ${[...files].slice(0, 2).join(', ')}${files.size > 2 ? ' ...' : ''}`);
    console.log(`             → root api${norm}.ts を作成してください`);
    hasError = true;
  }
}

// ─── セクション2: frontend/api/ にしか存在しないファイル ─────────────────
console.log('');
console.log('── [2] frontend/api/ にしかない危険ファイル ───────────────────');

const frontendOnly = [...frontendFiles.keys()].filter(k => !rootFiles.has(k)).sort();
if (frontendOnly.length === 0) {
  console.log('  ✅ なし（frontend/api/ の全ファイルは root api/ に存在します）');
} else {
  for (const route of frontendOnly) {
    console.log(`  ⚠️  FRONTEND-ONLY  /api${route}`);
    console.log(`               → 本番では動きません。root api${route}.ts を作成してください`);
    hasWarning = true;
  }
}

// ─── セクション3: 同期ズレ（内容が異なるファイル） ────────────────────────
console.log('');
console.log('── [3] root api/ と frontend/api/ の同期状態 ──────────────────');

const common = [...rootFiles.keys()].filter(k => frontendFiles.has(k)).sort();
let syncIssues = 0;
for (const route of common) {
  const rootContent     = readFileSync(rootFiles.get(route), 'utf8');
  const frontendContent = readFileSync(frontendFiles.get(route), 'utf8');
  if (rootContent !== frontendContent) {
    console.log(`  ⚠️  OUT-OF-SYNC  /api${route}`);
    console.log(`               root api/ と frontend/api/ の内容が異なります`);
    console.log(`               source of truth は root api/ です`);
    syncIssues++;
    hasWarning = true;
  }
}
if (syncIssues === 0) {
  console.log('  ✅ 全ての共通ファイルが同期されています');
}

// ─── セクション4: root api/ 一覧 ─────────────────────────────────────────
console.log('');
console.log('── [4] root api/ function 一覧（本番で有効） ──────────────────');
for (const r of [...rootFiles.keys()].sort()) {
  console.log(`  📄 /api${r}`);
}

// ─── 最終判定 ────────────────────────────────────────────────────────────
console.log('');
console.log('='.repeat(60));
if (hasError) {
  console.log('❌ MISSING エンドポイントがあります。デプロイ前に root api/ に追加してください。');
  process.exit(1);
} else if (hasWarning) {
  console.log('⚠️  WARNING があります。frontend/api/ の整理を推奨します。');
  console.log('   デプロイは可能ですが、以下を確認してください:');
  console.log('   - FRONTEND-ONLY: root api/ へのコピー忘れがないか');
  console.log('   - OUT-OF-SYNC: frontend/api/ を編集して root api/ への反映を忘れていないか');
  process.exit(0);
} else {
  console.log('✅ 全チェック通過。デプロイ安全です。');
  process.exit(0);
}
