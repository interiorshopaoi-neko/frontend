// 現場レーダー: 職人が3秒で案件を判断するためのUI
// チップ・難易度badge・情報充実度インジケーターを提供する

import type { Job } from '../pages/craftsman/CraftsmanJobsPage';
import { getRoomMedia, getWallpaperAccentPreferences } from '../lib/requestMeta';

type Chip = { text: string; cls: string };

export function computeRadarChips(job: Job): Chip[] {
  const chips: Chip[] = [];
  const rooms = job.meta?.rooms ?? [];

  // 施工量（新旧両形式対応）
  const hasCeiling = rooms.some(r =>
    r.wallWorkScope === 'ceiling' || r.wallWorkScope === 'wall_ceiling' ||
    r.workType === '天井クロス' || r.workType === '壁＋天井'
  );
  if (hasCeiling) chips.push({ text: '天井あり', cls: 'bg-amber-100 text-amber-700' });

  // 材料・仕上げ（アクセント希望は新旧両方チェック）
  const accentPrefs = getWallpaperAccentPreferences(job.meta);
  const hasAccent = accentPrefs.some(p => p !== 'まだ分からない') ||
    rooms.some(r => r.materialPref?.includes('アクセント') || r.materialPref?.includes('柄物'));
  if (hasAccent) chips.push({ text: 'アクセント希望', cls: 'bg-purple-50 text-purple-700' });
  const hasUndecided = rooms.some(r => r.materialPref === 'まだ決まっていない');
  if (hasUndecided) chips.push({ text: '材料未定', cls: 'bg-slate-100 text-slate-500' });

  // 雰囲気（壁紙ムード）
  const wallPref = job.meta?.wallpaper_preference;
  if (wallPref && wallPref !== 'まだ決まっていない') {
    if (wallPref.includes('ホテル'))      chips.push({ text: 'ホテル系',    cls: 'bg-slate-100 text-slate-600' });
    else if (wallPref.includes('グレー')) chips.push({ text: 'グレー系',    cls: 'bg-slate-100 text-slate-600' });
    else                                  chips.push({ text: wallPref,      cls: 'bg-teal-50 text-teal-600' });
  }

  // 状態系
  const allConds = rooms.flatMap(r => r.condition ?? []);
  if (allConds.includes('ペット臭') || (job.customer_note ?? '').includes('ペット')) {
    chips.push({ text: 'ペットあり', cls: 'bg-orange-50 text-orange-600' });
  }
  if (allConds.filter(c => ['汚れ', 'カビ', 'めくれ'].includes(c)).length >= 2) {
    chips.push({ text: '汚れ強め', cls: 'bg-red-50 text-red-500' });
  }

  return chips.slice(0, 6); // 2行以内に収める
}

function computeDifficulty(job: Job): { label: string; cls: string } {
  const rooms = job.meta?.rooms ?? [];
  let score = 0;
  if (rooms.some(r =>
    r.wallWorkScope === 'ceiling' || r.wallWorkScope === 'wall_ceiling' ||
    r.workType === '天井クロス' || r.workType === '壁＋天井'
  )) score++;
  const accentPrefs = getWallpaperAccentPreferences(job.meta);
  if (accentPrefs.some(p => p !== 'まだ分からない') ||
      rooms.some(r => r.materialPref?.includes('アクセント') || r.materialPref?.includes('柄物'))) score++;
  if (rooms.length >= 3) score++;
  if (score === 0) return { label: '低',       cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
  if (score === 1) return { label: '普通',     cls: 'bg-slate-50 text-slate-500 border-slate-200' };
  return              { label: 'やや高め', cls: 'bg-orange-50 text-orange-600 border-orange-100' };
}

function computeInfoRichness(job: Job): 'rich' | 'sparse' | 'normal' {
  const hasVideo = job.has_video || !!job.video_url;
  const roomMedia = getRoomMedia(job.meta);
  const hasRoomImages = roomMedia.some(rm => rm.images.length > 0);
  if (hasVideo && (job.has_photos || hasRoomImages)) return 'rich';
  if (!hasVideo && !job.has_photos && !hasRoomImages) return 'sparse';
  return 'normal';
}

export default function SiteRadar({ job }: { job: Job }) {
  const chips = computeRadarChips(job);
  const difficulty = computeDifficulty(job);
  const richness = computeInfoRichness(job);

  if (chips.length === 0 && richness === 'normal') return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.1em]">現場レーダー</p>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${difficulty.cls}`}>
          難易度：{difficulty.label}
        </span>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chips.map((chip, i) => (
            <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${chip.cls}`}>
              {chip.text}
            </span>
          ))}
        </div>
      )}
      {richness === 'rich' && (
        <p className="text-[10px] text-emerald-600 font-bold mt-1.5">✓ 現場情報が充実しています</p>
      )}
      {richness === 'sparse' && (
        <p className="text-[10px] text-slate-400 mt-1.5">追加写真をお願いする場合があります</p>
      )}
    </div>
  );
}
