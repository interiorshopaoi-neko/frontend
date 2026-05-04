interface Props {
  size?: number;
  showText?: boolean;
  /** ダーク背景上で使う場合 true にするとテキストを白にする */
  dark?: boolean;
  className?: string;
}

export default function Logo({ size = 32, showText = true, dark = false, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/*
        ── アイコン：3D室内コーナー ─────────────────────────────
        参照デザイン：
          - 外枠：角丸スクエア（dark navy）
          - 左壁：medium blue-gray
          - 奥壁：light blue-gray
          - 床  ：slightly darker blue-gray
          - チェックマーク：indigo-600 (#4f46e5)
      */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── 外枠 ── */}
        <rect x="1" y="1" width="42" height="42" rx="9"
          fill="white" stroke="#0f172a" strokeWidth="2" />

        {/* ── 奥壁（右上エリア） ── */}
        <rect x="18" y="5" width="21" height="21" fill="#e2e8f2" />

        {/* ── 左壁 ── */}
        <rect x="5" y="5" width="13" height="32" fill="#c8d2e3" />

        {/* ── 床 ── */}
        <rect x="5" y="26" width="34" height="13" fill="#b8c4d6" />

        {/* ── 室内コーナーライン ── */}
        <path d="M18 5 L18 26 L39 26"
          stroke="#94a3b8" strokeWidth="0.75" />

        {/* ── チェックマーク（インディゴ・床に映える位置） ── */}
        <path d="M11 24 L18 31 L34 14"
          stroke="#4f46e5" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={`font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}
            style={{ fontSize: size * 0.42 }}
          >
            内装見積もり
          </span>
          <span
            className={`tracking-widest font-medium ${dark ? 'text-slate-400' : 'text-slate-400'}`}
            style={{ fontSize: size * 0.19, letterSpacing: '0.12em' }}
          >
            NAISOU ESTIMATE
          </span>
        </div>
      )}
    </div>
  );
}
