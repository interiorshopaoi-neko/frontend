import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLangContext } from '../context/LangContext';
import { formatPrice } from '../utils/labels';
import LangSwitcher from '../components/LangSwitcher';
import Logo from '../components/Logo';
import type { WorkType } from '../types';
import type { I18nKey } from '../data/i18n';

const WORK_OPTIONS: { id: WorkType; labelKey: I18nKey; wall: boolean; floor: boolean }[] = [
  { id: 'cross', labelKey: 'work_wallpaper', wall: true,  floor: false },
  { id: 'cf',    labelKey: 'work_floor',     wall: false, floor: true  },
  { id: 'both',  labelKey: 'work_type_both', wall: true,  floor: true  },
];
const SIZES = [6, 8, 10, 12, 14] as const;

const TRUST: { icon: string; key: I18nKey }[] = [
  { icon: '📸', key: 'photo_later_ok'  },
  { icon: '✅', key: 'no_extra_cost'   },
  { icon: '👷', key: 'pro_check'       },
];

// ── 将来拡張用：送信データ構造 ──────────────────────────
export interface EstimatePayload {
  video: File | null;
  area: string;
  work_type: string;
  size_note: string;
  timing: string;
  contact_method: string;
  contact_value: string;
  created_at: string;
}

function calcRough(type: WorkType, tatami: number) {
  const cross = tatami * 1.62 * 2.4 * 0.85 * 2350 + 3000;
  const cf    = tatami * 1.62 * 3000;
  const raw   = type === 'cross' ? cross : type === 'cf' ? cf : cross + cf;
  return { min: Math.round(raw * 0.9 / 100) * 100, max: Math.round(raw * 1.1 / 100) * 100 };
}

type SubmitState = 'idle' | 'sending' | 'success' | 'error';

