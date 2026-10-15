'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/session';
import { t } from '@/lib/i18n';
import { BrandLine, LangSwitch } from '../components/Brand';

export default function Login() {
  const { lang, refresh } = useSession();
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try { const last = localStorage.getItem('lastLogin'); if (last) setLogin(last); } catch {}
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const timer = setTimeout(() => setSlow(true), 4000); // free hosting wakes slowly
    try {
      const r = await api<{ mustChangePassword: boolean }>('/auth/login', { body: { login: login.trim(), password } });
      try { localStorage.setItem('lastLogin', login.trim()); } catch {}
      await refresh();
      router.replace(r.mustChangePassword ? '/change-password' : '/home');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 0 ? t('offline', lang) : (err as Error).message);
      setBusy(false);
    } finally {
      clearTimeout(timer); setSlow(false);
    }
  }

  return (
    <main className="auth" lang={lang}>
      <header className="auth-top"><BrandLine /><LangSwitch /></header>
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>{t('signIn', lang)}</h1>
        <label htmlFor="login">{t('staffId', lang)}</label>
        <input id="login" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="TMR-DMB-SR-0007 · 0911 22 33 44"
          autoComplete="username" autoCapitalize="characters" spellCheck={false} required />
        <label htmlFor="password">{t('password', lang)}</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        {error && <p className="msg error" role="alert">{error}</p>}
        {slow && !error && <p className="msg">{t('waking', lang)}</p>}
        <button className="btn primary wide" type="submit" disabled={busy || !login || !password}>{busy ? t('signingIn', lang) : t('signIn', lang)}</button>
        <p className="hint">{t('forgot', lang)}</p>
      </form>
    </main>
  );
}
