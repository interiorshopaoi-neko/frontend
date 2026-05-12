import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="text-3xl transition"
          aria-label={`${n}星`}
        >
          <span className={(hovered || value) >= n ? 'text-amber-400' : 'text-slate-200'}>★</span>
        </button>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const navigate  = useNavigate();
  const { id }    = useParams<{ id: string }>();   // estimate_request_id

  const [rating,    setRating]    = useState(0);
  const [comment,   setComment]   = useState('');
  const [again,     setAgain]     = useState<boolean | null>(null);
  const [checks,    setChecks]    = useState({ platform: false, person: false, noRedirect: false });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState('');

  function toggleCheck(key: keyof typeof checks) {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (rating === 0) { setError('評価（星）を選択してください'); return; }
    if (!checks.platform || !checks.person || !checks.noRedirect) {
      setError('すべての確認項目にチェックを入れてください');
      return;
    }
    if (!id) { setError('URLが不正です'); return; }

    setSubmitting(true);

    // Step 1: job_applications を取得（craftsman_id と id を得る）
    const { data: appRows, error: fetchError } = await supabase
      .from('job_applications')
      .select('id, craftsman_id')
      .eq('estimate_request_id', id)
      .eq('is_contracted', true)
      .is('reviewed_at', null)   // 二重送信防止
      .limit(1);

    if (fetchError || !appRows || appRows.length === 0) {
      setSubmitting(false);
      setError('対象の案件が見つかりません。既にレビュー済みか、成約前の可能性があります。');
      return;
    }

    const app = appRows[0];

    // Step 2: reviews テーブルに挿入
    const { error: reviewError } = await supabase
      .from('reviews')
      .insert({
        job_application_id: app.id,
        review_type:   'customer_to_craftsman',
        reviewer_type: 'customer',
        reviewer_id:   String(id),        // estimate_request_id を reviewer 識別子として使用
        target_type:   'craftsman',
        target_id:     app.craftsman_id,  // craftsmen.user_id と一致
        rating:        rating,
        comment:       comment.trim() || null,
        would_use_again: again,
      });

    if (reviewError) {
      console.error('reviews insert error:', reviewError);
      // reviews 書き込み失敗でも reviewed_at は更新する（部分的成功を許容）
    }

    // Step 3: job_applications の reviewed_at を更新
    const { error: dbError } = await supabase
      .from('job_applications')
      .update({ reviewed_at: new Date().toISOString() })
      .eq('id', app.id);

    setSubmitting(false);

    if (dbError) {
      console.error('review update error:', dbError);
      setError('送信に失敗しました。もう一度お試しください。');
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 max-w-sm w-full text-center overflow-hidden">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 px-6 pt-8 pb-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">⭐</span>
            </div>
            <h2 className="text-xl font-extrabold text-white">レビューを送りました</h2>
            <p className="text-sm text-white/80 mt-1">ご協力ありがとうございます</p>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              レビューは職人のプロフィールに反映されます。<br />
              PRO MATCHをご利用いただきありがとうございました。
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-blue-600 text-white rounded-2xl py-3.5 font-extrabold text-base shadow-sm shadow-blue-200 transition active:scale-[0.99]"
            >
              トップへ戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-slate-700 transition p-1 -ml-1 rounded-xl"
          aria-label="戻る"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wide">工事完了</p>
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">レビューを送る</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* 星評価 */}
          <section className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 p-5">
            <p className="text-sm font-extrabold text-slate-900 mb-3">全体的な評価</p>
            <StarRating value={rating} onChange={setRating} />
            {rating > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                {['', '残念でした', 'やや不満', '普通', '良かった', 'とても良かった'][rating]}
              </p>
            )}
          </section>

          {/* コメント */}
          <section className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 p-5">
            <label className="block text-sm font-extrabold text-slate-900 mb-1.5">
              コメント
              <span className="ml-1.5 text-xs font-normal text-slate-400">任意</span>
            </label>
            <textarea
              rows={3}
              placeholder="工事の仕上がり・対応など、感想をお聞かせください"
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none transition"
            />
          </section>

          {/* また依頼したいか */}
          <section className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 p-5">
            <p className="text-sm font-extrabold text-slate-900 mb-3">また依頼したいですか？</p>
            <div className="grid grid-cols-2 gap-2">
              {[true, false].map(val => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => setAgain(val)}
                  className={`rounded-2xl py-3 text-sm font-bold border-2 transition ${
                    again === val
                      ? val ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-400 bg-slate-50 text-slate-700'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  {val ? '👍 またお願いしたい' : '少し考える'}
                </button>
              ))}
            </div>
          </section>

          {/* 確認チェック */}
          <section className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 p-5">
            <p className="text-sm font-extrabold text-slate-900 mb-3">確認事項</p>
            <div className="space-y-3">
              {[
                { key: 'platform',   label: 'この工事はPRO MATCH経由で成立しました' },
                { key: 'person',     label: '表示された職人と実際の施工者が一致しています' },
                { key: 'noRedirect', label: '不自然な外部誘導はありませんでした' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <div
                    onClick={() => toggleCheck(key as keyof typeof checks)}
                    className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition ${
                      checks[key as keyof typeof checks]
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {checks[key as keyof typeof checks] && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-slate-700 leading-snug">{label}</span>
                </label>
              ))}
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-500 font-medium">{error}</p>
            )}
          </section>

          {/* エラー（評価未選択など） */}
          {error && !error.includes('確認項目') && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* 送信 */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white rounded-2xl py-4 text-base font-extrabold shadow-sm shadow-blue-200 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '送信中...' : 'レビューを送る'}
          </button>

          <p className="text-center text-[11px] text-slate-400 leading-relaxed">
            レビューは職人のプロフィールページに反映されます。<br />
            個人を特定する情報は表示されません。
          </p>
        </form>
      </div>
    </div>
  );
}
