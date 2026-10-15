'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { ApiError } from '@/lib/api';
import { Leaf } from './components/Brand';

/** Entry point: send people to their home screen, the password screen, or sign-in. */
export default function Index() {
  const { refresh } = useSession();
  const router = useRouter();
  useEffect(() => {
    refresh()
      .then((m) => router.replace(m?.mustChangePassword ? '/change-password' : '/home'))
      .catch((e) => router.replace(e instanceof ApiError && e.status === 0 ? '/login?offline=1' : '/login'));
  }, [refresh, router]);
  return <main className="splash"><Leaf size={56} /></main>;
}
