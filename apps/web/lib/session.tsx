'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, type Me } from './api';
import type { Lang } from './i18n';

interface Ctx {
  me: Me | null;
  lang: Lang;
  setLang: (l: Lang) => void;
  refresh: () => Promise<Me | null>;
  signOut: () => Promise<void>;
}
const SessionCtx = createContext<Ctx | null>(null);

function storedLang(): Lang {
  try {
    const v = localStorage.getItem('lang');
    return v === 'am' ? 'am' : 'en';
  } catch {
    return 'en';
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [lang, setLangState] = useState<Lang>('en');
  const router = useRouter();

  useEffect(() => setLangState(storedLang()), []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('lang', l); } catch {}
    api('/auth/language', { body: { lang: l.toUpperCase() } }).catch(() => undefined);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const m = await api<Me>('/auth/me');
      setMe(m);
      return m;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setMe(null);
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setMe(null);
    router.replace('/login');
  }, [router]);

  return <SessionCtx.Provider value={{ me, lang, setLang, refresh, signOut }}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const c = useContext(SessionCtx);
  if (!c) throw new Error('useSession outside SessionProvider');
  return c;
}
