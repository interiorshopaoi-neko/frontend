import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Video,
  Sparkles,
  MapPin,
  Lock,
  Radio,
} from 'lucide-react';
import type { User, Role } from '../../types';
import { supabase } from '../../lib/supabase';

interface Props {
  onLogin: (token: string, user: User) => void;
}

export default function Register({ onLogin }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  // If came from landing page estimate CTA, send new customers straight to the flow
  const fromLanding = (location.state as any)?.fromLanding === true;
  // 職人LP（/for-pros · /pro-signup）から来た場合は role を 'craftsman' で初期選択し、
  // 登録完了後は /craftsman/jobs（動画で探す画面）に遷移する。
  const fromProLp        = (location.state as any)?.fromProLp === true;
  const stateDefaultRole = (location.state as any)?.defaultRole as Role | undefined;
  const initialRole: Role = stateDefaultRole === 'craftsman' ? 'craftsman' : 'customer';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(initialRole);
  const [error, setError] = useState('');
  const [info,  setInfo]  = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      // Supabase Auth signUp。name / role は user_metadata に保存し、
      // localStorage.user.role には useAuth 側でミラーされる。
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Email 確認 ON の場合は session が null。無音失敗を防ぎ、案内を表示する。
      if (!data.session || !data.user) {
        setInfo('確認メールを送信しました。メール内のリンクで認証後、ログインしてください。');
        return;
      }

      const userData: User = {
        id: data.user.id,
        name,
        email: data.user.email ?? email,
        role,
      };
      onLogin(data.session.access_token, userData);

      // 職人登録時のみ craftsmen テーブルへ初期行を投入する。
      // 既存 RPC upsert_craftsman_profile を使用（直接 insert はしない）。
      // 失敗しても navigate は止めず、軽量な案内のみ表示する。
      if (role === 'craftsman') {
        const { error: profErr } = await supabase.rpc('upsert_craftsman_profile', {
          p_user_id:                data.user.id,
          p_email:                  data.user.email ?? email,
          p_shop_name:              null,
          p_full_name:              name,
          p_service_area:           null,
          p_radius_km:              20,
          p_work_types:             [],
          p_specialty:              null,
          p_available_weekdays:     [],
          p_notification_enabled:   true,
          p_profile_image_url:      null,
          p_age:                    null,
          p_experience_years:       null,
          p_bio:                    null,
          p_available_time:         null,
          p_has_car:                false,
          p_has_tools:              false,
          p_public_profile_enabled: false,
        });
        if (profErr) {
          console.error('[craftsmen init] upsert_craftsman_profile failed:', profErr);
          setError('プロフィール初期化に失敗しました。あとでプロフィール画面から設定できます。');
        }

        // Phase6-B: craftsman 登録成功直後、管理者へ即メール通知を fire-and-forget で送る。
        // - await しない（register 成功 UX をブロックしない）
        // - .catch で握りつぶす（通知失敗で navigate を止めない）
        // - customer 経路はこの分岐の外なのでこの fetch までそもそも到達しない
        // - Email Confirm ON で session=null の経路は上で早期 return 済のため到達しない
        fetch('/api/notify-signup', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id:    data.user.id,
            name,
            email:      data.user.email ?? email,
            role,
            created_at: new Date().toISOString(),
          }),
        }).catch((notifyErr) => {
          console.error('[signup] notify-signup failed:', notifyErr);
        });
      }

      if (role === 'customer' && fromLanding) {
        navigate('/customer/estimate/flow');
      } else if (role === 'craftsman' && fromProLp) {
        // 職人LP起点の登録は、約束した「ショート動画で案件を探す」体験へ直接送る。
        // justRegistered フラグで /craftsman/jobs の初回ウェルカムモーダルを発火させる。
        navigate('/craftsman/jobs', { state: { justRegistered: true } });
      } else {
        navigate(role === 'customer' ? '/customer' : '/craftsman');
      }
    } catch (err: any) {
      setError(err?.message ?? '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ── role別コンテンツ（UIのみ） ──────────────────────────────
  const isCraft = role === 'craftsman';

  const roleCopy = isCraft
    ? {
        title: 'あと30秒で動画案件が見られます',
        sub:   '今日入れる案件もあります。空き日に近場の仕事を。',
        cta:   '無料で動画案件を見始める',
      }
    : {
        title: '30秒で内装見積もりを依頼できます',
        sub:   '動画を撮るだけでOK。職人から直接見積もりが届きます。',
        cta:   '無料で見積もりを始める',
      };

  const benefits = isCraft
    ? ['動画で案件確認', '応募はずっと無料', '空き日に近場の仕事']
    : ['動画で簡単見積もり', '地元職人と直接やり取り', '複数比較OK'];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 背景：薄い青グラデ + 上部の余韻 */}
      <div
        className="absolute inset-0 -z-20"
        style={{
          background:
            'linear-gradient(180deg, #f3f6fb 0%, #f8fafc 35%, #f8fafc 100%)',
        }}
      />
      {/* 上部の subtle glow（黒→白の余韻） */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[460px] h-[260px] -z-10 opacity-70"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.18), transparent 70%)',
          filter: 'blur(8px)',
        }}
      />

      {/* ヘッダー */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/')} aria-label="PRO MATCH トップへ">
            <img src="/logo-full.png" alt="PRO MATCH" className="h-7 object-contain" />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            ログイン
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-5 pb-16">
        {/* ───────── 動画案件ミニカード（Reels風） ───────── */}
        <div className="flex items-stretch gap-3 mb-5">
          {/* 黒のミニReelsカード */}
          <div
            className="relative rounded-2xl overflow-hidden border border-white/10 shadow-xl shadow-blue-900/20 flex-shrink-0"
            style={{
              width: 110,
              aspectRatio: '9 / 16',
              background:
                'linear-gradient(135deg,#1f2937 0%,#0f172a 60%,#020617 100%)',
            }}
            aria-hidden
          >
            {/* グラデマスク */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 35%, rgba(0,0,0,0.85) 100%)',
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.20), transparent 55%)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Video size={28} className="text-white/10" strokeWidth={1.5} />
            </div>

            {/* トップ：🔥今日希望 + カウンタ */}
            <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1">
              <span className="px-1.5 py-0.5 rounded-full text-[8px] font-extrabold bg-rose-500 text-white shadow">
                ⚡ 今日
              </span>
              <span className="text-white/55 text-[8px] font-mono bg-black/30 backdrop-blur-sm px-1 py-0.5 rounded">
                1/18
              </span>
            </div>

            {/* 中央：想定売上 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/40 backdrop-blur-md rounded-lg px-2.5 py-1.5 border border-white/10">
                <p className="text-white/55 text-[7px] font-bold tracking-widest">想定売上</p>
                <p className="text-white text-[18px] font-black leading-none tabular-nums">¥4〜6万</p>
              </div>
            </div>

            {/* ボトム：案件メタ */}
            <div className="absolute left-1.5 right-1.5 bottom-1.5">
              <p className="text-white text-[10px] font-extrabold leading-tight mb-0.5 drop-shadow">クロス張替え</p>
              <div className="flex items-center gap-1 text-[8.5px] text-white/70">
                <MapPin size={8} />
                <span>太田市</span>
                <span className="text-blue-300 font-bold">4.8km</span>
              </div>
            </div>

            {/* ロックバナー */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[26px] z-10 pointer-events-none">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-black/60 backdrop-blur px-1.5 py-0.5 border border-white/10">
                <Lock size={8} className="text-white/80" />
                <span className="text-[7px] font-bold text-white/85">登録後に再生</span>
              </span>
            </div>
          </div>

          {/* 右側コピー */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="inline-flex items-center gap-1 rounded-full bg-white/80 backdrop-blur border border-blue-100 px-2 py-0.5 mb-2 shadow-sm">
              <Radio size={9} className="text-emerald-500" />
              <span className="text-[9px] font-black tracking-widest text-slate-700">SHORT VIDEO</span>
              <span className="ml-0.5 inline-flex items-center gap-0.5 text-[8.5px] font-bold text-emerald-600">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                公開中
              </span>
            </div>
            <p className="text-[18px] leading-tight font-black text-slate-900">
              {isCraft ? (
                <>
                  仕事は、<br />
                  <span className="text-blue-600">流れて</span>います。
                </>
              ) : (
                <>
                  動画で、<br />
                  <span className="text-blue-600">かんたん</span>見積。
                </>
              )}
            </p>
            <p className="text-[10.5px] text-slate-500 leading-relaxed mt-1.5">
              {isCraft
                ? '近場の動画案件を順次追加中'
                : '撮るだけ、すぐ届く'}
            </p>
          </div>
        </div>

        {/* ───────── イントロ ───────── */}
        <div className="mb-3.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 mb-2">
            <Sparkles size={11} />
            <span className="text-[10px] font-bold tracking-wide">PRO MATCH</span>
          </div>
          <h1 className="text-[20px] font-black text-slate-900 leading-snug mb-0.5">
            新規登録
          </h1>
          <p className="text-[11.5px] text-slate-500 leading-relaxed">
            30秒で完了 / クレジットカード不要 / 営業電話なし
          </p>
        </div>

        {/* ───────── カード ───────── */}
        <div className="rounded-2xl bg-white/95 backdrop-blur border border-slate-100 shadow-md shadow-blue-900/5 p-4">
          {/* ロール選択 */}
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            登録のタイプ
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3.5">
            <button
              type="button"
              onClick={() => setRole('customer')}
              aria-pressed={role === 'customer'}
              className={`py-3 rounded-xl border-2 text-[13px] font-black transition-all ${
                role === 'customer'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              お客様
            </button>
            <button
              type="button"
              onClick={() => setRole('craftsman')}
              aria-pressed={role === 'craftsman'}
              className={`py-3 rounded-xl border-2 text-[13px] font-black transition-all ${
                role === 'craftsman'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              職人
            </button>
          </div>

          {/* role依存メッセージ（強化版） */}
          {isCraft ? (
            <div className="mb-4 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-3.5 py-3 text-white shadow-md shadow-blue-600/30 flex items-start gap-2.5">
              <Video size={16} className="flex-shrink-0 mt-0.5" strokeWidth={2.4} />
              <div className="min-w-0">
                <p className="text-[12.5px] font-black leading-tight">
                  {roleCopy.title}
                </p>
                <p className="text-[10.5px] text-blue-100 leading-relaxed mt-0.5">
                  {roleCopy.sub}
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-4 rounded-xl bg-indigo-50 border border-indigo-100 px-3.5 py-3 flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" strokeWidth={2.4} />
              <div className="min-w-0">
                <p className="text-[12.5px] font-black text-indigo-900 leading-tight">
                  {roleCopy.title}
                </p>
                <p className="text-[10.5px] text-indigo-700 leading-relaxed mt-0.5">
                  {roleCopy.sub}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">お名前</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-slate-50/50 transition"
                placeholder="山田 太郎"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-slate-50/50 transition"
                placeholder="example@email.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-slate-50/50 transition"
                placeholder="6文字以上"
              />
            </div>

            {error && (
              <p className="text-rose-500 text-[12px] bg-rose-50 rounded-lg px-3 py-2 border border-rose-100">{error}</p>
            )}
            {info && (
              <p className="text-emerald-700 text-[12px] bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">{info}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-3.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 active:scale-[0.99] text-white font-black text-[14px] transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              {loading ? '登録中…' : roleCopy.cta}
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>

          {/* 登録後にできること */}
          <div className="mt-4 pt-3.5 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              登録後すぐに
            </p>
            <ul className="grid grid-cols-1 gap-1.5">
              {benefits.map((b) => (
                <li key={b} className="flex items-center gap-2 text-[11.5px] text-slate-700">
                  <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
                  <span className="font-semibold">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-center text-[12px] text-slate-500 mt-4">
          すでにアカウントをお持ちの方は{' '}
          <Link to="/login" className="text-blue-600 font-bold hover:underline">
            ログイン
          </Link>
        </p>

        <p className="text-center text-[10px] text-slate-400 mt-2.5 leading-relaxed">
          登録すると <Link to="/terms" className="underline">利用規約</Link>
          {' '}・{' '}
          <Link to="/privacy" className="underline">プライバシー</Link>
          {' '}に同意したものとみなされます
        </p>

      </main>
    </div>
  );
}
