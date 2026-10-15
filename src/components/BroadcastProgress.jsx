import { useEffect, useState } from 'react';
import { api } from '../lib/api';

// Navbatga qo'yilgan ommaviy xabar progressi: yuborildi / xato / qoldi (2 soniyada bir yangilanadi)
export default function BroadcastProgress({ batchId }) {
  const [st, setSt] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!batchId) return undefined;
    let stop = false;
    let timer;
    async function tick() {
      try {
        const r = await api.get(`/bots/broadcast_status.php?batch=${batchId}`);
        if (stop) return;
        setSt(r);
        setErr('');
        if (r.status !== 'done') timer = setTimeout(tick, 2000);
      } catch (e) {
        if (!stop) { setErr('Holatni olib bo\u2018lmadi, qayta urinilmoqda\u2026'); timer = setTimeout(tick, 5000); }
      }
    }
    tick();
    return () => { stop = true; clearTimeout(timer); };
  }, [batchId]);

  if (!batchId) return null;
  if (!st) return <div className="h-14 rounded-[var(--radius-md)] bg-surface-2 animate-pulse" aria-busy="true" />;
  const total = Math.max(1, Number(st.total));
  const done = Number(st.sent) + Number(st.failed);
  const pct = Math.min(100, Math.round((done / total) * 100));
  return (
    <div className="rounded-[var(--radius-md)] bg-surface border border-border p-3 text-[13px]" role="status" aria-live="polite">
      <div className="flex justify-between font-bold mb-1.5">
        <span>{st.status === 'done' ? 'Yuborish yakunlandi' : 'Yuborilmoqda\u2026'}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
        <div className="h-full bg-accent transition-all" style={{ width: pct + '%' }} />
      </div>
      <div className="flex gap-4 mt-2 text-text-muted tabular-nums">
        <span>Yuborildi: <b className="text-text">{st.sent}</b></span>
        <span>Xato: <b className="text-text">{st.failed}</b></span>
        <span>Qoldi: <b className="text-text">{st.remaining}</b></span>
      </div>
      {err && <p className="text-danger mt-1">{err}</p>}
    </div>
  );
}
