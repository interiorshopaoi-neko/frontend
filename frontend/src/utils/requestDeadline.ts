// ──────────────────────────────────────────────────────────────────────────────
// requestDeadline.ts
// 見積もり依頼の「募集確認予定日」を計算するユーティリティ。
//
// 仕様:
//   - 投稿から 5日後 を募集確認予定日とする
//   - UI 上の表示だけ。応募停止・強制終了は行わない。
//   - created_at はタイムゾーン付きまたは UTC なし文字列の両方に対応。
// ──────────────────────────────────────────────────────────────────────────────

const DEADLINE_DAYS = 5;

/** タイムゾーン付き or なし の ISO 文字列を UTC ms に変換 */
function parseMs(createdAt: string): number {
  if (createdAt.endsWith('Z') || createdAt.includes('+')) {
    return new Date(createdAt).getTime();
  }
  // TZ なし = DB が UTC で保存 → 末尾 'Z' を付与して UTC として解釈
  return new Date(createdAt + 'Z').getTime();
}

/** 投稿から DEADLINE_DAYS 日後の Date を返す */
export function getRequestDeadline(createdAt: string): Date {
  return new Date(parseMs(createdAt) + DEADLINE_DAYS * 86_400_000);
}

/** 期限切れかどうか（UI 表示用。応募停止ではない） */
export function isRequestExpired(createdAt: string): boolean {
  return Date.now() > getRequestDeadline(createdAt).getTime();
}

/**
 * 残り時間のラベルを返す。
 *   3日以上 → '残り N 日'
 *   1〜3日  → '残り N 日'（警告色へ移行の目安）
 *   24h未満 → '残り N 時間'
 *   期限当日 → '本日確認予定'
 *   期限超過 → '募集確認時期を過ぎています'
 */
export function getRemainingLabel(createdAt: string): string {
  const deadline = getRequestDeadline(createdAt).getTime();
  const remainMs = deadline - Date.now();

  if (remainMs <= 0) return '募集確認時期を過ぎています';

  const remainH = remainMs / 3_600_000;

  if (remainH < 12) return '本日確認予定';
  if (remainH < 24) return `残り${Math.ceil(remainH)}時間`;

  const remainDays = Math.ceil(remainH / 24);
  return `残り${remainDays}日`;
}

/**
 * 色区分を返す（Tailwind クラス用）。
 *   'fresh'   → 3日以上残り（slate/blue 系）
 *   'warning' → 1〜2日（amber 系）
 *   'expired' → 期限超過（slate/gray 系）
 */
export type DeadlineLevel = 'fresh' | 'warning' | 'expired';

export function getDeadlineLevel(createdAt: string): DeadlineLevel {
  const deadline = getRequestDeadline(createdAt).getTime();
  const remainMs = deadline - Date.now();
  if (remainMs <= 0) return 'expired';
  if (remainMs < 2 * 86_400_000) return 'warning';   // 2日未満
  return 'fresh';
}
