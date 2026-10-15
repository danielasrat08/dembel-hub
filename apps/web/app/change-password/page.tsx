'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { t } from '@/lib/i18n';
import { BrandLine, LangSwitch } from '../components/Brand';

export default function ChangePassword() {
  const { me, lang, refresh, signOut } = useSession();
  const router = useRouter();
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!me) refresh().catch(() => router.replace('/login')); }, [me, refresh, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) return setError(t('mismatch', lang));
    setBusy(true); setError(null);
    try {
      await api('/auth/change-password', { body: { currentPassword: cur, newPassword: pw } });
      await refresh();
      router.replace('/home');
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="auth" lang={lang}>
      <header className="auth-top"><BrandLine /><LangSwitch /></header>
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>{t('newPasswordTitle', lang)}</h1>
        {me && <p className="who">{me.fullName} <span className="code">{me.staffCode}</span></p>}
        <p className="hint">{t('newPasswordHelp', lang)}</p>
        <label htmlFor="cur">{t('currentPassword', lang)}</label>
        <input id="cur" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
        <label htmlFor="pw">{t('newPassword', lang)}</label>
        <input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" minLength={8} />
        <label htmlFor="pw2">{t('repeatPassword', lang)}</label>
        <input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
        {error && <p className="msg error" role="alert">{error}</p>}
        <button className="btn primary wide" type="submit" disabled={busy || !cur || !pw || !pw2}>{t('savePassword', lang)}</button>
        <button className="btn link" type="button" onClick={signOut}>{t('signOut', lang)}</button>
      </form>
    </main>
  );
}
