import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  to: string;
  work_type: string;
  area: string;
  room_type?: string;
  room_size?: string;
  rooms?: string;
  size_note?: string;
  timing?: string;
  has_video?: boolean;
  has_photos?: boolean;
  has_floor_plan?: boolean;
}

// ─── 概算目安ロジック ─────────────────────────────────────────────────────────
// ※ 参考目安のみ。正確な見積もりではありません。

function calcEstimate(
  workType: string,
  roomSize: string | undefined,
  sizeNote: string | undefined,
  rooms: string | undefined,
): { low: number; high: number } | null {
  // 工事種別ベース単価（万円/1部屋あたり）
  const baseMap: Array<[string, [number, number]]> = [
    ['フローリング', [8, 15]],
    ['床工事',       [6, 12]],
    ['クロス',       [3,  6]],
    ['壁紙',         [3,  6]],
    ['CF',           [3,  8]],
    ['クッションフロア', [3, 8]],
    ['床',           [5, 10]],
    ['補修',         [2,  5]],
    ['塗装',         [4,  9]],
    ['タイル',       [5, 12]],
  ];

  let base: [number, number] = [3, 8]; // その他デフォルト
  for (const [key, val] of baseMap) {
    if (workType.includes(key)) { base = val; break; }
  }

  // サイズ補正（room_size または size_note から読み取る）
  const sizeStr = (roomSize ?? sizeNote ?? '');
  let sizeMult = 1.0;
  if (/6畳以下|〜6|狭|小|コンパクト/.test(sizeStr))          sizeMult = 0.7;
  else if (/LDK|ＬＤＫ|16畳|18畳|20畳|広め|大/.test(sizeStr)) sizeMult = 1.6;
  else if (/12畳|14畳/.test(sizeStr))                         sizeMult = 1.3;
  else if (/8畳|10畳/.test(sizeStr))                          sizeMult = 1.0;

  // 部屋数補正
  const roomsNum = parseInt(rooms ?? '1') || 1;
  const roomsMult = roomsNum >= 3 ? 2.5 : roomsNum === 2 ? 1.8 : 1.0;

  const low  = Math.max(2, Math.round(base[0] * sizeMult * roomsMult));
  const high = Math.max(3, Math.round(base[1] * sizeMult * roomsMult));
  return { low, high };
}

