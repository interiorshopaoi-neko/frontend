// ================================================================
// GET /api/health
//
// Vercel serverless function が生きているかを確認するシンプルな
// ヘルスチェックエンドポイント。DB接続は行わない。
//
// レスポンス例:
//   { "ok": true, "service": "PRO MATCH", "time": "...", "env": "production" }
// ================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  return res.status(200).json({
    ok:      true,
    service: 'PRO MATCH',
    time:    new Date().toISOString(),
    env:     process.env.NODE_ENV ?? 'unknown',
  });
}
