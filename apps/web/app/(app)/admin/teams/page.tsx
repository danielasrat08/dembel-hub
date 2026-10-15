'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

type Team = { id: string; code: string; name: string; active: boolean; supervisorId: string | null; supervisorName: string | null; supervisorCode: string | null; activeReps: number };
type Staff = { id: string; fullName: string; staffCode: string; role: string; status: string };

export default function TeamsPage() {
  const { me } = useSession();
  const canEdit = me?.role === 'OA';
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [sups, setSups] = useState<Staff[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([api<Team[]>('/admin/teams'), api<Staff[]>('/admin/staff')]);
      setTeams(t); setSups(s.filter((x) => x.role === 'SS' && x.status === 'ACTIVE')); setError(null);
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const total = teams?.filter((t) => t.active).reduce((a, t) => a + t.activeReps, 0) ?? 0;

  return (
    <section className="page">
      <div className="page-head">
        <div><h1>Teams</h1><p className="lede">{teams?.filter((t) => t.active).length ?? 0} active teams, {total} active reps. Team targets scale with these headcounts.</p></div>
        {canEdit && !adding && <button className="btn primary" onClick={() => setAdding(true)}>Add team</button>}
      </div>
      {error && <p className="msg error" role="alert">{error}</p>}
      {adding && <NewTeam sups={sups} onDone={() => { setAdding(false); load(); }} />}
      <ul className="team-list">
        {!teams && <li className="empty">Loading teams…</li>}
        {teams?.map((t) => (
          <li key={t.id} className={t.active ? '' : 'inactive'}>
            {editing === t.id ? (
              <EditTeam t={t} sups={sups} onDone={() => { setEditing(null); load(); }} />
            ) : (
              <div className="team-row">
                <div className="team-count" aria-label={`${t.activeReps} active reps`}><strong>{t.activeReps}</strong><span>reps</span></div>
                <div className="team-main">
                  <strong>{t.name}</strong>
                  <span className="code">{t.code}</span>
                  <span>{t.supervisorName ? `Supervisor: ${t.supervisorName}` : 'No supervisor assigned'}{t.active ? '' : ' · inactive'}</span>
                </div>
                {canEdit && <button className="btn" onClick={() => setEditing(t.id)}>Edit</button>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function EditTeam({ t, sups, onDone }: { t: Team; sups: Staff[]; onDone: () => void }) {
  const [name, setName] = useState(t.name);
  const [sup, setSup] = useState(t.supervisorId ?? '');
  const [active, setActive] = useState(t.active);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setError(null);
    try { await api(`/admin/teams/${t.id}`, { method: 'PATCH', body: { name, supervisorId: sup || null, active } }); onDone(); }
    catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return (
    <div className="form inline">
      <label htmlFor={`n-${t.id}`}>Team name</label>
      <input id={`n-${t.id}`} value={name} onChange={(e) => setName(e.target.value)} />
      <label htmlFor={`s-${t.id}`}>Supervisor</label>
      <select id={`s-${t.id}`} value={sup} onChange={(e) => setSup(e.target.value)}>
        <option value="">No supervisor</option>
        {sups.map((s) => <option key={s.id} value={s.id}>{s.fullName} ({s.staffCode})</option>)}
      </select>
      <label className="check"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Team is active</label>
      {error && <p className="msg error" role="alert">{error}</p>}
      <div className="row"><button className="btn primary" disabled={busy} onClick={save}>Save team</button><button className="btn" onClick={onDone}>Cancel</button></div>
    </div>
  );
}

function NewTeam({ sups, onDone }: { sups: Staff[]; onDone: () => void }) {
  const [suffix, setSuffix] = useState('');
  const [name, setName] = useState('');
  const [sup, setSup] = useState('');
  const [error, setError] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try { await api('/admin/teams', { body: { suffix, name, supervisorId: sup || null } }); onDone(); }
    catch (err) { setError((err as Error).message); }
  }
  return (
    <form className="form card" onSubmit={save}>
      <h2>Add team</h2>
      <label htmlFor="ts">Short code <span className="opt">2–5 letters, becomes DMB-T-…</span></label>
      <input id="ts" value={suffix} onChange={(e) => setSuffix(e.target.value.toUpperCase())} maxLength={5} placeholder="ABC" />
      <label htmlFor="tn">Team name</label>
      <input id="tn" value={name} onChange={(e) => setName(e.target.value)} placeholder="Team Abebe" />
      <label htmlFor="tsu">Supervisor</label>
      <select id="tsu" value={sup} onChange={(e) => setSup(e.target.value)}>
        <option value="">Assign later</option>
        {sups.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
      </select>
      {error && <p className="msg error" role="alert">{error}</p>}
      <div className="row"><button className="btn primary">Create team</button><button type="button" className="btn" onClick={onDone}>Cancel</button></div>
    </form>
  );
}
