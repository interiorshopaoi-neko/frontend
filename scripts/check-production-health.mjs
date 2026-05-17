#!/usr/bin/env node
/**
 * check-production-health.mjs
 *
 * 【目的】
 * 本番 (https://promatch-app.jp) の主要 API が 405 になっていないことを確認する。
 * 実送信・DB書き換えは行わない。
 *
 * 【使い方】
 *   node scripts/check-production-health.mjs
 *   npm run check:production-health       # frontend/ から実行する場合
 *
 * 【注意】
 *   - 実際のメール送信は行わない（status 確認のみ）
 *   - 本番 DB への書き込みは行わない
 *   - 認証情報はダミー値を使用する
 */

const BASE_URL = 'https://promatch-app.jp';

// ── チェック定義 ─────────────────────────────────────────────────────────────
const checks = [
  {
    name: 'POST /api/auth/login (wrong creds → 401 expected)',
    method: 'POST',
    path: '/api/auth/login',
    body: { email: 'healthcheck@example.com', password: 'wrong-password-healthcheck' },
    // 401 = 認証処理に到達した（serverless function が動いている）
    // 405 = serverless function が存在しない（NG）
    acceptedStatuses: [401, 400],
    blockedStatuses:  [405],
  },
  {
    name: 'POST /api/auth/register (missing fields → 400 expected)',
    method: 'POST',
    path: '/api/auth/register',
    body: {},
    acceptedStatuses: [400, 422],
    blockedStatuses:  [405],
  },
  {
    name: 'POST /api/notify (missing fields → 400 expected)',
    method: 'POST',
    path: '/api/notify',
    body: {},
    acceptedStatuses: [200, 400, 422, 500],
    blockedStatuses:  [405],
  },
];

// ── 実行 ─────────────────────────────────────────────────────────────────────
let hasError = false;

console.log('\n🏥 Production Health Check');
console.log(`   Target: ${BASE_URL}`);
console.log('='.repeat(60));

for (const check of checks) {
  const url = `${BASE_URL}${check.path}`;
  let status;
  try {
    const res = await fetch(url, {
      method: check.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(check.body),
    });
    status = res.status;
  } catch (err) {
    console.log(`  ❌ ERROR  ${check.name}`);
    console.log(`           fetch failed: ${err.message}`);
    hasError = true;
    continue;
  }

  const blocked = check.blockedStatuses.includes(status);
  const accepted = check.acceptedStatuses.includes(status);

  if (blocked) {
    console.log(`  ❌ ${status}    ${check.name}`);
    console.log(`           → ${status} は NG。root api/ に serverless function がない可能性があります`);
    hasError = true;
  } else if (accepted) {
    console.log(`  ✅ ${status}    ${check.name}`);
  } else {
    console.log(`  ⚠️  ${status}    ${check.name}`);
    console.log(`           → 想定外のステータス。Vercel ログを確認してください`);
  }
}

console.log('='.repeat(60));
if (hasError) {
  console.log('❌ 本番で問題が検出されました。Vercel ダッシュボードとログを確認してください。');
  process.exit(1);
} else {
  console.log('✅ 本番ヘルスチェック通過。主要 API は 405 ではありません。');
  process.exit(0);
}
