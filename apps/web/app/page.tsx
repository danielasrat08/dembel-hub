'use client';
import { useEffect, useState } from 'react';
import { t, type Lang } from '@/lib/i18n';

type Health = {
  status: string;
  version: string;
  database: { status: string; teams: number; activeStaff: number; metrics: number };
};

export default function Home() {
  const [lang, setLang] = useState<Lang>('en');
  const [health, setHealth] = useState<Health | null>(null);
  const [state, setState] = useState<'checking' | 'up' | 'down'>('checking');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('lang');
      if (saved === 'am' || saved === 'en') setLang(saved);
    } catch {}
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((h: Health) => { setHealth(h); setState('up'); })
      .catch(() => setState('down'));
  }, []);

  const switchLang = (l: Lang) => {
    setLang(l);
    try { localStorage.setItem('lang', l); } catch {}
  };

  return (
    <main className="shell" lang={lang === 'am' ? 'am' : 'en'}>
      <header className="top">
        <div className="brand">
          <span className="leaf" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <path d="M12 21V9" /><path d="M12 9c-2-4-6-5-9-4 2 1 4 3 5 6" /><path d="M12 9c2-4 6-5 9-4-2 1-4 3-5 6" />
            </svg>
          </span>
          <div>
            <h1>{t('appName', lang)}</h1>
            <p>{t('branch', lang)}</p>
          </div>
        </div>
        <div className="lang" role="group" aria-label="Language">
          <button type="button" aria-pressed={lang === 'en'} onClick={() => switchLang('en')}>EN</button>
          <button type="button" aria-pressed={lang === 'am'} onClick={() => switchLang('am')}>አማ</button>
        </div>
      </header>

      <section className="card">
        <h2>{t('signIn', lang)}</h2>
        <form onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="sid">{t('staffId', lang)}</label>
          <input id="sid" placeholder="TMR-DMB-SR-0007" autoComplete="username" disabled />
          <label htmlFor="pw">{t('password', lang)}</label>
          <input id="pw" type="password" autoComplete="current-password" disabled />
          <button type="submit" disabled>{t('signIn', lang)}</button>
          <p className="note">{t('signInSoon', lang)}</p>
        </form>
      </section>

      <section className="card">
        <h2>{t('systemStatus', lang)}</h2>
        <dl className="status">
          <div><dt>{t('api', lang)}</dt><dd className={state}>{t(state === 'up' ? 'online' : state === 'down' ? 'offline' : 'checking', lang)}</dd></div>
          <div><dt>{t('database', lang)}</dt><dd className={health?.database.status === 'up' ? 'up' : state}>{health ? t('online', lang) : t(state === 'down' ? 'offline' : 'checking', lang)}</dd></div>
          <div><dt>{t('teams', lang)}</dt><dd>{health?.database.teams ?? '—'}</dd></div>
          <div><dt>{t('activeStaff', lang)}</dt><dd>{health?.database.activeStaff ?? '—'}</dd></div>
          <div><dt>{t('metrics', lang)}</dt><dd>{health?.database.metrics ?? '—'}</dd></div>
        </dl>
        <p className="note">{t('install', lang)}</p>
      </section>
      <footer>v{health?.version ?? '0.1.0'} · Phase 0</footer>
    </main>
  );
}
