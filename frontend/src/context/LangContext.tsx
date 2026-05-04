import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { i18n, type Lang, type I18nKey } from '../data/i18n';

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: I18nKey) => string;
}

const LangContext = createContext<LangContextType | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    (localStorage.getItem('lang') as Lang) || 'jp'
  );

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('lang', l);
  };

  useEffect(() => {
    if (!localStorage.getItem('lang')) {
      const b = navigator.language;
      if (b.startsWith('en')) setLang('en');
      else if (b.startsWith('zh')) setLang('zh');
      else if (b.startsWith('ko')) setLang('ko');
      else if (b.startsWith('vi')) setLang('vi');
    }
  }, []);

  useEffect(() => {
    const syncLang = (e: StorageEvent) => {
      if (e.key === 'lang' && e.newValue) setLangState(e.newValue as Lang);
    };
    window.addEventListener('storage', syncLang);
    return () => window.removeEventListener('storage', syncLang);
  }, []);

  const t = (key: I18nKey) => i18n[lang]?.[key] || i18n.jp[key] || key;

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLangContext() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLangContext must be used within LangProvider');
  return ctx;
}
