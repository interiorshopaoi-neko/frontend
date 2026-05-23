import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ── カテゴリー ────────────────────────────────────────────────────────────────
// feedback category UI intentionally avoids bug/insect imagery
// to keep PRO MATCH visually clean and approachable

const CATEGORIES = [
  { value: '不具合',           label: '不具合',           emoji: '🔧', desc: '画面が動かない・エラーが出る' },
  { value: '改善してほしい',   label: '改善してほしい',   emoji: '💡', desc: 'こうなったらもっと使いやすい' },
  { value: '使い方が分からない', label: '使い方が分からない', emoji: '❓', desc: '操作方法・機能が分からない' },
  { value: 'その他',           label: 'その他',           emoji: '💬', desc: 'ご意見・ご要望など' },
] as const;

type Category = typeof CATEGORIES[number]['value'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const [category,     setCategory]     = useState<Category | ''>('');
  const [message,      setMessage]      = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [pageUrl,      setPageUrl]      = useState('');
  const [sending,      setSending]      = useState(false);
  const [sent,         setSent]         = useState(false);
  const [error,        setError]        = useState('');

  // ページURL を自動取得（from クエリ優先 → referrer フォールバック）
  useEffect(() => {
    const from = searchParams.get('from');
    if (from) {
      setPageUrl(from);
    } else if (document.referrer) {
      try {
        const ref = new URL(document.referrer);
        setPageUrl(ref.pathname + ref.search);
      } catch { /* ignore */ }
    }
  }, [searchParams]);

  // 利用者種別（localStorage から取得）
  function getUserRole(): string {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return '';
      const u = JSON.parse(stored);
      return u?.role ?? '';
    } catch { return ''; }
  }
  function getUserId(): string {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) return '';
      const u = JSON.parse(stored);
      return u?.id ?? '';
    } catch { return ''; }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) { setError('種類を選んでください'); return; }
    if (!message.trim()) { setError('内容を入力してください'); return; }
    setError('');
    setSending(true);

    try {
      const res = await fetch('/api/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          category,
          message:      message.trim(),
          contactEmail: contactEmail.trim() || undefined,
          pageUrl:      pageUrl.trim()      || undefined,
          userRole:     getUserRole()        || undefined,
          userId:       getUserId()          || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? '送信に失敗しました。時間をおいて再試行してください。');
        return;
      }
      setSent(true);
    } catch {
      setError('ネットワークエラーが発生しました。時間をおいて再試行してください。');
    } finally {
      setSending(false);
    }
  };

  // ── 送信完了画面 ──────────────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-5 text-3xl">
            ✅
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 mb-2">送信しました</h1>
          <p className="text-sm text-slate-600 leading-relaxed mb-2">
            改善に役立てます。ありがとうございます。
          </p>
          <p className="text-xs text-slate-400 leading-relaxed mb-8">
            いただいた内容は運営が確認します。<br />
            返信が必要な場合のみ、入力いただいたメールアドレスへご連絡します。
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-full py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition active:scale-95"
            >
              ← 前のページへ戻る
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-2xl bg-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-200 transition active:scale-95"
            >
              トップページへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── フォーム画面 ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-slate-600 text-sm transition"
          >
            ← 戻る
          </button>
          <h1 className="text-base font-extrabold text-slate-900">気づいたことを教えてください</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* 説明 */}
        <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-4 space-y-1.5">
          <p className="text-sm font-semibold text-blue-900 leading-relaxed">
            気になったことを1行だけでも大丈夫です。
          </p>
          <p className="text-sm text-blue-700 leading-relaxed">
            「ここ分かりにくかった」だけでも改善の助けになります。
          </p>
          <p className="text-[11px] text-blue-500 leading-relaxed pt-0.5">
            いただいた内容は運営が確認し、サービス改善に役立てています。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* 種類 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2.5">
              種類 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(({ value, label, emoji, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={`text-left rounded-xl border px-3.5 py-3 transition active:scale-95 ${
                    category === value
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <p className="text-base leading-none mb-1">{emoji}</p>
                  <p className="text-xs font-bold leading-tight">{label}</p>
                  <p className={`text-[10px] mt-0.5 leading-tight ${category === value ? 'text-blue-100' : 'text-slate-400'}`}>
                    {desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 内容 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="どの画面で、何が起きたかを教えてください。「〇〇ボタンを押したら動かなかった」など、できるだけ具体的に書いていただけると助かります。"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none leading-relaxed"
            />
            <p className="text-right text-[10px] text-slate-300 mt-1">{message.length}/2000</p>
          </div>

          {/* 連絡先（任意） */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              連絡先メールアドレス
              <span className="ml-2 text-[11px] font-normal text-slate-400">任意</span>
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="返信が必要な場合のみ"
              autoComplete="email"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* ページURL（自動取得・表示のみ） */}
          {pageUrl && (
            <div>
              <p className="text-[11px] text-slate-400 mb-1">送信時に含まれるページ情報</p>
              <p className="text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2 break-all">{pageUrl}</p>
            </div>
          )}

          {/* エラー */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={sending || !category || !message.trim()}
            className={`w-full py-4 rounded-2xl text-sm font-extrabold transition active:scale-[0.98] ${
              sending || !category || !message.trim()
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200'
            }`}
          >
            {sending ? '送信中...' : '送信する'}
          </button>

          <p className="text-center text-[11px] text-slate-400 leading-relaxed">
            個人情報は返信以外の目的には使用しません。<br />
            連絡先は入力しなくても送信できます。
          </p>
        </form>

        {/* 戻る導線 */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 rounded-xl text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            ← 前のページへ戻る
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-xl text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            トップページへ
          </button>
        </div>
      </div>
    </div>
  );
}
