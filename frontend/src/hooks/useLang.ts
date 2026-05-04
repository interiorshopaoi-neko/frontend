import { useState, useEffect } from 'react';
import { i18n, type Lang, type I18nKey } from '../data/i18n';

export function useLang() {
  const [lang, setLangState] = useState<Lang>(
    (localStorage.getItem('lang') as Lang) || 'jp'
  );
  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('lang', l);
  };
  useEffect(() => {
    if (!localStorage.getItem('lang')) {
      const browserLang = navigator.language;
      if (browserLang.startsWith('en')) setLang('en');
      else if (browserLang.startsWith('zh')) setLang('zh');
      else if (browserLang.startsWith('ko')) setLang('ko');
      else if (browserLang.startsWith('vi')) setLang('vi');
    }
  }, []);

  const t = (key: I18nKey) => i18n[lang]?.[key] || i18n.jp[key] || key;
  return { lang, setLang, t };
}
