// Safe meta accessors for estimate_requests.meta (JSONB).
// All functions tolerate null / undefined / legacy formats without throwing.

export type RoomMeta = {
  name?: string;
  workType?: string;
  size?: string;
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
