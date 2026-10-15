'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { ROLE_NAMES } from '@/lib/i18n';
import { Leaf } from '../../../components/Brand';

type Staff = {
  id: string; staffCode: string; fullName: string; phone: string | null; role: string; status: 'ACTIVE' | 'ON_LEAVE' | 'DEACTIVATED';
  joinedOn: string | null; deactivatedOn: string | null; mustChangePassword: boolean; hasPassword: boolean; lastLoginAt: string | null;
  teamId: string | null; teamCode: string | null; teamName: string | null;
};
type Team = { id: string; code: string; name: string; active: boolean };
type Credential = { staffCode: string; fullName: string; tempPassword: string; role?: string; isNew: boolean };

const ROLE_ORDER = ['SR', 'SS', 'TM', 'SM', 'MM', 'DS', 'MD', 'BM', 'OA'];
const today = () => new Date().toISOString().slice(0, 10);

function signInState(s: Staff) {
  if (s.status === 'DEACTIVATED') return { label: `Left ${s.deactivatedOn ?? ''}`.trim(), tone: 'muted' };
  if (!s.hasPassword) return { label: 'No password yet', tone: 'warn' };
  if (s.mustChangePassword) return { label: 'Temporary password', tone: 'warn' };
  if (!s.lastLoginAt) return { label: 'Never signed in', tone: 'warn' };
  return { label: `Last sign-in ${new Date(s.lastLoginAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`, tone: 'ok' };
}

