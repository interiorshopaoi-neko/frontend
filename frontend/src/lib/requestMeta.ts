// Safe meta accessors for estimate_requests.meta (JSONB).
// All functions tolerate null / undefined / legacy formats without throwing.

export type RoomMeta = {
  name?: string;
  customName?: string;
  workType?: string;
  wallWorkScope?: string;  // 'wall' | 'ceiling' | 'wall_ceiling' | ''
  floorWork?: boolean;     // クッションフロア ON/OFF
  size?: string;
  customSize?: string;
  condition?: string[];
  materialPref?: string;
};

function asMeta(meta: unknown): Record<string, unknown> | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  return meta as Record<string, unknown>;
}

export function getWallpaperPreference(meta: unknown): string | null {
  const m = asMeta(meta);
  if (!m) return null;
  const v = m.wallpaper_preference;
  return typeof v === 'string' && v ? v : null;
}

export function getWallpaperAccentPreferences(meta: unknown): string[] {
  const m = asMeta(meta);
  if (!m) return [];
  const v = m.wallpaper_accent_preferences;
  if (!Array.isArray(v)) return [];
  return v.filter((s): s is string => typeof s === 'string');
}

export function getRooms(meta: unknown): RoomMeta[] {
  const m = asMeta(meta);
  if (!m) return [];
  if (!Array.isArray(m.rooms)) return [];
  return (m.rooms as unknown[]).filter(
    (r): r is RoomMeta => !!r && typeof r === 'object' && !Array.isArray(r),
  );
}

export function hasCeilingWork(meta: unknown): boolean {
  return getRooms(meta).some(
    r => r.workType === '天井クロス' || r.workType === '壁＋天井',
  );
}

// Returns rooms that have a meaningful materialPref set
export function getMaterialPreferenceChips(meta: unknown): { room: string; pref: string }[] {
  return getRooms(meta)
    .filter(r => r.materialPref && r.materialPref !== 'まだ決まっていない' && r.materialPref !== '')
    .map(r => ({ room: r.name || '部屋', pref: r.materialPref! }));
}

// True if any room has an accent-leaning materialPref
export function hasAccentPreference(meta: unknown): boolean {
  return getRooms(meta).some(r => r.materialPref === '柄物・アクセントクロス希望');
}

// ── roomMedia (per-room video/image URLs) ─────────────────────────────────────

export type RoomMediaMeta = {
  roomId: string;
  roomName: string;
  videos: string[];
  images: string[];
};

export function getRoomMedia(meta: unknown): RoomMediaMeta[] {
  const m = asMeta(meta);
  if (!m) return [];
  const rm = m.roomMedia;
  if (!Array.isArray(rm)) return [];
  return (rm as unknown[])
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
    .map(it => ({
      roomId:   typeof it.roomId   === 'string' ? it.roomId   : '',
      roomName: typeof it.roomName === 'string' ? it.roomName : '',
      videos:   Array.isArray(it.videos) ? (it.videos as unknown[]).filter((s): s is string => typeof s === 'string') : [],
      images:   Array.isArray(it.images) ? (it.images as unknown[]).filter((s): s is string => typeof s === 'string') : [],
    }))
    .filter(item => item.videos.length > 0 || item.images.length > 0);
}

// 部屋の工事内容を表示用文字列配列で返す（新旧形式両対応）
// 新形式: wallWorkScope + floorWork → ["クロス：壁＋天井", "床：クッションフロア"]
// 旧形式: workType のみ → ["クロス：壁＋天井"] など
export function getRoomWorkSummary(room: RoomMeta): string[] {
  const parts: string[] = [];
  if (room.wallWorkScope !== undefined || room.floorWork !== undefined) {
    if (room.wallWorkScope === 'wall')              parts.push('クロス：壁');
    else if (room.wallWorkScope === 'ceiling')      parts.push('クロス：天井');
    else if (room.wallWorkScope === 'wall_ceiling') parts.push('クロス：壁＋天井');
    if (room.floorWork) parts.push('床：クッションフロア');
    if (parts.length > 0 || !room.workType) return parts;
  }
  // 旧形式フォールバック
  const wt = room.workType ?? '';
  if (wt === '壁紙・クロス')      return ['クロス：壁'];
  if (wt === '天井クロス')         return ['クロス：天井'];
  if (wt === '壁＋天井')           return ['クロス：壁＋天井'];
  if (wt === 'クッションフロア')   return ['床：クッションフロア'];
  if (wt === '両方')               return ['クロス：壁＋天井', '床：クッションフロア'];
  if (wt)                          return [wt];
  return [];
}

// Display helpers that prefer custom free-text over chip selection
export function getRoomDisplayName(room: RoomMeta, fallback = '部屋'): string {
  return room.customName || room.name || fallback;
}

export function getRoomDisplaySize(room: RoomMeta): string {
  return room.customSize || room.size || '';
}

// ── extraInfo (post-submit customer additions) ────────────────────────────────

export type ExtraInfoMeta = {
  productNumber?: string;
  productUrl?: string;
  accentPreference?: string;
  softSokibariPreference?: string;
  note?: string;
  images?: string[];
};

export function getExtraInfo(meta: unknown): ExtraInfoMeta | null {
  const m = asMeta(meta);
  if (!m) return null;
  const ei = m.extraInfo;
  if (!ei || typeof ei !== 'object' || Array.isArray(ei)) return null;
  const e = ei as Record<string, unknown>;
  return {
    productNumber:           typeof e.productNumber === 'string'           ? e.productNumber           : undefined,
    productUrl:              typeof e.productUrl    === 'string'           ? e.productUrl              : undefined,
    accentPreference:        typeof e.accentPreference === 'string'        ? e.accentPreference        : undefined,
    softSokibariPreference:  typeof e.softSokibariPreference === 'string'  ? e.softSokibariPreference  : undefined,
    note:                    typeof e.note === 'string'                    ? e.note                    : undefined,
    images:                  Array.isArray(e.images)
                               ? (e.images as unknown[]).filter((s): s is string => typeof s === 'string')
                               : undefined,
  };
}
