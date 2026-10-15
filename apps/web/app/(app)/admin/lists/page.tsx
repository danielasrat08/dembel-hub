'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

type Item = { id: string; name: string; active: boolean; tmCommissionEligible?: boolean };
type Lists = { sites: Item[]; propertyTypes: Item[]; leadOrigins: Item[] };
const SECTIONS: { key: keyof Lists; kind: string; title: string; help: string }[] = [
  { key: 'sites', kind: 'sites', title: 'Sites', help: 'Projects a closed deal or site visit can be recorded against.' },
  { key: 'propertyTypes', kind: 'property-types', title: 'Property types', help: 'Shown on the closed deal form.' },
  { key: 'leadOrigins', kind: 'lead-origins', title: 'Lead origins', help: 'Where a lead came from. Ticked origins make the telemarketer who handled the lead eligible for commission.' },
];

export default function ListsPage() {
  const { me } = useSession();
  const canEdit = me?.role === 'OA';
  const [lists, setLists] = useState<Lists | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setLists(await api<Lists>('/admin/lists')); setError(null); } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function patch(kind: string, id: string, body: object) {
    try { await api(`/admin/lists/${kind}/${id}`, { method: 'PATCH', body }); load(); } catch (e) { setError((e as Error).message); }
  }

  return (
    <section className="page">
      <h1>Sites &amp; lists</h1>
      <p className="lede">These fill the dropdowns on entry forms. Hiding an item keeps it on old records but removes it from new ones.</p>
      {error && <p className="msg error" role="alert">{error}</p>}
      {SECTIONS.map((sec) => (
        <div className="list-block" key={sec.key}>
          <h2>{sec.title}</h2>
          <p className="hint">{sec.help}</p>
          <ul className="items">
            {lists?.[sec.key].map((it) => (
              <li key={it.id} className={it.active ? '' : 'inactive'}>
                <span className="item-name">{it.name}</span>
                {sec.key === 'leadOrigins' && (
                  <label className="check">
                    <input type="checkbox" checked={!!it.tmCommissionEligible} disabled={!canEdit}
                      onChange={(e) => patch(sec.kind, it.id, { tmCommissionEligible: e.target.checked })} />
                    Telemarketer commission
                  </label>
                )}
                {canEdit && <button className="btn link" onClick={() => patch(sec.kind, it.id, { active: !it.active })}>{it.active ? 'Hide' : 'Show again'}</button>}
                {!it.active && <span className="pill muted">hidden</span>}
              </li>
            ))}
          </ul>
          {canEdit && <AddItem kind={sec.kind} onAdded={load} commission={sec.key === 'leadOrigins'} />}
        </div>
      ))}
    </section>
  );
}

function AddItem({ kind, onAdded, commission }: { kind: string; onAdded: () => void; commission: boolean }) {
  const [name, setName] = useState('');
  const [elig, setElig] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function add(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    try { await api(`/admin/lists/${kind}`, { body: commission ? { name, tmCommissionEligible: elig } : { name } }); setName(''); setElig(false); onAdded(); }
    catch (err) { setError((err as Error).message); }
  }
  return (
    <form className="add-item" onSubmit={add}>
      <input aria-label="New item name" placeholder="Add an item" value={name} onChange={(e) => setName(e.target.value)} />
      {commission && <label className="check"><input type="checkbox" checked={elig} onChange={(e) => setElig(e.target.checked)} /> Commission</label>}
      <button className="btn" disabled={name.trim().length < 2}>Add</button>
      {error && <p className="msg error" role="alert">{error}</p>}
    </form>
  );
}
