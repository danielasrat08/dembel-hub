'use client';
import { useSession } from '@/lib/session';
import { t } from '@/lib/i18n';

export function Leaf({ size = 36 }: { size?: number }) {
  return (
    <span className="leaf" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <path d="M12 21V9" /><path d="M12 9c-2-4-6-5-9-4 2 1 4 3 5 6" /><path d="M12 9c2-4 6-5 9-4-2 1-4 3-5 6" />
      </svg>
    </span>
  );
}

export function LangSwitch() {
  const { lang, setLang } = useSession();
  return (
    <div className="lang" role="group" aria-label="Language / ቋንቋ">
      <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
      <button type="button" aria-pressed={lang === 'am'} onClick={() => setLang('am')}>አማ</button>
    </div>
  );
}

export function BrandLine() {
  const { lang } = useSession();
  return (
    <div className="brand">
      <Leaf />
      <div>
        <strong>{t('appName', lang)}</strong>
        <span>{t('branch', lang)}</span>
      </div>
    </div>
  );
}
