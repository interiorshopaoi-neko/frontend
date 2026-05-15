interface Props {
  size?: number;
  /** true（デフォルト）のとき logo-full.png、false のとき logo-icon.png を表示 */
  showText?: boolean;
  /**
   * true のとき白抜き表示（暗い背景用）。
   * CSS filter: brightness(0) invert(1) で実現。
   */
  dark?: boolean;
  className?: string;
}

/**
 * PRO MATCH ロゴ
 * ※ ロゴは logo-full.png を唯一の正式ファイルとして使用。SVG は使用禁止。
 * - showText=true  → /logo-full.png  （横長・テキスト付き）
 * - showText=false → /logo-icon.png  （アイコンのみ）
 */
export default function Logo({ size = 32, showText = true, dark = false, className = '' }: Props) {
  const filter = dark ? 'brightness(0) invert(1)' : undefined;
  if (showText) {
    return (
      <img
        src="/logo-full.png"
        alt="PRO MATCH"
        style={{ height: size, width: 'auto', filter }}
        className={`object-contain ${className}`}
      />
    );
  }
  return (
    <img
      src="/logo-icon.png"
      alt="PRO MATCH"
      style={{ height: size, width: size, filter }}
      className={`object-contain ${className}`}
    />
  );
}
