#!/usr/bin/env node
/**
 * scripts/check-routes.mjs
 * PRO MATCH ルート回帰テスト
 *
 * Usage: node scripts/check-routes.mjs
 *   or:  npm run check:routes
 *
 * 以下を静的にチェックする:
 *   1. / ルートに role redirect がない（JobsHome を常に表示）
 *   2. /craftsman が /craftsman/dashboard へ Navigate
 *   3. catch-all が "/" へ Navigate（craftsman/dashboard へ飛ばさない）
 *   4. navigate('/craftsman') 裸呼び出しが残っていない
 *   5. BottomNav に href="/craftsman" がない
 *   6. CraftsmanDashboard が App.tsx に import されていない
 *   7. AuthConfirmed が /craftsman/jobs へ遷移する（/craftsman は NG）
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const FRONTEND = join(ROOT, 'frontend', 'src');

// ─── helpers ────────────────────────────────────────────────────────────────

function read(relPath) {
  return readFileSync(join(ROOT, relPath), 'utf8');
}

let failures = 0;

function pass(msg) { console.log(`  ✅  ${msg}`); }
function fail(msg) { console.error(`  ❌  ${msg}`); failures++; }

function check(label, ok, detail = '') {
  if (ok) pass(label);
  else fail(`${label}${detail ? '  ←  ' + detail : ''}`);
}

// ─── tests ──────────────────────────────────────────────────────────────────

console.log('\n🔍  PRO MATCH route regression check\n');

// 1. / ルートが常に <HomePage /> を表示 — user redirect なし
{
  const src = read('frontend/src/App.tsx');
  // The slash route should be a simple element={<HomePage />}
  // It must NOT contain "user.role" or "craftsman/dashboard" near the "/" path
  const slashRouteMatch = src.match(/path="\/"\s+element=\{(.+?)\}/s);
  if (!slashRouteMatch) {
    fail('/ route not found in App.tsx');
  } else {
    const elem = slashRouteMatch[1];
    const hasUserRedirect = /user\s*\?|Navigate/.test(elem);
    check(
      '/ route shows <HomePage /> with no role redirect',
      !hasUserRedirect,
      hasUserRedirect ? `element contains: ${elem.trim().slice(0, 80)}` : '',
    );
  }
}

// 2. /craftsman → /craftsman/dashboard redirect
{
  const src = read('frontend/src/App.tsx');
  const ok = /path="\/craftsman"\s+element=\{<Navigate\s+to="\/craftsman\/dashboard"/.test(src);
  check('/craftsman route redirects to /craftsman/dashboard', ok);
}

// 3. catch-all → Navigate to="/"
{
  const src = read('frontend/src/App.tsx');
  // Must have path="*" with Navigate to="/"
  const catchMatch = src.match(/path="\*"\s+element=\{(.+?)\}/s);
  if (!catchMatch) {
    fail('catch-all route not found in App.tsx');
  } else {
    const elem = catchMatch[1];
    const hasDashboard = /craftsman\/dashboard/.test(elem);
    const navigatesToRoot = /Navigate\s+to="\/"\s/.test(elem) || /Navigate\s+to="\/"/.test(elem);
    check('catch-all does NOT send to /craftsman/dashboard', !hasDashboard, hasDashboard ? elem.trim().slice(0, 80) : '');
    check('catch-all navigates to "/"', navigatesToRoot, !navigatesToRoot ? elem.trim().slice(0, 80) : '');
  }
}

// 4. navigate('/craftsman') 裸呼び出しがない（/craftsman/で始まるものは OK）
{
  const forbidden = /navigate\(\s*['"`]\/craftsman['"`]\s*\)/;
  const files = getAllTsxFiles(FRONTEND);
  let found = [];
  for (const f of files) {
    const content = readFileSync(f, 'utf8');
    if (forbidden.test(content)) found.push(f.replace(ROOT + '/', ''));
  }
  check(
    'No bare navigate("/craftsman") calls',
    found.length === 0,
    found.length ? found.join(', ') : '',
  );
}

// 5. BottomNav に href="/craftsman" がない
{
  const src = read('frontend/src/components/BottomNav.tsx');
  const bare = /href:\s*['"`]\/craftsman['"`]/.test(src);
  check('BottomNav has no href="/craftsman" (bare)', !bare);
}

// 6. CraftsmanDashboard (旧UI) が App.tsx に import されていない
{
  const src = read('frontend/src/App.tsx');
  const imported = /import\s+CraftsmanDashboard\b/.test(src);
  check('CraftsmanDashboard (旧UI) not imported in App.tsx', !imported);
}

// 7. AuthConfirmed が /craftsman/jobs に遷移（/craftsman だけは NG）
{
  const src = read('frontend/src/pages/auth/AuthConfirmed.tsx');
  const toJobs = /\/craftsman\/jobs/.test(src);
  const toBare  = /['"`]\/craftsman['"`]/.test(src);
  check('AuthConfirmed redirects craftsman to /craftsman/jobs', toJobs);
  check('AuthConfirmed does NOT redirect to bare /craftsman', !toBare, toBare ? 'found /craftsman bare string' : '');
}

// ─── summary ────────────────────────────────────────────────────────────────

console.log('');
if (failures === 0) {
  console.log('✅  All checks passed!\n');
} else {
  console.error(`❌  ${failures} check(s) failed.\n`);
  process.exit(1);
}

// ─── util ───────────────────────────────────────────────────────────────────

function getAllTsxFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...getAllTsxFiles(full));
    } else if (/\.(tsx|ts)$/.test(entry)) {
      results.push(full);
    }
  }
  return results;
}
