import { useLangContext } from '../context/LangContext';
import type { Lang } from '../data/i18n';

const FLAGS: { lang: Lang; flag: string }[] = [
  { lang: 'jp', flag: '🇯🇵' },
  { lang: 'en', flag: '🇺🇸' },
  { lang: 'zh', flag: '🇨🇳' },
  { lang: 'ko', flag: '🇰🇷' },
  { lang: 'vi', flag: '🇻🇳' },
];

export default function LangSwitcher() {
  const { lang, setLang } = useLangContext();
  return (
    <div className="flex items-center gap-0.5">
      {FLAGS.map(({ lang: l, flag }) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`text-lg rounded-md px-1 py-0.5 transition-all ${
            lang === l ? 'bg-indigo-100 ring-1 ring-indigo-400' : 'opacity-40 hover:opacity-70'
          }`}
        >
          {flag}
        </button>
      ))}
    </div>
  );
}
