import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../utils/imageUtils';

function getUserId(): string {
  const stored = localStorage.getItem('user');
  if (stored) {
    try { return String(JSON.parse(stored).id); } catch { /* ignore */ }
  }
  return localStorage.getItem('craftsman_guest_id') ?? '';
}

// ─── 現場レーダー型定義 ───────────────────────────────────────────────────────

type SiteRadar = {
  siteType:        string;   // 旧フィールド（互換用）
  buildingType:    string;
  workCategory:    string;
  siteStatus:      string;
  siteScale:       string;
  crewSize:        string;
  siteConditions:  string[];
  accessCondition: string;
  requiredTools:   string[];
  toolNotes:       string;
};

const BUILDING_TYPES:  readonly string[] = ['戸建て', 'アパート', 'マンション', '店舗・事務所', 'その他'];
const WORK_CATEGORIES: readonly string[] = ['原状回復', 'リフォーム・張り替え', '新築', '補修', 'その他'];
const SITE_STATUSES:   readonly string[] = ['空室・入居前', '在宅', '営業中', '大型現場', 'その他'];
const SITE_SCALES: readonly string[] = ['半日くらい', '1日', '2〜3日', '1週間以上'];
const CREW_SIZES:  readonly string[] = ['1人現場', '2〜3人', '4人以上'];
const SITE_CONDITIONS: readonly string[] = [
  '朝礼あり', '駐車場あり', '駐車場なし', 'エレベーターあり', '階段メイン',
  '荷物多め', '糊付けスペースあり', '天井高め', '残業の可能性あり',
];
const ACCESS_CONDITIONS: readonly string[] = [
  '乗り付け可能', '少し離れる', '台車があると安心', '未確認',
];
const TOOL_OPTIONS: readonly string[] = [
  '腰道具', '脚立', 'パテ道具', '糊付け機', 'レーザー',
  'ヘルメット', '安全帯', 'インパクト', '丸ノコ', 'その他',
];

const DEFAULT_RADAR: SiteRadar = {
  siteType: '', buildingType: '', workCategory: '', siteStatus: '',
  siteScale: '', crewSize: '',
  siteConditions: [], accessCondition: '', requiredTools: [], toolNotes: '',
};

// ─── フォーム型定義 ──────────────────────────────────────────────────────────

type Form = {
  work_date:      string;
  area:           string;
  work_type:      string;
  people_needed:  number;
  daily_rate:     number;
  comment:        string;
  start_time:     string;
  end_time:       string;
  has_parking:    boolean;
  required_tools: string;
  notes:          string;
  radar:          SiteRadar;
  expires_date:   string;
  expires_time:   string;
};

const TODAY = new Date().toISOString().slice(0, 10);

const EXPIRES_TIME_OPTIONS = ['08:00', '12:00', '17:00', '20:00'] as const;

const DEFAULT: Form = {
  work_date: '', area: '', work_type: '',
  people_needed: 1, daily_rate: 15000,
  comment: '', start_time: '08:00', end_time: '17:00',
  has_parking: false, required_tools: '', notes: '',
  radar: DEFAULT_RADAR,
  expires_date: TODAY,
  expires_time: '17:00',
};

// ─── 選択チップコンポーネント ────────────────────────────────────────────────

function SingleChips({
  options, value, onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt} type="button"
          onClick={() => onChange(value === opt ? '' : opt)}
          className={`px-3.5 py-2 rounded-xl text-sm font-bold border transition active:scale-95 ${
            value === opt
              ? 'bg-orange-500 border-orange-500 text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'
          }`}
        >{opt}</button>
      ))}
    </div>
  );
}

function MultiChips({
  options, values, onChange,
}: {
  options: readonly string[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const selected = values.includes(opt);
        return (
          <button
            key={opt} type="button"
            onClick={() => onChange(
              selected ? values.filter(v => v !== opt) : [...values, opt]
            )}
            className={`px-3.5 py-2 rounded-xl text-sm font-bold border transition active:scale-95 ${
              selected
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'
            }`}
          >{opt}</button>
        );
      })}
    </div>
  );
}

// ─── メインコンポーネント ────────────────────────────────────────────────────

