// 依頼の「部屋 × 工事 × 量」を統一フォーマットで返すヘルパー。
// 職人一覧・詳細・お客様管理・追加情報ページで共通使用する。

import {
  getRooms,
  getRoomWorkSummary,
  getRoomDisplayName,
  getRoomDisplaySize,
  getRoomMedia,
  getRoomAdditionalInfo,
  type RoomMeta,
} from '../lib/requestMeta';

export type RoomWorkSummary = {
  name:       string;   // 寝室, LDK, …
  workParts:  string[]; // ['クロス：壁＋天井', '床：クッションフロア']
  size:       string;   // '10畳', ''
  conditions: string[]; // ['めくれ', 'ペット臭']
};

// 全部屋のサマリー配列を返す
export function getRoomWorkSummaries(meta: unknown): RoomWorkSummary[] {
  return getRooms(meta).map(room => ({
    name:       getRoomDisplayName(room),
    workParts:  getRoomWorkSummary(room),
    size:       getRoomDisplaySize(room),
    conditions: room.condition ?? [],
  }));
}

// カード見出し用：最も重要な1行
// 例: "寝室｜クロス：壁＋天井｜10畳"  /  "2部屋の工事"  /  "メインのお部屋｜クロス張り替え"
export function getPrimaryWorkLine(meta: unknown, fallbackWorkType?: string): string {
  const rooms = getRoomWorkSummaries(meta);
  if (rooms.length === 0) {
    return `メインのお部屋｜${fallbackWorkType ?? 'クロス張り替え'}`;
  }
  if (rooms.length === 1) {
    const r = rooms[0];
    const parts = [r.name];
    if (r.workParts.length > 0) parts.push(r.workParts.join('・'));
    if (r.size) parts.push(r.size);
    return parts.join('｜');
  }
  return `${rooms.length}部屋の工事`;
}

// 部屋名のみ（カードヘッダー）
export function getRoomWorkTitle(room: RoomMeta): string {
  return getRoomDisplayName(room);
}

// 工事内容・サイズ・状態をまとめた1行（カード詳細）
// 例: "クロス：壁＋天井｜10畳｜めくれあり"
export function getRoomWorkDetail(room: RoomMeta): string {
  const parts: string[] = [];
  const workParts = getRoomWorkSummary(room);
  if (workParts.length > 0) parts.push(workParts.join('・'));
  const size = getRoomDisplaySize(room);
  if (size) parts.push(size);
  const conds = room.condition ?? [];
  if (conds.length > 0) parts.push(conds.join('・'));
  return parts.join('｜');
}

// ── Phase 5 helpers ───────────────────────────────────────────────────────────

// "2部屋" / "1部屋" / "" (0部屋の場合は空文字)
export function getRoomCountLabel(meta: unknown): string {
  const count = getRooms(meta).length;
  return count > 0 ? `${count}部屋` : '';
}

// 全部屋を1行テキストで列挙 (例: "寝室・LDK・洋室")
export function getRoomNamesLabel(meta: unknown): string {
  return getRooms(meta).map(r => getRoomDisplayName(r)).join('・');
}

// メディア有無を文字列で返す ("動画・写真あり" / "動画あり" / "写真あり" / "")
// opts: job列から取れる video_url, has_video, has_photos も渡せる
export function getMediaSummary(
  meta: unknown,
  opts?: { videoUrl?: string | null; hasVideo?: boolean; hasPhotos?: boolean },
): string {
  const roomMedia = getRoomMedia(meta);
  const rai       = getRoomAdditionalInfo(meta);
  const raiVals   = Object.values(rai);

  const hasVideo =
    !!opts?.hasVideo ||
    !!opts?.videoUrl ||
    roomMedia.some(rm => rm.videos.length > 0) ||
    raiVals.some(e => !!e.videoUrl);

  const hasPhoto =
    !!opts?.hasPhotos ||
    roomMedia.some(rm => rm.images.length > 0) ||
    raiVals.some(e => (e.photos?.length ?? 0) > 0);

  if (hasVideo && hasPhoto) return '動画・写真あり';
  if (hasVideo)             return '動画あり';
  if (hasPhoto)             return '写真あり';
  return '';
}

// roomAdditionalInfo の補足情報サマリー ("品番指定あり・メモあり・追加部屋あり" など)
export function getAdditionalInfoSummary(meta: unknown): string {
  const entries = Object.values(getRoomAdditionalInfo(meta));
  const parts: string[] = [];
  if (entries.some(e => !!e.productNumber))   parts.push('品番指定あり');
  if (entries.some(e => !!e.note))            parts.push('メモあり');
  if (entries.some(e => e.addedByCustomer))   parts.push('追加部屋あり');
  return parts.join('・');
}
