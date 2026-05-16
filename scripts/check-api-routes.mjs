#!/usr/bin/env node
/**
 * check-api-routes.mjs
 *
 * フロントエンドソース内の /api/... 呼び出しを抽出し、
 * root api/ に対応する serverless function が存在するか確認する。
 *
 * 使い方:
 *   node scripts/check-api-routes.mjs
 *   npm run check:api-routes   (package.json に登録済みの場合)
 *
 * Vercel は root api/ のみを serverless function として認識する。
 * frontend/api/ に置いても本番では /api/... にならない（405 になる）。
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve, relative } from 'path';

// process.cwd() を基点にする（import.meta.url は日本語パスでパーセントエンコードされるため）
// このスクリプトはリポジトリ root から実行: node scripts/check-api-routes.mjs
const ROOT        = resolve(process.cwd());
const SRC_DIR     = join(ROOT, 'frontend', 'src');
const ROOT_API    = join(ROOT, 'api');

// ── root api/ の全エンドポイントを収集 ─────────────────────────────────────
function collectRootApiRoutes(dir, prefix = '') {
  const routes = new Set();
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st   = statSync(full);
    if (st.isDirectory()) {
      collectRootApiRoutes(full, `${prefix}/${entry}`).forEach(r => routes.add(r));
    } else if (entry.endsWith('.ts') || entry.endsWith('.js')) {
      const name = entry.replace(/\.(ts|js)$/, '');
      routes.add(`${prefix}/${name}`);
    }
  }
  return routes;
}

// ── frontend/src 内の /api/... 呼び出しを収集 ───────────────────────────────
function collectApiCalls(dir) {
  const calls = new Map(); // endpoint → Set<sourceFile>
  const pattern = /(?:fetch|api\.(?:get|post|put|delete|patch))\s*\(\s*['"`]([^'"`]+)['"`]/g;

  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      const st   = statSync(full);
      if (st.isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry)) {
        const src = readFileSync(full, 'utf8');
        let m;
        while ((m = pattern.exec(src)) !== null) {
          const path = m[1];
          // /api/... または axios の baseURL=/api の相対パス（/auth/... など）
          let endpoint = null;
          if (path.startsWith('/api/')) {
            endpoint = path.replace('/api', '');
          } else if (!path.startsWith('/') && !path.startsWith('http')) {
            // 相対パス: axios baseURL = /api
            endpoint = '/' + path;
          } else if (path.startsWith('/') && !path.startsWith('/api')) {
            // /auth/register など axios 経由の相対パス
            endpoint = path;
          }
          if (endpoint) {
            // クエリパラメータを除去
            const clean = endpoint.split('?')[0].replace(/\/:[^/]+/g, '/:param').replace(/\/\d+/g, '/:id');
            if (!calls.has(clean)) calls.set(clean, new Set());
            calls.get(clean).add(relative(ROOT, full));
          }
        }
        pattern.lastIndex = 0; // Reset for reuse
      }
    }
  }
  walk(dir);
  return calls;
}

// ── チェック対象外の除外パターン ────────────────────────────────────────────
// 静的ファイルやコメントアウト済みのパスは除外
// ── Legacy routes: Supabase 直接統合前の旧 REST API 呼び出し ─────────────────
// これらは serverless function が存在せず、本番では動作しない。
// NewEstimate / EstimateDetail / ReviewEstimate の一部機能は legacy のまま。
// 将来 Supabase client に完全移行するまでの既知の問題として記録する。
const LEGACY_NOTE = new Set([
  '/estimates/my',
  '/estimates/craftsman',
  '/estimates',
  '/estimates/:param',
  '/estimates/:id',
  '/estimates/${id}',
  '/estimates/${id}/book',
  '/estimates/${id}/confirm',
  '/estimates/${id}/reject',
  '/estimates/${id}/photos',
  '/estimates/:param/book',
  '/estimates/:param/confirm',
  '/estimates/:param/reject',
  '/estimates/:param/photos',
  '/bookings',
]);

// ── メイン ──────────────────────────────────────────────────────────────────
const rootRoutes = collectRootApiRoutes(ROOT_API);
const apiCalls   = collectApiCalls(SRC_DIR);

let hasError = false;

console.log('\n📡 Vercel API Route Check');
console.log('='.repeat(60));
console.log(`Root api/ routes: ${rootRoutes.size}`);
console.log(`Frontend /api/* calls found: ${apiCalls.size}`);
console.log('');

const sorted = [...apiCalls.entries()].sort((a, b) => a[0].localeCompare(b[0]));

for (const [endpoint, files] of sorted) {
  // テンプレートリテラル内の動的セグメントを正規化
  const normalized = endpoint.replace(/\/\$\{[^}]+\}/g, '/:param');

  if (LEGACY_NOTE.has(normalized) || LEGACY_NOTE.has(endpoint)) {
    console.log(`  ⚪ LEGACY  ${endpoint}`);
    console.log(`           (serverless function なし — Supabase 直接統合前の旧 API)`);
    continue;
  }

  // root api/ に対応ファイルがあるか確認
  // /auth/login → api/auth/login.ts
  const exists = rootRoutes.has(normalized) || [...rootRoutes].some(r => {
    // /:param の柔軟マッチ
    const rParts = r.split('/');
    const eParts = normalized.split('/');
    if (rParts.length !== eParts.length) return false;
    return rParts.every((p, i) => p === eParts[i] || eParts[i] === ':param' || p === ':param');
  });

  if (exists) {
    console.log(`  ✅ OK      ${endpoint}`);
  } else {
    console.log(`  ⚠️  MISSING ${endpoint}`);
    console.log(`           呼び出し元: ${[...files].slice(0, 2).join(', ')}${files.size > 2 ? ' ...' : ''}`);
    console.log(`           → root api${normalized}.ts を作成してください`);
    hasError = true;
  }
}

console.log('');
console.log('Root api/ に存在する function 一覧:');
for (const r of [...rootRoutes].sort()) {
  console.log(`  📄 /api${r}`);
}

console.log('');
if (hasError) {
  console.log('❌ 上記の MISSING を修正してからデプロイしてください。');
  console.log('   frontend/api/ にも同名ファイルがある場合は root api/ にコピーしてください。');
  process.exit(1);
} else {
  console.log('✅ 全ての /api/* 呼び出しが root api/ に対応しています。');
}
