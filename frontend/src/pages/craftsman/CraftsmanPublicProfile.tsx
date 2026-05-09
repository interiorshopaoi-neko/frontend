import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import BottomNav from '../../components/BottomNav';

// ─── Types ────────────────────────────────────────────────────────────────────

type Craftsman = {
  user_id: string;
  shop_name: string | null;
  full_name: string | null;
  service_area: string | null;
  radius_km: number | null;
  work_types: string[] | null;
  specialty: string | null;
  available_weekdays: string[] | null;
  profile_image_url: string | null;
  age: number | null;
  experience_years: number | null;
  bio: string | null;
  available_time: string | null;
  has_car: boolean | null;
  has_tools: boolean | null;
  public_profile_enabled: boolean | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function AvatarImage({ src, letter }: { src: string | null; letter: string }) {
  const [imgOk, setImgOk] = useState(!!src);

  if (src && imgOk) {
    return (
      <img
        src={src}
        alt="プロフィール写真"
        className="w-full h-full object-cover"
        onError={() => setImgOk(false)}
      />
    );
  }
  return (
    <span className="text-4xl font-extrabold text-slate-400">{letter}</span>
  );
}

function Chip({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'slate' | 'green' | 'amber' }) {
  const cls = {
    blue:  'bg-blue-50 text-blue-700 border-blue-100',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }[color];
  return (
    <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold border ${cls}`}>
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-3">
      <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-3">{title}</p>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CraftsmanPublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [craftsman, setCraftsman] = useState<Craftsman | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);

  useEffect(() => {
    if (!userId) { setNotFound(true); setLoading(false); return; }

    (async () => {
      const { data: rows } = await supabase
        .rpc('get_craftsman_public_profile', { p_user_id: userId });
      const data = rows?.[0] ?? null;

      if (!data || data.public_profile_enabled === false) {
        setNotFound(true);
      } else {
        setCraftsman(data as Craftsman);
      }
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !craftsman) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-lg font-extrabold text-slate-800 mb-2">プロフィールが見つかりません</p>
        <p className="text-sm text-slate-500 mb-6">
          このURLのプロフィールは存在しないか、非公開に設定されています。
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold"
        >
          ← 戻る
        </button>
      </div>
    );
  }

  const c = craftsman;
  const displayName  = c.shop_name || c.full_name || '職人さん';
  const subName      = c.shop_name && c.full_name ? c.full_name : null;
  const avatarLetter = displayName.charAt(0);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <p className="text-sm font-extrabold text-slate-900 leading-none">職人プロフィール</p>
            <p className="text-[10px] text-slate-400 leading-none mt-0.5">公開情報のみ表示しています</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 pb-28">

        {/* ── プロフィールヒーローカード ── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-4">
          <div className="h-20 bg-gradient-to-r from-blue-600 to-blue-500" />
          <div className="px-5 pb-5">
            <div className="flex items-end gap-4 -mt-10 mb-4">
              <div className="w-20 h-20 rounded-2xl border-4 border-white bg-slate-100 overflow-hidden flex items-center justify-center shadow-md flex-shrink-0">
                <AvatarImage src={c.profile_image_url} letter={avatarLetter} />
              </div>
              <div className="pb-1">
                <h1 className="text-lg font-extrabold text-slate-900 leading-tight">{displayName}</h1>
                {subName && <p className="text-xs text-slate-500 mt-0.5">担当：{subName}</p>}
              </div>
            </div>

            {/* スペックバッジ行 */}
            <div className="flex flex-wrap gap-2">
              {c.experience_years != null && (
                <Chip color="blue">内装歴 {c.experience_years}年</Chip>
              )}
              {c.age != null && (
                <Chip color="slate">{c.age}歳</Chip>
              )}
              {c.available_time && (
                <Chip color="amber">⏰ {c.available_time}</Chip>
              )}
              {c.has_car && <Chip color="green">🚗 車あり</Chip>}
              {c.has_tools && <Chip color="green">🔧 道具あり</Chip>}
            </div>
          </div>
        </div>

        {/* ── 一言プロフィール ── */}
        {c.bio && (
          <Section title="一言プロフィール">
            <p className="text-sm text-slate-700 leading-relaxed">{c.bio}</p>
          </Section>
        )}

        {/* ── 対応エリア ── */}
        {(c.service_area || c.radius_km != null) && (
          <Section title="対応エリア">
            <div className="flex flex-col gap-2">
              {c.service_area && (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <span className="font-semibold">{c.service_area}</span>
                </div>
              )}
              {c.radius_km != null && (
                <p className="text-xs text-slate-500">拠点から約 {c.radius_km}km 以内まで対応</p>
              )}
            </div>
          </Section>
        )}

        {/* ── 対応可能工事 ── */}
        {c.work_types && c.work_types.length > 0 && (
          <Section title="対応可能工事">
            <div className="flex flex-wrap gap-2">
              {c.work_types.map(wt => (
                <Chip key={wt} color="blue">{wt}</Chip>
              ))}
            </div>
          </Section>
        )}

        {/* ── 得意案件 ── */}
        {c.specialty && (
          <Section title="得意案件">
            <p className="text-sm text-slate-700 leading-relaxed">{c.specialty}</p>
          </Section>
        )}

        {/* ── 対応曜日 ── */}
        {c.available_weekdays && c.available_weekdays.length > 0 && (
          <Section title="対応しやすい曜日">
            <div className="flex gap-2 flex-wrap">
              {['月', '火', '水', '木', '金', '土', '日'].map(day => {
                const active = c.available_weekdays!.includes(day);
                return (
                  <div
                    key={day}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold border ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── 実績・評価 ── */}
        <Section title="実績・評価">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
              <p className="text-[10px] text-slate-400 mb-1">成約実績</p>
              <p className="text-xl font-extrabold text-slate-900">0件</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
              <p className="text-[10px] text-slate-400 mb-1">レビュー</p>
              <p className="text-sm font-bold text-slate-500 mt-1">まだありません</p>
            </div>
          </div>
        </Section>

        {/* 注意書き */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3">
          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            🔒 このページには電話番号・住所・メールアドレスなどの個人情報は表示されていません。<br />
            個人情報は成約後に当事者間で共有されます。
          </p>
          <p className="text-center mt-2">
            <a href="/support?type=report" className="text-[11px] text-slate-400 hover:text-red-500 transition-colors underline">
              問題を報告
            </a>
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
