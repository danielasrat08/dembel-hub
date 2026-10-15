'use client';
import Link from 'next/link';
import { useSession } from '@/lib/session';
import { ROLE_NAMES } from '@/lib/i18n';

const COMING: Record<string, string> = {
  SR: 'Your daily entry (raw leads, calls, follow-ups, office and site visits) opens here next, followed by qualified leads and closed deals.',
  TM: 'Your daily entry (calls, contacts reached, qualified leads, appointments) and appointment hand-over open here in Phase 2.',
  SS: 'Your team’s verification queue for visits and closed deals opens here next.',
  SM: 'Appointment assignment, the pipeline and team comparisons open here next.',
  MM: 'The digital marketing dashboard opens here in Phase 2.',
  DS: 'Weekly digital KPIs open here in Phase 3.',
  MD: 'Your task tracker opens here in Phase 3.',
  BM: 'The branch dashboard and HQ report exports open here next. You can already review staff, teams and lists.',
};

export default function Home() {
  const { me, lang } = useSession();
  if (!me) return null;
  const first = me.fullName.split(' ')[0];
  return (
    <section className="page">
      <h1>Welcome, {first}</h1>
      <p className="lede">Signed in as {ROLE_NAMES[me.role]?.[lang]}{me.team ? ` in ${me.team.name}` : ''}.</p>
      {me.role === 'OA' ? (
        <div className="tiles">
          <Link className="tile" href="/admin/staff"><strong>Staff</strong><span>Add people, issue staff IDs and temporary passwords, move reps between teams, deactivate leavers.</span></Link>
          <Link className="tile" href="/admin/teams"><strong>Teams</strong><span>Rename teams, assign supervisors, see active reps per team.</span></Link>
          <Link className="tile" href="/admin/lists"><strong>Sites &amp; lists</strong><span>Sites, property types and lead origins used in the entry forms, including which origins earn telemarketer commission.</span></Link>
        </div>
      ) : (
        <div className="notice"><p>{COMING[me.role] ?? 'More screens for your role are on the way.'}</p></div>
      )}
    </section>
  );
}
