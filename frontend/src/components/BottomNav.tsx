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

function IconClipboard({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}

function IconTools({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

// ── タブ定義 ────────────────────────────────────────────────────────────────

const TABS = [
  {
    href: '/craftsman/jobs',
    label: '案件',
    Icon: IconBriefcase,
    match: (p: string) => p.startsWith('/craftsman/jobs') || p.startsWith('/craftsman/apply'),
  },
  {
    href: '/craftsman/dashboard',
    label: '管理',
    Icon: IconClipboard,
    match: (p: string) => p.startsWith('/craftsman/dashboard') || p.startsWith('/craftsman/applications'),
  },
  {
    href: '/craftsman/help-list',
    label: '応援',
    Icon: IconHandshake,
    match: (p: string) => p.startsWith('/craftsman/help'),
  },
  {
    href: '/craftsman/profile',
    label: 'マイページ',
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
  /** トップページなど、職人向けでないページでは控えめに表示 */
  subtle?: boolean;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function BottomNav({ variant = 'fixed', subtle = false }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const outerClass =
    variant === 'fixed'
      ? 'fixed bottom-0 left-0 right-0 z-40'
      : 'flex-shrink-0';

  return (
    <nav
      className={`${outerClass} border-t ${subtle ? 'bg-white/80 backdrop-blur-sm border-slate-100' : 'bg-white border-slate-200'}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4 h-14 max-w-lg mx-auto">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          const activeColor  = subtle ? 'text-slate-600' : 'text-blue-600';
          const inactiveColor = subtle ? 'text-slate-300' : 'text-slate-400';
          return (
            <button
              key={href}
              onClick={() => navigate(href)}
              className={`flex flex-col items-center justify-center gap-0.5 relative transition-colors active:scale-95 ${
                active ? activeColor : inactiveColor
              }`}
            >
              {/* アクティブインジケーター（上線）— subtle では非表示 */}
              {active && !subtle && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}
              <Icon active={active} />
              <span className={`text-[10px] leading-none ${
                active
                  ? subtle ? 'font-semibold' : 'font-bold'
                  : 'font-medium'
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