export default function StaffPage() {
  const { me, lang } = useSession();
  const canEdit = me?.role === 'OA';
  const [rows, setRows] = useState<Staff[] | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [team, setTeam] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'DEACTIVATED' | ''>('ACTIVE');
  const [selected, setSelected] = useState<Staff | null>(null);
  const [adding, setAdding] = useState(false);
  const [credential, setCredential] = useState<Credential | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([api<Staff[]>('/admin/staff'), api<Team[]>('/admin/teams')]);
      setRows(s); setTeams(t); setError(null);
      setSelected((cur) => (cur ? s.find((x) => x.id === cur.id) ?? null : null));
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    return rows.filter((s) =>
      (!status || s.status === status) && (!role || s.role === role) && (!team || s.teamId === team) &&
      (!needle || s.fullName.toLowerCase().includes(needle) || s.staffCode.toLowerCase().includes(needle) || (s.phone ?? '').includes(needle.replace(/\s/g, ''))));
  }, [rows, q, team, role, status]);

  const counts = useMemo(() => ({
    active: rows?.filter((s) => s.status === 'ACTIVE').length ?? 0,
    pending: rows?.filter((s) => s.status === 'ACTIVE' && (!s.hasPassword || s.mustChangePassword)).length ?? 0,
  }), [rows]);

  return (
    <section className="page wide">
      <div className="page-head">
        <div>
          <h1>Staff</h1>
          <p className="lede">{counts.active} active · {counts.pending} still need to set their own password</p>
        </div>
        {canEdit && <button className="btn primary" onClick={() => { setAdding(true); setSelected(null); setCredential(null); }}>Add staff member</button>}
      </div>

      <div className="toolbar" role="search">
        <input aria-label="Search staff" placeholder="Search name, staff ID or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Team" value={team} onChange={(e) => setTeam(e.target.value)}>
          <option value="">All teams</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {ROLE_ORDER.map((r) => <option key={r} value={r}>{ROLE_NAMES[r][lang]}</option>)}
        </select>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="ACTIVE">Active</option>
          <option value="DEACTIVATED">Left the branch</option>
          <option value="">Everyone</option>
        </select>
      </div>

      {error && <p className="msg error" role="alert">{error}</p>}

      <div className="split">
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th className="c-id">Staff ID</th><th>Name</th><th className="c-role">Role</th><th className="c-team">Team</th><th>Sign-in</th></tr></thead>
            <tbody>
              {!rows && <tr><td colSpan={5} className="empty">Loading staff…</td></tr>}
              {rows && filtered.length === 0 && <tr><td colSpan={5} className="empty">No staff match these filters.</td></tr>}
              {filtered.map((s) => {
                const st = signInState(s);
                return (
                  <tr key={s.id} className={selected?.id === s.id ? 'sel' : ''} onClick={() => { setSelected(s); setAdding(false); setCredential(null); }}
                    tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') { setSelected(s); setAdding(false); setCredential(null); } }}>
                    <td className="code c-id">{s.staffCode}</td>
                    <td>
                      <strong>{s.fullName}</strong>
                      <small className="only-phone">{s.staffCode}{s.teamName ? ` · ${s.teamName}` : ''}</small>
                      {s.phone && <small>{s.phone.replace('+251', '0')}</small>}
                    </td>
                    <td className="c-role">{ROLE_NAMES[s.role]?.[lang] ?? s.role}</td>
                    <td className="c-team">{s.teamName ?? '—'}</td>
                    <td><span className={`pill ${st.tone}`}>{st.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(adding || selected || credential) && (
          <aside className="panel" aria-live="polite">
            {credential ? (
              <CredentialCard c={credential} onDone={() => setCredential(null)} />
            ) : adding ? (
              <AddForm teams={teams} onCancel={() => setAdding(false)}
                onCreated={(c) => { setAdding(false); setCredential({ ...c, isNew: true }); load(); }} />
            ) : selected ? (
              <Detail s={selected} teams={teams} canEdit={canEdit} onChanged={load} onClose={() => setSelected(null)}
                onReset={(c) => setCredential({ ...c, isNew: false })} />
            ) : null}
          </aside>
        )}
      </div>
    </section>
  );
}

function AddForm({ teams, onCancel, onCreated }: { teams: Team[]; onCancel: () => void; onCreated: (c: Omit<Credential, 'isNew'>) => void }) {
  const { lang } = useSession();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('SR');
  const [teamId, setTeamId] = useState('');
  const [joinedOn, setJoinedOn] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsTeam = role === 'SR' || role === 'SS';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await api<{ staffCode: string; fullName: string; tempPassword: string }>('/admin/staff', {
        body: { fullName, phone: phone || null, role, teamId: needsTeam && teamId ? teamId : null, joinedOn },
      });
      onCreated({ ...r, role });
    } catch (err) { setError((err as Error).message); setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="form">
      <h2>Add staff member</h2>
      <p className="hint">The staff ID is issued automatically. You will see a temporary password once, to give to the person.</p>
      <label htmlFor="n">Full name</label>
      <input id="n" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />
      <label htmlFor="p">Mobile number <span className="opt">optional, lets them sign in with it</span></label>
      <input id="p" inputMode="tel" placeholder="0911 22 33 44" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <label htmlFor="r">Role</label>
      <select id="r" value={role} onChange={(e) => setRole(e.target.value)}>
        {ROLE_ORDER.map((r) => <option key={r} value={r}>{ROLE_NAMES[r][lang]}</option>)}
      </select>
      {needsTeam && (<>
        <label htmlFor="t">{role === 'SS' ? 'Team they will lead' : 'Team'}</label>
        <select id="t" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value="">Not assigned yet</option>
          {teams.filter((t) => t.active).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </>)}
      <label htmlFor="j">Joins on</label>
      <input id="j" type="date" value={joinedOn} onChange={(e) => setJoinedOn(e.target.value)} />
      {error && <p className="msg error" role="alert">{error}</p>}
      <div className="row">
        <button className="btn primary" disabled={busy || fullName.trim().length < 2}>{busy ? 'Creating…' : 'Create staff ID'}</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function CredentialCard({ c, onDone }: { c: Credential; onDone: () => void }) {
  const { lang } = useSession();
  const [copied, setCopied] = useState(false);
  const text = `Dembel Performance Hub\nStaff ID: ${c.staffCode}\nTemporary password: ${c.tempPassword}\nSign in and choose your own password.`;
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* user can read it off the card */ }
  }
  return (
    <div className="cred-wrap">
      <h2>{c.isNew ? 'Staff ID created' : 'Password reset'}</h2>
      <div className="cred" role="group" aria-label="Sign-in details">
        <div className="cred-band"><Leaf size={28} /><span>Temer Real Estate · Dembel</span></div>
        <div className="cred-body">
          <p className="cred-name">{c.fullName}</p>
          {c.role && <p className="cred-role">{ROLE_NAMES[c.role]?.[lang]}</p>}
          <dl>
            <div><dt>Staff ID</dt><dd className="cred-id">{c.staffCode}</dd></div>
            <div><dt>Temporary password</dt><dd className="cred-pw">{c.tempPassword}</dd></div>
          </dl>
          <p className="cred-note">Sign in at this address, then choose a personal password.</p>
        </div>
      </div>
      <p className="hint">This password is shown only now. Give it to {c.fullName.split(' ')[0]} in person or by direct message. If it’s lost, reset it again.</p>
      <div className="row">
        <button className="btn primary" onClick={copy}>{copied ? 'Copied' : 'Copy sign-in details'}</button>
        <button className="btn" onClick={onDone}>Done</button>
      </div>
    </div>
  );
}

function Detail({ s, teams, canEdit, onChanged, onClose, onReset }: {
  s: Staff; teams: Team[]; canEdit: boolean; onChanged: () => void; onClose: () => void; onReset: (c: Omit<Credential, 'isNew'>) => void;
}) {
  const { me, lang } = useSession();
  const [fullName, setFullName] = useState(s.fullName);
  const [phone, setPhone] = useState(s.phone?.replace('+251', '0') ?? '');
  const [moveTo, setMoveTo] = useState(s.teamId ?? '');
  const [date, setDate] = useState(today());
  const [confirm, setConfirm] = useState<'deactivate' | 'reset' | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    setFullName(s.fullName); setPhone(s.phone?.replace('+251', '0') ?? ''); setMoveTo(s.teamId ?? ''); setConfirm(null); setMsg(null);
  }, [s]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ text: ok }); setConfirm(null); onChanged(); }
    catch (e) { setMsg({ text: (e as Error).message, error: true }); }
    finally { setBusy(false); }
  }

  const dirty = fullName !== s.fullName || phone !== (s.phone?.replace('+251', '0') ?? '');
  const active = s.status === 'ACTIVE';
  const isMe = me?.id === s.id;

  return (
    <div className="form">
      <div className="panel-head">
        <div><h2>{s.fullName}</h2><p className="code">{s.staffCode}</p></div>
        <button className="btn link" onClick={onClose} aria-label="Close">Close</button>
      </div>
      <p className="facts">{ROLE_NAMES[s.role]?.[lang]}{s.teamName ? `, ${s.teamName}` : ''}{s.joinedOn ? ` · joined ${s.joinedOn}` : ''}</p>

      {canEdit && active && (<>
        <label htmlFor="dn">Full name</label>
        <input id="dn" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <label htmlFor="dp">Mobile number</label>
        <input id="dp" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0911 22 33 44" />
        <button className="btn" disabled={!dirty || busy}
          onClick={() => run(() => api(`/admin/staff/${s.id}`, { method: 'PATCH', body: { fullName, phone: phone || null } }), 'Saved.')}>Save changes</button>

        {s.role === 'SR' && (<>
          <h3>Move to another team</h3>
          <div className="row">
            <select aria-label="New team" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
              <option value="">No team</option>
              {teams.filter((t) => t.active).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input aria-label="From date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button className="btn" disabled={busy || moveTo === (s.teamId ?? '')}
            onClick={() => run(() => api(`/admin/staff/${s.id}/move`, { body: { teamId: moveTo || null, date } }), 'Team changed. Past numbers stay with the old team.')}>Move</button>
        </>)}

        <h3>Sign-in</h3>
        {confirm === 'reset' ? (
          <div className="confirm">
            <p>Create a new temporary password for {s.fullName.split(' ')[0]}? Their current password stops working and they are signed out.</p>
            <div className="row">
              <button className="btn primary" disabled={busy} onClick={async () => {
                setBusy(true);
                try { const r = await api<{ staffCode: string; fullName: string; tempPassword: string }>(`/admin/staff/${s.id}/reset-password`, { method: 'POST' }); onChanged(); onReset({ ...r, role: s.role }); }
                catch (e) { setMsg({ text: (e as Error).message, error: true }); setBusy(false); }
              }}>Reset password</button>
              <button className="btn" onClick={() => setConfirm(null)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="btn" disabled={isMe} onClick={() => setConfirm('reset')}>{s.hasPassword ? 'Reset password' : 'Issue first password'}</button>
        )}

        {!isMe && (<>
          <h3>Leaving the branch</h3>
          {confirm === 'deactivate' ? (
            <div className="confirm danger">
              <p>Deactivate {s.fullName} from {date}? They are signed out at once, drop out of team targets from that date, and their past numbers are kept.</p>
              <input aria-label="Last day" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <div className="row">
                <button className="btn danger" disabled={busy} onClick={() => run(() => api(`/admin/staff/${s.id}/deactivate`, { body: { date } }), 'Deactivated.')}>Deactivate</button>
                <button className="btn" onClick={() => setConfirm(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="btn danger-outline" onClick={() => setConfirm('deactivate')}>Deactivate…</button>
          )}
        </>)}
      </>)}

      {canEdit && !active && (
        <button className="btn" disabled={busy} onClick={() => run(() => api(`/admin/staff/${s.id}/reactivate`, { method: 'POST' }), 'Reactivated. Assign a team and reset the password.')}>Reactivate</button>
      )}

      {msg && <p className={`msg ${msg.error ? 'error' : 'ok'}`} role="status">{msg.text}</p>}
    </div>
  );
}