function buildSalesCard(estimate: { low: number; high: number } | null): string {
  if (!estimate) return '';
  const { low, high } = estimate;
  const range = low === high ? `約${low}万円前後` : `約${low}〜${high}万円前後`;
  return `
          <!-- 想定売上目安カード -->
          <tr>
            <td style="padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:linear-gradient(135deg,#fefce8 0%,#fef9c3 100%);border:1.5px solid #fde68a;border-radius:14px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px 6px;">
                    <span style="display:inline-block;background:#f59e0b;color:#ffffff;font-size:11px;font-weight:700;padding:4px 12px;border-radius:100px;letter-spacing:0.06em;">
                      💰 &nbsp;想定売上目安
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 24px 4px;">
                    <p style="margin:0;font-size:26px;font-weight:800;color:#1e293b;letter-spacing:-0.02em;line-height:1.2;">
                      ${range}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 24px 16px;">
                    <p style="margin:0 0 4px;font-size:13px;color:#78350f;">
                      📍 近場で対応できる可能性がある案件です
                    </p>
                    <p style="margin:0;font-size:13px;color:#78350f;">
                      🕐 早めの確認がおすすめです
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 24px 14px;">
                    <p style="margin:0;font-size:10px;color:#a16207;">
                      ※ 現場状況・仕様により変動します。参考目安です。
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function row(label: string, value: string | undefined): string {
  if (!value) return '';
  return `
    <tr>
      <td style="padding:12px 20px;border-bottom:1px solid #e2e8f0;">
        <span style="font-size:11px;color:#94a3b8;font-weight:700;display:block;margin-bottom:3px;">${label}</span>
        <span style="font-size:14px;color:#1e293b;font-weight:600;">${value}</span>
      </td>
    </tr>`;
}

function buildMediaBadges(hasVideo: boolean, hasPhotos: boolean, hasFloorPlan: boolean): string {
  const badges: string[] = [];
  if (hasVideo)     badges.push('▶ 動画あり');
  if (hasPhotos)    badges.push('📷 写真あり');
  if (hasFloorPlan) badges.push('📐 図面あり');
  if (badges.length === 0) return '';
  return `
    <tr>
      <td style="padding:12px 20px;border-bottom:1px solid #e2e8f0;">
        <span style="font-size:11px;color:#94a3b8;font-weight:700;display:block;margin-bottom:6px;">資料</span>
        <span style="font-size:13px;color:#1e293b;">${badges.join('　')}</span>
      </td>
    </tr>`;
}

function buildHtml(
  workType: string,
  area: string,
  roomType: string | undefined,
  timing: string | undefined,
  hasVideo: boolean,
  hasPhotos: boolean,
  hasFloorPlan: boolean,
  ctaUrl: string,
  logoUrl: string,
  estimate: { low: number; high: number } | null,
): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>対応できそうな新着案件があります</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- ヘッダー -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af 0%,#2563eb 100%);padding:36px 32px 32px;text-align:center;">
              <img
                src="${logoUrl}"
                alt="PRO MATCH"
                width="140"
                style="display:block;margin:0 auto 20px;height:auto;"
                onerror="this.style.display='none'"
              />
              <h1 style="margin:0;font-size:21px;font-weight:800;color:#ffffff;line-height:1.45;letter-spacing:-0.01em;">
                対応できそうな新着案件があります
              </h1>
              <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">
                内装職人マッチングサービス
              </p>
            </td>
          </tr>

          <!-- 新着バッジ -->
          <tr>
            <td style="padding:28px 32px 0;text-align:center;">
              <span style="display:inline-block;background:#dbeafe;color:#1e40af;font-size:13px;font-weight:700;padding:8px 20px;border-radius:100px;letter-spacing:0.04em;">
                🔔 &nbsp;新着案件
              </span>
            </td>
          </tr>

          ${buildSalesCard(estimate)}

          <!-- 案件概要カード -->
          <tr>
            <td style="padding:20px 32px 0;">
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;">案件概要</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                ${row('施工内容', workType)}
                ${row('エリア', area)}
                ${row('部屋タイプ', roomType)}
                ${row('希望時期', timing)}
                ${buildMediaBadges(hasVideo, hasPhotos, hasFloorPlan)}
              </table>
            </td>
          </tr>

          <!-- CTAボタン -->
          <tr>
            <td style="padding:28px 32px 0;">
              <a href="${ctaUrl}"
                style="display:block;background:#2563eb;color:#ffffff;text-align:center;padding:16px 24px;border-radius:12px;font-size:16px;font-weight:800;text-decoration:none;letter-spacing:0.02em;">
                案件の詳細を確認する →
              </a>
            </td>
          </tr>

          <!-- 注意事項 -->
          <tr>
            <td style="padding:24px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #d1fae5;border-radius:12px;">
                <tr><td style="padding:6px 18px;">
                  <p style="margin:0;font-size:13px;color:#065f46;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp; 応募だけでは料金は発生しません</p>
                </td></tr>
                <tr><td style="padding:6px 18px;">
                  <p style="margin:0;font-size:13px;color:#065f46;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp; 手数料は工事成立時にのみ確定します</p>
                </td></tr>
                <tr><td style="padding:6px 18px 12px;">
                  <p style="margin:0;font-size:13px;color:#065f46;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp; 依頼者の連絡先はマッチング後に開示されます</p>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- フッター -->
          <tr>
            <td style="padding:32px;text-align:center;border-top:1px solid #f1f5f9;margin-top:8px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#64748b;">PRO MATCH</p>
              <p style="margin:0;font-size:11px;color:#94a3b8;">内装工事の見積もりマッチングサービス</p>
              <p style="margin:10px 0 0;font-size:11px;color:#cbd5e1;">このメールは PRO MATCH から自動送信されています。</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'noreply@promatch-app.jp';

    if (!resendKey) {
      console.warn('[send-craftsman-notification] RESEND_API_KEY が未設定のためスキップ');
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const payload: Payload = await req.json();
    const { to, work_type, area, room_type, room_size, rooms, size_note, timing, has_video = false, has_photos = false, has_floor_plan = false } = payload;

    if (!to || !to.includes('@')) {
      console.error('[send-craftsman-notification] 無効なメールアドレス:', to);
      return new Response(JSON.stringify({ error: 'invalid email' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const logoUrl  = 'https://promatch-app.jp/logo-full.png';
    const ctaUrl   = 'https://promatch-app.jp/craftsman/jobs';
    const estimate = calcEstimate(work_type, room_size, size_note, rooms);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `PRO MATCH（内装職人マッチング） <${fromEmail}>`,
        to: [to],
        subject: '【PRO MATCH】対応できそうな新着案件があります',
        html: buildHtml(work_type, area, room_type, timing, has_video, has_photos, has_floor_plan, ctaUrl, logoUrl, estimate),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[send-craftsman-notification] Resend error:', res.status, body);
      return new Response(JSON.stringify({ error: 'resend failed', status: res.status }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    console.log('[send-craftsman-notification] 送信成功:', data.id, 'to:', to);
    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[send-craftsman-notification] 予期しないエラー:', err);
    return new Response(JSON.stringify({ error: 'unexpected error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
