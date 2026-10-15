import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const CHANNEL = { web: 'Sayt', webapp: 'Telegram Mini App', telegram_bot: 'Telegram bot' };

function fmt(v) { return v ? String(v).replace('T', ' ').slice(0, 19) : '—'; }

// Foydalanuvchilar shartlarga roziligi qaydlari (rasmiy so'rov bo'lsa ko'rsatish / CSV yuklash uchun).
export default function AdminRozilik() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [text, setText] = useState(null);

  useEffect(() => {
    api.get(`/admin/consents.php?offset=${offset}&q=${encodeURIComponent(query)}`)
      .then((d) => { setData(d); setError(''); })
      .catch((e) => setError(e.message));
  }, [offset, query]);

  function search(e) { e.preventDefault(); setOffset(0); setQuery(q.trim()); }
  function showText(version) {
    api.get(`/admin/consents.php?version=${encodeURIComponent(version)}`).then((d) => setText(d.terms)).catch((e) => setError(e.message));
  }

  if (error && !data) return <p className="text-danger text-sm">{error}</p>;
  if (!data) return <div className="h-64 rounded-[var(--radius-md)] bg-surface-2 animate-pulse" />;
  const s = data.stats;
  const csvHref = `/api/index?__path=admin/consents&export=csv&q=${encodeURIComponent(query)}`;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="font-extrabold text-lg">Rozilik qaydlari</h2>
        <a href={csvHref} className="mf-button mf-button--primary"><i className="fa-solid fa-file-csv" /> CSV yuklab olish</a>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[['Foydalanuvchilar', s.users], ['Rozilik bergan', s.accepted_current], ['Kutilmoqda', s.pending]].map(([l, v]) => (
          <div key={l} className="rounded-[var(--radius-md)] bg-surface-2 p-3"><div className="text-[11px] text-text-muted">{l}</div><div className="font-extrabold text-xl">{v}</div></div>
        ))}
      </div>

      <p className="text-[12px] text-text-muted mb-3">
        Joriy shartlar versiyasi: <b>{data.current.version}</b> · matn xeshi: <code>{data.current.hash.slice(0, 16)}…</code>{' '}
        <button type="button" className="text-accent font-bold" onClick={() => showText(data.current.version)}>Matnni ko‘rish</button>
      </p>

      <form onSubmit={search} className="flex gap-2 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ID, ism, email, @username yoki IP"
          className="flex-1 min-w-0 rounded-[12px] border border-border bg-bg px-3 py-2 outline-none focus:border-accent" />
        <button type="submit" className="mf-button mf-button--primary">Qidirish</button>
      </form>

      {error && <p className="text-danger text-sm mb-2">{error}</p>}

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
        <table className="w-full text-[12.5px] min-w-[760px]">
          <thead className="bg-surface-2 text-text-muted text-left">
            <tr>{['Vaqt', 'Foydalanuvchi', 'Aloqa', 'Kanal', 'IP', 'Qurilma', 'Versiya / xesh'].map((h) => <th key={h} className="px-3 py-2 font-bold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-3 py-2 whitespace-nowrap">{fmt(r.accepted_at)}</td>
                <td className="px-3 py-2"><b>{r.ism || '—'}</b><div className="text-text-muted font-mono">{r.user_id}</div></td>
                <td className="px-3 py-2">{r.contact || '—'}</td>
                <td className="px-3 py-2">{CHANNEL[r.channel] || r.channel}</td>
                <td className="px-3 py-2 font-mono">{r.ip || '—'}</td>
                <td className="px-3 py-2 max-w-[180px] truncate" title={r.user_agent + (r.extra ? ' | ' + r.extra : '')}>{r.user_agent || '—'}</td>
                <td className="px-3 py-2">{r.version}<div className="text-text-muted font-mono">{r.text_hash.slice(0, 10)}…</div></td>
              </tr>
            ))}
            {!data.items.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-text-muted">Hozircha qayd yo‘q</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-[12.5px]">
        <span className="text-text-muted">Jami: {data.total}</span>
        <div className="flex gap-2">
          <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - data.limit))} className="mf-button mf-button--ghost">Oldingi</button>
          <button type="button" disabled={offset + data.limit >= data.total} onClick={() => setOffset(offset + data.limit)} className="mf-button mf-button--ghost">Keyingi</button>
        </div>
      </div>

      {text && (
        <div className="fixed inset-0 z-30 bg-black/50 flex items-center justify-center p-4" onClick={() => setText(null)}>
          <div className="bg-surface border border-border rounded-[20px] p-5 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <pre className="whitespace-pre-wrap text-[13px] font-sans">{text.body}</pre>
            <p className="text-[11px] text-text-dim mt-3 font-mono break-all">sha256: {text.text_hash}</p>
            <button type="button" className="mf-button mf-button--primary mt-3" onClick={() => setText(null)}>Yopish</button>
          </div>
        </div>
      )}
    </div>
  );
}
