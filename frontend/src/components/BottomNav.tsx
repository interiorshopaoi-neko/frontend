import { useLocation, useNavigate } from 'react-router-dom';

// ── アイコン ────────────────────────────────────────────────────────────────

function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function IconBriefcase({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="12" />
      <path d="M2 12h20" />
    </svg>
  );
}

function IconHandshake({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.42 4.58a5.4 5.4 0 00-7.65 0l-.77.78-.77-.78a5.4 5.4 0 00-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" />
    </svg>
  );
}

function IconUser({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// ── タブ定義 ────────────────────────────────────────────────────────────────

const TABS = [
  {
    href: '/',
    label: '依頼する',
    Icon: IconHome,
    match: (p: string) => p === '/',
  },
  {
    href: '/craftsman/jobs',
    label: '職人案件',
    Icon: IconBriefcase,
    match: (p: string) => p.startsWith('/craftsman/jobs') || p.startsWith('/craftsman/apply'),
  },
  {
    href: '/craftsman/help-list',
    label: '助っ人',
    Icon: IconHandshake,
    match: (p: string) => p.startsWith('/craftsman/help'),
  },
  {
    href: '/craftsman/profile',
    label: 'プロフィール',
    Icon: IconUser,
    match: (p: string) => p.startsWith('/craftsman/profile'),
  },
] as const;

// ── Props ───────────────────────────────────────────────────────────────────

interface Props {
  /**
   * "fixed"  … 通常ページ（fixed bottom-0）
   * "flex"   … height:100dvh のフレックスレイアウト内（flex-shrink-0）
   */
  variant?: 'fixed' | 'flex';
}

// ── Component ───────────────────────────────────────────────────────────────

export default function BottomNav({ variant = 'fixed' }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const outerClass =
    variant === 'fixed'
      ? 'fixed bottom-0 left-0 right-0 z-40'
      : 'flex-shrink-0';

  return (
    <nav className={`${outerClass} bg-white border-t border-slate-200`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="grid grid-cols-4 h-14 max-w-lg mx-auto">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <button
              key={href}
              onClick={() => navigate(href)}
              className={`flex flex-col items-center justify-center gap-0.5 relative transition-colors active:scale-95 ${
                active ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              {/* アクティブインジケーター（上線） */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}
              <Icon active={active} />
              <span className={`text-[10px] font-semibold leading-none ${
                active ? 'text-blue-600' : 'text-slate-400'
              }`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