export default function LandingEstimate() {
  const { t } = useLangContext();
  const navigate = useNavigate();

  // ── 概算計算 state ──────────────────────────────────
  const [workType, setWorkType]   = useState<WorkType>('cross');
  const [tatami, setTatami]       = useState(8);
  const [useCustom, setUseCustom] = useState(false);
  const [custom, setCustom]       = useState('');

  const active = useCustom ? parseFloat(custom) || 0 : tatami;
  const est    = calcRough(workType, active);
  const hasResult = active > 0;

  // ── 詳細フォーム state ──────────────────────────────
  const [video, setVideo]               = useState<File | null>(null);
  const [area, setArea]                 = useState('');
  const [workTypeForm, setWorkTypeForm] = useState('');
  const [sizeNote, setSizeNote]         = useState('');
  const [timing, setTiming]             = useState('');
  const [contactMethod, setContactMethod] = useState('');
  const [contactValue, setContactValue] = useState('');

  // ── 送信状態 ────────────────────────────────────────
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  // ── フォーム表示フラグ ───────────────────────────────
  const [showForm, setShowForm] = useState(false);

  // ── スクロール用 ref ─────────────────────────────────
  const formRef       = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [highlighted, setHighlighted] = useState(false);

  // ── CTAクリック：表示 → スクロール → ハイライト ──────
  const handleCtaClick = () => {
    setShowForm(true);
    // DOM 描画を待ってからスクロール
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setHighlighted(true);
      setTimeout(() => setHighlighted(false), 1400);
      setTimeout(() => firstInputRef.current?.focus(), 400);
    }, 50);
  };

  // ── 送信処理 ─────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitState('sending');

    const payload: EstimatePayload = {
      video,
      area,
      work_type: workTypeForm,
      size_note: sizeNote,
      timing,
      contact_method: contactMethod,
      contact_value: contactValue,
      created_at: new Date().toISOString(),
    };

    // FormData（将来のバックエンド送信用）
    const formData = new FormData();
    if (video) formData.append('video', video);
    formData.append('area',           payload.area);
    formData.append('work_type',      payload.work_type);
    formData.append('size_note',      payload.size_note);
    formData.append('timing',         payload.timing);
    formData.append('contact_method', payload.contact_method);
    formData.append('contact_value',  payload.contact_value);
    formData.append('created_at',     payload.created_at);

    // 現時点は console.log で確認
    console.log('📦 送信データ (payload):', payload);
    console.log('📦 送信データ (FormData keys):', [...formData.keys()]);

    // TODO: 実際の送信処理に置き換える
    // await fetch('/api/estimates', { method: 'POST', body: formData });
    try {
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          // デモ用：実際は fetch のレスポンスでハンドリング
          Math.random() > 0.05 ? resolve() : reject();
        }, 1300);
      });
      setSubmitState('success');
    } catch {
      setSubmitState('error');
    }
  };

  // ── 必須チェック ─────────────────────────────────────
  const isFormValid =
    area.trim() !== '' &&
    workTypeForm !== '' &&
    timing !== '' &&
    contactMethod !== '' &&
    contactValue.trim() !== '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="fixed top-4 right-4 z-50"><LangSwitcher /></div>

      <div className="max-w-md mx-auto px-5 pt-14 pb-24">

        {/* ── Hero ───────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <Logo size={36} />
          </div>
          <h1 className="text-[1.6rem] font-bold text-slate-900 leading-tight tracking-tight">
            {t('landing_title')}
          </h1>
          <p className="text-sm text-slate-500 mt-2">{t('landing_subtitle')}</p>

          {/* 【1】安心文 */}
          <p className="mt-3 text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-100 rounded-full inline-block px-4 py-1.5">
            完全無料・営業なし・個人情報の入力は最小限です
          </p>
        </div>

        {/* ── 料金の流れ（Hero直下） ──────────────────────── */}
        <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              料金の流れ
            </p>
          </div>
          {([
            { label: '見積もり依頼', cost: '無料',               note: null,              free: true  },
            { label: '職人候補確認', cost: '無料',               note: null,              free: true  },
            { label: '予約確定',     cost: '¥3,000',            note: '工事代金に充当', free: false },
            { label: '工事当日',     cost: '残金を職人へ直接支払い', note: null,           free: null  },
          ] as const).map(({ label, cost, note, free }, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 last:border-0">
              <p className="text-sm font-medium text-slate-700">{label}</p>
              <div className="text-right">
                <p className={`text-sm font-bold ${
                  free === true  ? 'text-emerald-600' :
                  free === false ? 'text-slate-800'   : 'text-slate-500'
                }`}>{cost}</p>
                {note && <p className="text-[10px] text-slate-400 mt-0.5">{note}</p>}
              </div>
            </div>
          ))}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
            <p className="text-[10px] text-slate-500 leading-relaxed">
              前日までキャンセル全額返金。当日キャンセルは返金なし。職人都合は全額返金。
            </p>
          </div>
        </div>

        {/* ── Main card（概算計算） ──────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">

          {/* 工事種類 */}
          <div className="p-5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
              {t('work_type_label')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {WORK_OPTIONS.map(({ id, labelKey, wall, floor }) => (
                <button
                  key={id}
                  onClick={() => setWorkType(id)}
                  className={`flex flex-col items-center gap-2.5 py-4 rounded-xl border-2 transition-all active:scale-95 ${
                    workType === id
                      ? 'border-slate-800 bg-slate-50 shadow-sm'
                      : 'border-slate-100 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="w-10 h-8 rounded-lg overflow-hidden flex flex-col border border-slate-200">
                    <div className={`flex-[3] ${wall  ? 'bg-indigo-200' : 'bg-slate-100'}`} />
                    <div className="h-px bg-slate-200" />
                    <div className={`flex-1 ${floor ? 'bg-amber-200' : 'bg-slate-100'}`} />
                  </div>
                  <span className={`text-[11px] font-semibold text-center leading-tight px-1 ${
                    workType === id ? 'text-slate-800' : 'text-slate-500'
                  }`}>{t(labelKey)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 広さ */}
          <div className="p-5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
              {t('room_size')}
            </p>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((n) => (
                <button
                  key={n}
                  onClick={() => { setTatami(n); setUseCustom(false); }}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all active:scale-95 ${
                    !useCustom && tatami === n
                      ? 'border-slate-800 bg-slate-800 text-white shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:border-slate-400'
                  }`}
                >
                  {n}{t('tatami_unit')}
                </button>
              ))}
              <button
                onClick={() => setUseCustom(true)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all active:scale-95 ${
                  useCustom
                    ? 'border-slate-800 bg-slate-800 text-white shadow-sm'
                    : 'border-slate-200 text-slate-500 hover:border-slate-400'
                }`}
              >
                {t('room_other')}
              </button>
            </div>
            {useCustom && (
              <input
                type="number" value={custom} onChange={e => setCustom(e.target.value)}
                placeholder="12" min="1" max="100"
                className="mt-3 w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            )}
          </div>

          {/* 【7】概算結果：「サンプル概算見積もり」に変更 */}
          <div className="p-5">
            <div className={`rounded-2xl p-5 text-center transition-all duration-300 ${
              hasResult ? 'bg-slate-900' : 'bg-slate-50'
            }`}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-slate-400">
                サンプル概算見積もり
              </p>
              {hasResult ? (
                <>
                  <p className="text-3xl font-bold text-white tracking-tight">
                    {formatPrice(est.min)}
                    <span className="text-base font-normal text-slate-400 mx-2">〜</span>
                    {formatPrice(est.max)}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">{t('tax_included')}</p>
                </>
              ) : (
                <p className="text-3xl font-bold text-slate-300 py-1">—</p>
              )}
            </div>
            {/* 【7】説明文 */}
            <p className="mt-3 text-xs text-slate-400 text-center leading-relaxed">
              現在は参考表示です。正式な見積もりは送信内容をもとに確認してご連絡します。
            </p>
          </div>
        </div>

        {/* ── CTA ───────────────────────────────────────── */}
        <div className="mt-5 space-y-3">
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-emerald-800 text-center">
              見積もりと職人紹介は無料です
            </p>
            <p className="text-xs text-emerald-600 text-center mt-0.5">
              予約確定まで費用はかかりません
            </p>
          </div>

          {/* 【2】CTAボタン：スクロール＋ハイライト */}
          <button
            onClick={handleCtaClick}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-base transition-all shadow-sm"
          >
            30分以内に見積もりを受け取る
          </button>

          <a
            href="/customer/estimate/flow?demo=auto"
            className="block w-full text-center rounded-xl bg-black px-4 py-3 text-white font-bold text-sm active:scale-95 transition-transform"
          >
            自動デモを見る
          </a>

          <p className="text-center text-xs text-slate-400 px-4 leading-relaxed">
            予約金が必要になるのは、職人を予約確定するときだけです
          </p>

          <p className="text-center text-sm text-slate-400 pt-1">
            {t('have_account')}{' '}
            <button onClick={() => navigate('/login')} className="text-slate-700 font-semibold hover:underline">
              {t('login')}
            </button>
          </p>

          <div className="flex justify-center gap-5 pt-6 border-t border-slate-100">
            <button
              onClick={() => navigate('/pro-signup')}
              className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
            >
              職人の方はこちら
            </button>
            <button
              onClick={() => navigate('/policy')}
              className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
            >
              料金・キャンセルポリシー
            </button>
          </div>
        </div>

        {/* ── 【3】詳細入力フォーム（ボタンで表示） ─────────── */}
        {showForm && (
        <div
          ref={formRef}
          id="estimate-form"
          className={`mt-10 transition-all duration-300 ${
            highlighted
              ? 'ring-2 ring-indigo-400 ring-offset-4 rounded-2xl'
              : ''
          }`}
        >
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900">詳細を送って見積もりをもらう</h2>
            <p className="text-xs text-slate-400 mt-1">登録不要・無料・1分で完了します</p>
          </div>

          {/* 送信成功 UI */}
          {submitState === 'success' && (
            <div className="animate-fade-in bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-8 text-center">
              <div className="text-3xl mb-3">✅</div>
              <p className="text-base font-bold text-emerald-800">送信完了しました</p>
              <p className="text-sm text-emerald-700 mt-2 leading-relaxed">
                内容を確認のうえご連絡します。<br />
                しばらくお待ちください。
              </p>
            </div>
          )}

          {/* フォーム本体（成功時はフェードアウト） */}
          {submitState !== 'success' && (
            <form
              onSubmit={handleSubmit}
              className={`bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 transition-opacity duration-500 ${
                submitState === 'sending' ? 'opacity-60 pointer-events-none' : 'opacity-100'
              }`}
            >
              {/* 動画アップロード */}
              <div className="p-5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                  現場動画（あれば）
                </label>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-5 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  {video ? (
                    <>
                      <span className="text-2xl">🎬</span>
                      <span className="text-sm font-medium text-indigo-700 text-center break-all">{video.name}</span>
                      <span className="text-xs text-slate-400">タップして変更</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">📹</span>
                      <span className="text-sm font-medium text-slate-600">動画を選択（任意）</span>
                      <span className="text-xs text-slate-400">施工箇所を撮影した動画があると精度が上がります</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={e => setVideo(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              {/* 施工エリア（必須） */}
              <div className="p-5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  施工エリア <span className="text-red-400 normal-case font-bold">必須</span>
                </label>
                <input
                  ref={firstInputRef}
                  type="text"
                  required
                  value={area}
                  onChange={e => setArea(e.target.value)}
                  placeholder="例）東京都世田谷区、横浜市など"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                />
              </div>

              {/* 施工内容（必須） */}
              <div className="p-5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                  施工内容 <span className="text-red-400 normal-case font-bold">必須</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'クロス張り替え', icon: '🧱' },
                    { value: 'クロス補修',     icon: '🔧' },
                    { value: '床工事',         icon: '🪵' },
                    { value: 'その他相談',     icon: '💬' },
                  ].map(({ value, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setWorkTypeForm(value)}
                      className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all active:scale-95 ${
                        workTypeForm === value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span>{icon}</span>
                      <span>{value}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 部屋の広さ（任意） */}
              <div className="p-5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  部屋の広さ <span className="text-slate-300 normal-case font-normal">任意</span>
                </label>
                <input
                  type="text"
                  value={sizeNote}
                  onChange={e => setSizeNote(e.target.value)}
                  placeholder="例）6畳、1LDK、洋室2部屋など"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                />
              </div>

              {/* 希望時期（必須） */}
              <div className="p-5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                  希望時期 <span className="text-red-400 normal-case font-bold">必須</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'できるだけ早く',
                    '1週間以内',
                    '今月中',
                    '相談したい',
                  ].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setTiming(opt)}
                      className={`px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all active:scale-95 ${
                        timing === opt
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 連絡方法（必須） */}
              <div className="p-5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                  連絡方法 <span className="text-red-400 normal-case font-bold">必須</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'メール', icon: '📧' },
                    { value: '電話',   icon: '📞' },
                  ].map(({ value, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setContactMethod(value)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-semibold transition-all active:scale-95 ${
                        contactMethod === value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl">{icon}</span>
                      <span>{value}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 連絡先（必須） */}
              <div className="p-5">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  連絡先 <span className="text-red-400 normal-case font-bold">必須</span>
                </label>
                <input
                  type="text"
                  required
                  value={contactValue}
                  onChange={e => setContactValue(e.target.value)}
                  placeholder="例: example@mail.com または 090-0000-0000"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                />
              </div>

              {/* 送信ボタン */}
              <div className="p-5">
                <button
                  type="submit"
                  disabled={!isFormValid || submitState === 'sending'}
                  className={`w-full py-4 rounded-2xl font-bold text-base transition-all shadow-sm ${
                    isFormValid && submitState !== 'sending'
                      ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {submitState === 'sending' ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      送信中です...
                    </span>
                  ) : '内容を送信して見積もりをもらう'}
                </button>

                {/* 【5】失敗メッセージ */}
                {submitState === 'error' && (
                  <p className="mt-3 text-center text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                    送信に失敗しました。時間をおいて再度お試しください
                  </p>
                )}
              </div>
            </form>
          )}

          {/* 【6】フォーム下の信頼テキスト */}
          <div className="mt-4 px-1 space-y-1.5">
            <p className="text-xs text-slate-400 leading-relaxed">
              ※ 動画をもとに職人が確認し、目安をご案内します
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              ※ 正式な金額は現地確認後に確定する場合があります
            </p>
          </div>
        </div>
        )} {/* /showForm */}

      </div>
    </div>
  );
}
