import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ── カテゴリー ────────────────────────────────────────────────────────────────
// feedback category UI intentionally avoids bug/insect imagery
// to keep PRO MATCH visually clean and approachable

const CATEGORIES = [
  { value: '不具合',           label: '不具合',           emoji: '⚠️', desc: '画面が動かない・エラーが出る' },
  { value: '改善してほしい',   label: '改善してほしい',   emoji: '💡', desc: 'こうなったらもっと使いやすい' },
  { value: '使い方が分からない', label: '使い方が分からない', emoji: '❓', desc: '操作方法・機能が分からない' },
  { value: 'その他',           label: 'その他',           emoji: '💬', desc: 'ご意見・ご要望など' },
] as const;

type Category = typeof CATEGORIES[number]['value'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getUserInfo(): { role: string; id: string } {
  try {
    const u = JSON.parse(localStorage.getItem('user') ?? '{}');
    return { role: u?.role ?? '', id: u?.id ?? '' };
  } catch { return { role: '', id: '' }; }
}

function collectMeta() {
  return {
    pathname:    window.location.pathname,
    userAgent:   navigator.userAgent,
    viewport:    { width: window.innerWidth, height: window.innerHeight },
    submittedAt: new Date().toISOString(),
  };
}

// base64変換（FileReader wrapper）
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // "data:image/jpeg;base64,XXXX" → "XXXX"
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// ── Component ─────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const [category,     setCategory]     = useState<Category | ''>('');
  const [message,      setMessage]      = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [pageUrl,      setPageUrl]      = useState('');

  // スクショ添付
  const [imageFile,     setImageFile]     = useState<File | null>(null);
  const [imagePreview,  setImagePreview]  = useState<string>('');
  const [imageError,    setImageError]    = useState('');
  const [uploading,     setUploading]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  // ページURL自動取得
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

  // ── 画像選択ハンドラ ──────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError('jpg / png / webp のみ添付できます');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('5MB 以下の画像を選んでください');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setImageError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── 送信 ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) { setError('種類を選んでください'); return; }
    if (!message.trim()) { setError('内容を入力してください'); return; }
    setError('');
    setSending(true);

    try {
      // 1. スクショがあればアップロード
      let screenshotUrl: string | undefined;
      if (imageFile) {
        setUploading(true);
        try {
          const base64   = await fileToBase64(imageFile);
          const uploadRes = await fetch('/api/upload-feedback-image', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ base64, mimeType: imageFile.type }),
          });
          const uploadData = await uploadRes.json().catch(() => ({}));
          if (uploadRes.ok && uploadData.publicUrl) {
            screenshotUrl = uploadData.publicUrl;
          } else {
            // アップロード失敗はスクショなしで続行
            console.warn('[feedback] screenshot upload failed, continuing without it', uploadData);
          }
        } catch (uploadErr) {
          console.warn('[feedback] screenshot upload error, continuing without it', uploadErr);
        } finally {
          setUploading(false);
        }
      }

      // 2. フィードバック本体を送信
      const { role: userRole, id: userId } = getUserInfo();
      const res = await fetch('/api/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          category,
          message:      message.trim(),
          contactEmail: contactEmail.trim() || undefined,
          pageUrl:      pageUrl.trim()      || undefined,
          userRole:     userRole            || undefined,
          userId:       userId              || undefined,
          screenshotUrl,
          meta: collectMeta(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('[feedback] submit error:', data);
        setError('送信できませんでした。通信状態をご確認の上、もう一度お試しください。');
        return;
      }
      setSent(true);
    } catch (err) {
      console.error('[feedback] network error:', err);
      setError('送信できませんでした。通信状態をご確認の上、もう一度お試しください。');
    } finally {
      setSending(false);
    }
  };

  // ── 送信完了画面 ──────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-5 text-3xl">
            ✓
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 mb-2">ご報告ありがとうございます</h1>
          <p className="text-sm text-slate-600 leading-relaxed mb-1">
            いただいた内容は運営に送信されました。
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-8">
            改善に活用させていただきます。
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-full py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition active:scale-95"
            >
              ← 前のページへ戻る
            </button>
            <button
              onClick={() => {
                setCategory('');
                setMessage('');
                setContactEmail('');
                setImageFile(null);
                setImagePreview('');
                setImageError('');
                setSent(false);
              }}
              className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition active:scale-95"
            >
              続けて送る
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-2xl text-slate-400 text-sm font-semibold hover:text-slate-600 hover:bg-slate-100 transition active:scale-95"
            >
              トップページへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── フォーム画面 ──────────────────────────────────────────────────
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
            1行だけでも大丈夫です。
          </p>
          <p className="text-sm text-blue-700 leading-relaxed">
            「ここが分かりにくかった」だけでも改善の助けになります。
          </p>
          <p className="text-[11px] text-blue-500 leading-relaxed pt-0.5">
            いただいた内容は運営が確認し、サービス改善に役立てています。<br />
            返信が必要な場合のみ、入力いただいたメールアドレスへご連絡します。
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
              placeholder="どの画面で、何が気になりましたか？「〇〇ボタンを押したら動かなかった」など、1行だけでも大丈夫です。"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none leading-relaxed"
            />
            <p className="text-right text-[10px] text-slate-300 mt-1">{message.length}/2000</p>
          </div>

          {/* スクショ添付（任意） */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              スクリーンショット
              <span className="ml-2 text-[11px] font-normal text-slate-400">任意・1枚・5MB以下</span>
            </label>

            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="添付プレビュー"
                  className="w-full max-h-48 object-cover rounded-xl border border-slate-200"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/60 text-white flex items-center justify-center text-xs hover:bg-slate-900 transition"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 px-4 py-5 text-center transition"
              >
                <p className="text-2xl mb-1">📎</p>
                <p className="text-xs font-bold text-slate-500">タップして画像を選ぶ</p>
                <p className="text-[10px] text-slate-300 mt-0.5">jpg / png / webp</p>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleImageSelect}
            />
            {imageError && (
              <p className="text-xs text-red-500 mt-1">{imageError}</p>
            )}
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
            {uploading ? '画像をアップロード中...' : sending ? '送信中...' : '送信する'}
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
