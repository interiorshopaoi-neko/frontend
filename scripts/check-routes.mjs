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

// 7. AuthConfirmed は /login へ誘導する（直接 craftsman ページには飛ばない設計）
//    Supabase token ≠ localStorage token のため、メール認証後は必ず /login を経由させる
{
  const src = read('frontend/src/pages/auth/AuthConfirmed.tsx');
  const toLogin = /navigate\(\s*['"`]\/login/.test(src);
  const toBare  = /['"`]\/craftsman['"`]/.test(src);
  check('AuthConfirmed redirects to /login (not directly to craftsman pages)', toLogin);
  check('AuthConfirmed does NOT redirect to bare /craftsman', !toBare, toBare ? 'found /craftsman bare string' : '');
}

// 8. /pro/jobs → /craftsman/jobs redirect
{
  const src = read('frontend/src/App.tsx');
  const ok = /path="\/pro\/jobs"\s+element=\{<Navigate\s+to="\/craftsman\/jobs"/.test(src);
  check('/pro/jobs redirects to /craftsman/jobs', ok);
}

// 9. /demo → production では / へ redirect（import.meta.env.PROD ガードあり）
{
  const src = read('frontend/src/App.tsx');
  // path="/demo" の element に import.meta.env.PROD チェックが含まれていること
  const demoBlock = src.match(/path="\/demo"[\s\S]*?element=\{([\s\S]*?)\}/)?.[1] ?? '';
  const hasProdGuard = /import\.meta\.env\.PROD/.test(demoBlock);
  const hasRootRedirect = /Navigate.*to="\/"\s*replace/.test(demoBlock);
  check('/demo has production guard (import.meta.env.PROD)', hasProdGuard, !hasProdGuard ? 'no PROD check found' : '');
  check('/demo redirects to "/" in production', hasRootRedirect, !hasRootRedirect ? 'no Navigate to="/" found' : '');
}

// 10. CraftsmanDashboardPage — 未認証時に navigate('/login') を呼ぶ（DEMO に落ちない）
{
  const src = read('frontend/src/pages/craftsman/CraftsmanDashboardPage.tsx');
  // !userId ブランチに navigate('/login') があること
  const hasLoginRedirect = /if\s*\(!userId\)[\s\S]{0,300}navigate\(['"`]\/login['"`]\)/.test(src);
  // DEMO setIsDemo(true) は DEV ガード内のみ（本番でむき出しの setIsDemo(true) がない）
  const bareSetIsDemo = src.match(/setIsDemo\(true\)/g) ?? [];
  const devGuardedIsDemo = src.match(/import\.meta\.env\.DEV[\s\S]{0,300}setIsDemo\(true\)/g) ?? [];
  const hasBareDemoFallback = bareSetIsDemo.length > devGuardedIsDemo.length;
  check('CraftsmanDashboardPage: !userId → navigate("/login")', hasLoginRedirect);
  check('CraftsmanDashboardPage: setIsDemo(true) は DEV guard 内のみ', !hasBareDemoFallback,
    hasBareDemoFallback ? `setIsDemo(true) が DEV guard 外に ${bareSetIsDemo.length - devGuardedIsDemo.length} 件` : '');
}

// 11. CraftsmanApplicationsPage — 未認証時に navigate('/login') を呼ぶ（DEMO に落ちない）
{
  const src = read('frontend/src/pages/craftsman/CraftsmanApplicationsPage.tsx');
  const hasLoginRedirect = /if\s*\(!uid\)[\s\S]{0,200}navigate\(['"`]\/login['"`]\)/.test(src);
  const hasNoSetIsDemo = !/setIsDemo\(true\)/.test(src);
  check('CraftsmanApplicationsPage: !uid → navigate("/login")', hasLoginRedirect);
  check('CraftsmanApplicationsPage: setIsDemo(true) が存在しない（DEMO fallback 除去済み）', hasNoSetIsDemo,
    !hasNoSetIsDemo ? 'setIsDemo(true) が残っています' : '');
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
