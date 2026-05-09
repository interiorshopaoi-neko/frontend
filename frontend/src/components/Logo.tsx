interface Props {
  size?: number;
  /** true（デフォルト）のとき logo-full.svg、false のとき logo-icon.svg を表示 */
  showText?: boolean;
  /** 後方互換のため残す（SVGファイル側で色を持つため効果なし） */
  dark?: boolean;
  className?: string;
}

/**
 * PRO MATCH ロゴ
 * - showText=true  → /logo-full.svg  （横長・テキスト付き）
 * - showText=false → /logo-icon.svg  （アイコンのみ）
 */
export default function Logo({ size = 32, showText = true, className = '' }: Props) {
  if (showText) {
    return (
      <img
        src="/logo-full.svg"
        alt="PRO MATCH"
        style={{ height: size, width: 'auto' }}
        className={`object-contain ${className}`}
      />
    );
  }
  return (
    <img
      src="/logo-icon.svg"
      alt="PRO MATCH"
      style={{ height: size, width: size }}
      className={`object-contain ${className}`}
    />
  );
}
