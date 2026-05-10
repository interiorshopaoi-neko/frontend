interface Props {
  size?: number;
  /** true（デフォルト）のとき logo-full.png、false のとき logo-icon.png を表示 */
  showText?: boolean;
  /** 後方互換のため残す（PNG ファイル側で色を持つため効果なし） */
  dark?: boolean;
  className?: string;
}

/**
 * PRO MATCH ロゴ
 * - showText=true  → /logo-full.png  （横長・テキスト付き）
 * - showText=false → /logo-icon.png  （アイコンのみ）
 *
 * Phase UI-1: 全体で PNG に統一（SVG/PNG 混在を解消）。
 * 既存 API (size / showText / dark / className) は完全互換。
 */
export default function Logo({ size = 32, showText = true, className = '' }: Props) {
  if (showText) {
    return (
      <img
        src="/logo-full.png"
        alt="PRO MATCH"
        style={{ height: size, width: 'auto' }}
        className={`object-contain ${className}`}
      />
    );
  }
  return (
    <img
      src="/logo-icon.png"
      alt="PRO MATCH"
      style={{ height: size, width: size }}
      className={`object-contain ${className}`}
    />
  );
}
