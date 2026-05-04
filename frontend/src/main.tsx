import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LangProvider, useLangContext } from './context/LangContext'

function I18nGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const nodes = document.querySelectorAll('*');
    nodes.forEach((node) => {
      if (node.childNodes.length === 1 && node.childNodes[0].nodeType === 3) {
        const text = node.textContent?.trim();
        if (text && /[ぁ-んァ-ン]/.test(text)) {
          console.warn('⚠️ 未翻訳テキスト検出:', text);
        }
      }
    });
  });
  return <>{children}</>;
}

function AppWithKey() {
  const { lang } = useLangContext();
  return (
    <I18nGuard>
      <div key={lang}>
        <App />
      </div>
    </I18nGuard>
  );
}

const container = document.getElementById('root')!;
const root = (container as any).__root ?? createRoot(container);
(container as any).__root = root;
root.render(
  <StrictMode>
    <LangProvider>
      <AppWithKey />
    </LangProvider>
  </StrictMode>,
)
