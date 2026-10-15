'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { ApiError } from '@/lib/api';
import { ROLE_NAMES, t, type LabelKey } from '@/lib/i18n';
import { Leaf, LangSwitch } from '../components/Brand';

type NavItem = { href: string; label: LabelKey; roles?: string[] };
const NAV: NavItem[] = [
  { href: '/home', label: 'home' },
  { href: '/admin/staff', label: 'staff', roles: ['OA', 'BM'] },
  { href: '/admin/teams', label: 'teams', roles: ['OA', 'BM'] },
  { href: '/admin/lists', label: 'lists', roles: ['OA', 'BM'] },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { me, lang, refresh, signOut } = useSession();
  const router = useRouter();
  const path = usePathname();
  const [state, setState] = useState<'loading' | 'ready' | 'offline'>(me ? 'ready' : 'loading');

  useEffect(() => {
    refresh()
      .then((m) => { if (m?.mustChangePassword) router.replace('/change-password'); else setState('ready'); })
      .catch((e) => (e instanceof ApiError && e.status === 0 ? setState('offline') : router.replace('/login')));
  }, [refresh, router]);

  if (state === 'offline') return <main className="splash"><p className="msg error">{t('offline', lang)}</p></main>;
  if (!me || state === 'loading') return <main className="splash"><Leaf size={56} /></main>;

  const items = NAV.filter((n) => !n.roles || n.roles.includes(me.role));
  return (
    <div className="shell" lang={lang}>
      <aside className="side">
        <Link href="/home" className="side-brand"><Leaf size={32} /><span>Dembel Hub</span></Link>
        <nav aria-label="Main">
          {items.map((n) => (
            <Link key={n.href} href={n.href} className={path?.startsWith(n.href) ? 'on' : ''} aria-current={path?.startsWith(n.href) ? 'page' : undefined}>
              {t(n.label, lang)}
            </Link>
          ))}
        </nav>
        <div className="side-me">
          <strong>{me.fullName}</strong>
          <span className="code">{me.staffCode}</span>
          <span>{ROLE_NAMES[me.role]?.[lang]}{me.team ? `, ${me.team.name}` : ''}</span>
          <div className="side-actions"><LangSwitch /><button className="btn link" onClick={signOut}>{t('signOut', lang)}</button></div>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
