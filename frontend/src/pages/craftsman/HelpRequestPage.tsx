import { useState } from 'react';
import { supabase } from '../../lib/supabase';

function getUserId(): string {
  const stored = localStorage.getItem('user');
  if (stored) {
    try { return String(JSON.parse(stored).id); } catch { /* ignore */ }
  }
  return localStorage.getItem('craftsman_guest_id') ?? '';
}

type Form = {
  work_date: string;
  area: string;
  work_type: string;
  people_needed: number;
  daily_rate: number;
  comment: string;
  start_time: string;
  end_time: string;
  has_parking: boolean;
  required_tools: string;
  notes: string;
};

const DEFAULT: Form = {
  work_date: '',
  area: '',
  work_type: '',
  people_needed: 1,
  daily_rate: 15000,
  comment: '',
  start_time: '',
  end_time: '',
  has_parking: false,
  required_tools: '',
  notes: '',
};

export default function HelpRequestPage() {
  const [form,   setForm]   = useState<Form>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const [error,  setError]  = useState<string | null>(null);
  const currentUserId = getUserId();

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  async function handleSubmit() {
    if (!form.work_date || !form.area || !form.work_type) {
      setError('作業日・エリア・作業内容は必須です');
      return;
    }
    setSaving(true);
    setError(null);

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
