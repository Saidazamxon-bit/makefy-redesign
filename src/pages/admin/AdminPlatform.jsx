import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui';
import { api, ApiError } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import ErrorNotice from '../../components/ErrorNotice';

export default function AdminPlatform() {
  const [st, setSt] = useState(null);
  const [users, setUsers] = useState(null);
  const [limits, setLimits] = useState(null);
  const [q, setQ] = useState('');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadUsers = () => api.get(`/admin/users.php?q=${encodeURIComponent(q)}`).then((r) => setUsers(r.users)).catch(setErr);
  useEffect(() => {
    api.get('/admin/platform.php').then(setSt).catch(setErr);
    api.get('/admin/limits.php').then((r) => setLimits(r.limits)).catch(() => {});
  }, []);
  useEffect(() => { const t = setTimeout(loadUsers, 300); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(fn, ok) {
    setBusy(true); setErr(null); setMsg('');
    try { const r = await fn(); setMsg(ok || r?.message || 'Bajarildi.'); } catch (e) { setErr(e instanceof ApiError ? e : new Error('Xatolik yuz berdi.')); } finally { setBusy(false); }
  }
  const toggle = (u) => run(async () => { await api.post('/admin/users.php', { user_id: u.user_id, amal: u.blocked ? 'unblock' : 'block' }); loadUsers(); }, u.blocked ? 'Blok olib tashlandi.' : 'Bloklandi.');
  const announce = (e) => { e.preventDefault(); if (!confirm('E‘lon BARCHA foydalanuvchilarga yuborilsinmi?')) return; run(async () => { const r = await api.post('/admin/announce.php', { matn: text }); setText(''); return r; }); };
  const saveLimit = (l) => run(() => api.post('/admin/limits.php', l), 'Limit saqlandi.');
  const setL = (kalit, f, v) => setLimits((ls) => ls.map((l) => (l.kalit === kalit ? { ...l, [f]: v } : l)));

  const cards = st ? [
    ['Foydalanuvchilar', st.users], ['Bloklangan', st.blocked], ['Botlar', st.bots], ['Pullik tarif', st.paidPlans],
    ['Daromad (30 kun)', formatMoney(st.revenue30d)], ['Humo (30 kun)', formatMoney(st.humoPaid30d)], ['Navbat', st.queuePending], ['Xatolar (24 s)', st.errors24h],
  ] : [];
  return (
    <div className="space-y-4 pb-24">
      <PageHeader title="Platforma paneli" subtitle="Platforma bo‘yicha umumiy ko‘rsatkichlar." />
      <ErrorNotice error={err} />
      {msg && <div className="text-[13px] font-semibold text-accent bg-accent-soft rounded-[var(--radius-sm)] px-3 py-2" role="status">{msg}</div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {!st && Array.from({ length: 8 }, (_, i) => <div key={i} className="h-20 rounded-[var(--radius-md)] bg-surface-2 animate-pulse" />)}
        {cards.map(([l, v]) => <div key={l} className="rounded-[var(--radius-md)] bg-surface border border-border p-3"><div className="text-[12px] text-text-muted">{l}</div><div className="text-[18px] font-bold tabular-nums">{v}</div></div>)}
      </div>

      <section className="rounded-[var(--radius-md)] bg-surface border border-border p-4">
        <h2 className="font-bold text-sm mb-2">E‘lon yuborish</h2>
        <form onSubmit={announce} className="space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3} aria-label="E‘lon matni" className="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-surface-2 border border-border text-sm" />
          <button disabled={busy || !text.trim()} className="w-full py-2.5 rounded-[var(--radius-sm)] bg-accent text-accent-text font-bold text-sm disabled:opacity-50">Barchaga yuborish</button>
        </form>
      </section>

      <section className="rounded-[var(--radius-md)] bg-surface border border-border p-4">
        <h2 className="font-bold text-sm mb-2">Foydalanuvchilar</h2>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Login, ID yoki ism" aria-label="Qidirish" className="w-full mb-2 px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-surface-2 border border-border text-sm outline-none focus:border-accent" />
        {!users ? <div className="h-16 bg-surface-2 rounded animate-pulse" /> : users.length === 0 ? <p className="text-[13px] text-text-muted">Topilmadi.</p> : (
          <ul className="divide-y divide-border">
            {users.map((u) => (
              <li key={u.user_id} className="py-2 flex items-center justify-between gap-2 text-[13px]">
                <div className="min-w-0"><b className="truncate">{u.ism || u.login}</b> <span className="text-text-muted font-mono">{u.user_id}</span><div className="text-[12px] text-text-muted">{u.tarif} · {u.bots} bot</div></div>
                <button onClick={() => toggle(u)} disabled={busy} className={'px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-bold border ' + (u.blocked ? 'border-accent text-accent' : 'border-danger text-danger')}>{u.blocked ? 'Blokdan chiqarish' : 'Bloklash'}</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {limits && (
        <section className="rounded-[var(--radius-md)] bg-surface border border-border p-4 overflow-x-auto">
          <h2 className="font-bold text-sm mb-1">Tarif limitlari</h2>
          <p className="text-[12px] text-text-muted mb-2">0 = cheksiz.</p>
          <table className="text-[12.5px] min-w-[560px]"><thead><tr className="text-text-muted text-left"><th>Tarif</th><th>Botlar</th><th>Foyd.</th><th>Xabar/oy</th><th>Jamoa</th><th>API</th><th /></tr></thead>
            <tbody>{limits.map((l) => (
              <tr key={l.kalit}><td className="pr-2 font-bold">{l.kalit}</td>
                {['max_bots', 'max_bot_users', 'monthly_messages', 'max_members', 'max_api_keys'].map((f) => (
                  <td key={f} className="pr-1"><input type="number" min="0" value={l[f]} onChange={(e) => setL(l.kalit, f, e.target.value)} aria-label={`${l.kalit} ${f}`} className="w-24 px-2 py-1 rounded-[8px] bg-surface-2 border border-border tabular-nums" /></td>
                ))}
                <td><button onClick={() => saveLimit(l)} disabled={busy} className="px-3 py-1 rounded-[8px] bg-accent text-accent-text font-bold">Saqlash</button></td></tr>
            ))}</tbody></table>
        </section>
      )}
    </div>
  );
}