export default function HelpRequestPage() {
  const [form,             setForm]             = useState<Form>(DEFAULT);
  const [helperImageFiles, setHelperImageFiles] = useState<File[]>([]);
  const [saving,           setSaving]           = useState(false);
  const [done,             setDone]             = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const currentUserId = getUserId();

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const setRadar = <K extends keyof SiteRadar>(key: K, value: SiteRadar[K]) =>
    setForm(prev => ({ ...prev, radar: { ...prev.radar, [key]: value } }));

  async function handleSubmit() {
    if (!form.work_date || !form.area || !form.work_type) {
      setError('作業日・エリア・作業内容は必須です');
      return;
    }
    setSaving(true);
    setError(null);

    // 現場写真をアップロード
    const helperImageUrls: string[] = [];
    if (helperImageFiles.length > 0) {
      const ts = Date.now();
      for (let i = 0; i < helperImageFiles.length; i++) {
        try {
          const blob = await compressImage(helperImageFiles[i], 1200, 0.80);
          const path = `helper-images/${ts}/${i}.jpg`;
          const { error: uploadErr } = await supabase.storage
            .from('estimate-videos')
            .upload(path, blob, { contentType: 'image/jpeg' });
          if (!uploadErr) {
            const { data: { publicUrl } } = supabase.storage
              .from('estimate-videos')
              .getPublicUrl(path);
            helperImageUrls.push(publicUrl);
          } else {
            console.error('[HelpRequestPage] 画像アップロード失敗:', uploadErr);
          }
        } catch (imgErr) {
          console.error('[HelpRequestPage] 画像処理エラー:', imgErr);
        }
      }
    }

    // 現場レーダー: 1つでも入力があれば meta に含める
    const r = form.radar;
    const hasRadar = r.buildingType || r.workCategory || r.siteStatus ||
      r.siteScale || r.crewSize ||
      r.siteConditions.length > 0 || r.accessCondition ||
      r.requiredTools.length > 0 || r.toolNotes;
    const meta = (hasRadar || helperImageUrls.length > 0)
      ? {
          ...(hasRadar        ? { siteRadar: r }                 : {}),
          ...(helperImageUrls.length > 0 ? { helperImages: helperImageUrls } : {}),
        }
      : null;

    const expires_at = form.expires_date
      ? new Date(`${form.expires_date}T${form.expires_time}:00`).toISOString()
      : null;

    const { error: err } = await supabase.from('help_requests').insert({
      work_date:      form.work_date,
      area:           form.area,
      work_type:      form.work_type,
      people_needed:  form.people_needed,
      daily_rate:     form.daily_rate,
      comment:        form.comment || null,
      craftsman_id:   currentUserId || null,
      start_time:     form.start_time || null,
      end_time:       form.end_time || null,
      has_parking:    form.has_parking,
      required_tools: form.required_tools || null,
      notes:          form.notes || null,
      meta,
      status:         'recruiting',
      expires_at,
    });

    setSaving(false);

    if (err) {
      setError('送信に失敗しました。Supabase の help_requests テーブルを確認してください。');
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 mb-1">募集を投稿しました</h2>
          <p className="text-sm text-slate-500 mb-6">助っ人からの応募を待ちましょう</p>
          <div className="flex flex-col gap-2.5">
            <a
              href="/craftsman/help-list"
              className="w-full bg-blue-600 text-white rounded-2xl py-3 font-extrabold text-sm text-center"
            >
              募集一覧を見る
            </a>
            <button
              onClick={() => { setForm(DEFAULT); setDone(false); }}
              className="w-full text-slate-400 text-sm py-2 font-medium"
            >
              続けて募集する
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900 leading-none">助っ人募集</p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">職人同士でサポートし合う</p>
            </div>
          </div>
          <a href="/craftsman/help-list" className="text-xs text-blue-600 font-semibold hover:underline">
            募集一覧 →
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 font-semibold">
            {error}
          </div>
        )}

        {/* ── 基本情報 ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">

          {/* 作業日 */}
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">作業日 <span className="text-red-400">*</span></p>
            <input
              type="date"
              value={form.work_date}
              onChange={e => set('work_date', e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="border-t border-slate-100" />

          {/* 募集終了日時 */}
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">募集終了日時</p>
            <input
              type="date"
              value={form.expires_date}
              onChange={e => set('expires_date', e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
            />
            <div className="flex gap-2">
              {EXPIRES_TIME_OPTIONS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('expires_time', t)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border transition active:scale-95 ${
                    form.expires_time === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              この日時を過ぎると一覧で「募集終了」表示になります
            </p>
          </div>

          <div className="border-t border-slate-100" />

          {/* エリア */}
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">エリア <span className="text-red-400">*</span></p>
            <input
              type="text"
              value={form.area}
              onChange={e => set('area', e.target.value)}
              placeholder="例：太田市・伊勢崎市あたり"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* 作業内容 */}
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">作業内容 <span className="text-red-400">*</span></p>
            <input
              type="text"
              value={form.work_type}
              onChange={e => set('work_type', e.target.value)}
              placeholder="例：クロス張替え（2LDK原状回復）"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="border-t border-slate-100" />

          {/* 必要人数・日当 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">必要人数</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => set('people_needed', Math.max(1, form.people_needed - 1))}
                  className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 font-bold text-lg flex items-center justify-center hover:border-blue-300"
                >−</button>
                <span className="flex-1 text-center font-extrabold text-lg text-slate-900">{form.people_needed}</span>
                <button
                  onClick={() => set('people_needed', form.people_needed + 1)}
                  className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 font-bold text-lg flex items-center justify-center hover:border-blue-300"
                >＋</button>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-1">人</p>
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">日当</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">¥</span>
                <input
                  type="number"
                  value={form.daily_rate}
                  onChange={e => set('daily_rate', Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-1">円 / 日</p>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* 作業時間 */}
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">作業時間（任意）</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-slate-400 mb-1">開始</p>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={e => set('start_time', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-1">終了</p>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={e => set('end_time', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          </div>

          {/* 駐車場 */}
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">駐車場</p>
            <button
              type="button"
              onClick={() => set('has_parking', !form.has_parking)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition ${
                form.has_parking
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <span>{form.has_parking ? '🚗 駐車場あり' : '🚫 駐車場なし'}</span>
            </button>
          </div>

          {/* 持参道具 */}
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">持参道具（任意）</p>
            <input
              type="text"
              value={form.required_tools}
              onChange={e => set('required_tools', e.target.value)}
              placeholder="例：カッター・定規・ローラー"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="border-t border-slate-100" />

          {/* コメント */}
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">コメント</p>
            <textarea
              value={form.comment}
              onChange={e => set('comment', e.target.value)}
              placeholder="例：道具は貸し出せます。昼飯付き。"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* 備考 */}
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">備考（任意）</p>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="例：現地集合・交通費支給あり"
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* ── 現場写真 ────────────────────────────────────────────────────── */}
        <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📷</span>
            <p className="text-sm font-extrabold text-slate-900">現場写真</p>
            <span className="text-xs bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">任意</span>
          </div>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            今の現場の雰囲気が分かる写真があると、職人が応募しやすくなります。<br />
            その場で撮影しても、アルバムから選んでも大丈夫です。
          </p>

          {/* サムネイルプレビュー */}
          {helperImageFiles.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {helperImageFiles.map((file, idx) => (
                <div key={idx} className="relative w-24 h-24">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`現場写真${idx + 1}`}
                    className="w-24 h-24 object-cover rounded-xl border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setHelperImageFiles(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-700 text-white rounded-full text-[10px] flex items-center justify-center font-bold leading-none"
                    aria-label="削除"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {helperImageFiles.length < 3 && (
            <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 font-semibold cursor-pointer hover:border-blue-300 hover:text-blue-400 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              写真を選択・撮影（最大3枚）
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length === 0) return;
                  setHelperImageFiles(prev => {
                    const combined = [...prev, ...files];
                    return combined.slice(0, 3);
                  });
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>

        {/* ── 現場レーダー ────────────────────────────────────────────────── */}
        <div className="mt-4 bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📡</span>
            <p className="text-sm font-extrabold text-slate-900">現場レーダー</p>
            <span className="text-xs bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">任意</span>
          </div>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            分かる範囲だけでOKです。朝礼・駐車場・搬入条件が分かると、応募されやすくなります。
          </p>

          <div className="space-y-5">

            {/* 建物の種類 */}
            <div>
              <p className="text-sm font-extrabold text-slate-700 mb-2.5">建物の種類</p>
              <SingleChips
                options={BUILDING_TYPES}
                value={form.radar.buildingType}
                onChange={v => setRadar('buildingType', v)}
              />
            </div>

            <div className="border-t border-slate-100" />

            {/* 工事の種類 */}
            <div>
              <p className="text-sm font-extrabold text-slate-700 mb-2.5">工事の種類</p>
              <SingleChips
                options={WORK_CATEGORIES}
                value={form.radar.workCategory}
                onChange={v => setRadar('workCategory', v)}
              />
            </div>

            <div className="border-t border-slate-100" />

            {/* 現場の状態 */}
            <div>
              <p className="text-sm font-extrabold text-slate-700 mb-2.5">現場の状態</p>
              <SingleChips
                options={SITE_STATUSES}
                value={form.radar.siteStatus}
                onChange={v => setRadar('siteStatus', v)}
              />
            </div>

            <div className="border-t border-slate-100" />

            {/* 現場規模 */}
            <div>
              <p className="text-sm font-extrabold text-slate-700 mb-2.5">作業規模</p>
              <SingleChips
                options={SITE_SCALES}
                value={form.radar.siteScale}
                onChange={v => setRadar('siteScale', v)}
              />
            </div>

            <div className="border-t border-slate-100" />

            {/* 人数感 */}
            <div>
              <p className="text-sm font-extrabold text-slate-700 mb-2.5">人数感</p>
              <SingleChips
                options={CREW_SIZES}
                value={form.radar.crewSize}
                onChange={v => setRadar('crewSize', v)}
              />
            </div>

            <div className="border-t border-slate-100" />

            {/* 現場ルール・注意点 */}
            <div>
              <p className="text-sm font-extrabold text-slate-700 mb-2.5">現場ルール・注意点 <span className="text-xs font-semibold text-slate-400">複数選択可</span></p>
              <MultiChips
                options={SITE_CONDITIONS}
                values={form.radar.siteConditions}
                onChange={v => setRadar('siteConditions', v)}
              />
            </div>

            <div className="border-t border-slate-100" />

            {/* 搬入条件 */}
            <div>
              <p className="text-sm font-extrabold text-slate-700 mb-2.5">搬入条件</p>
              <SingleChips
                options={ACCESS_CONDITIONS}
                value={form.radar.accessCondition}
                onChange={v => setRadar('accessCondition', v)}
              />
            </div>

            <div className="border-t border-slate-100" />

            {/* 必要な道具 */}
            <div>
              <p className="text-sm font-extrabold text-slate-700 mb-2.5">必要な道具 <span className="text-xs font-semibold text-slate-400">複数選択可</span></p>
              <MultiChips
                options={TOOL_OPTIONS}
                values={form.radar.requiredTools}
                onChange={v => setRadar('requiredTools', v)}
              />
            </div>

            {/* その他必要な道具・注意点 */}
            <div>
              <p className="text-sm font-extrabold text-slate-700 mb-2.5">その他の道具・注意点 <span className="text-xs font-semibold text-slate-400">任意</span></p>
              <textarea
                value={form.radar.toolNotes}
                onChange={e => setRadar('toolNotes', e.target.value)}
                placeholder="例：3尺脚立でOK・乗り付け不可・糊付け機は現場にあります"
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

          </div>
        </div>
      </div>

      {/* 固定フッター */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-20">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl py-3.5 font-extrabold text-base shadow-sm transition active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                送信中...
              </span>
            ) : '助っ人を募集する'}
          </button>
          <p className="mt-1.5 text-center text-xs text-slate-400">現在は無料で募集できます</p>
          <p className="mt-0.5 text-center text-xs text-slate-400">正式版では募集側・参加側それぞれ300円の利用料を予定しています</p>
          <p className="mt-1 text-center text-[11px] text-slate-300 leading-relaxed">
            当サービスはマッチングの場の提供であり、施工内容・品質・トラブルについては当事者間でご確認ください。
          </p>
        </div>
      </div>
    </div>
  );
}
