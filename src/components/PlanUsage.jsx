import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/format';

function Meter({ label, used, limit }) {
  const unlimited = !limit;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <div>
      <div className="flex justify-between text-[12.5px] mb-1"><span>{label}</span><span className="tabular-nums text-text-muted">{used.toLocaleString('ru-RU')} / {unlimited ? 'cheksiz' : limit.toLocaleString('ru-RU')}</span></div>
      <div className="h-2 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full" style={{ width: pct + '%', background: pct >= 90 ? '#F0546A' : '#20E992' }} />
      </div>
    </div>
  );
}

// Tarif foydalanishi, avto-uzaytirish va hisob-fakturalar tarixi
export default function PlanUsage({ refreshKey }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const load = () => api.get('/plans/overview.php').then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
  async function toggle(on) {
    try { await api.post('/plans/auto_renew.php', { on }); load(); } catch (e) { setErr(e instanceof ApiError ? e.message : 'Xatolik'); }
  }
  if (err && !d) return null;
  if (!d) return <div className="h-24 rounded-[var(--radius-md)] bg-surface-2 animate-pulse mb-4" aria-busy="true" />;
  return (
    <div className="space-y-3 mb-5">
      <section className="rounded-[var(--radius-md)] bg-surface border border-border p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm">Joriy tarif: {d.plan}</h3>
          {d.plan !== 'oddiy' && d.until && <span className="text-[12px] text-text-muted">{d.until} gacha</span>}
        </div>
        <Meter label="Botlar" used={d.usage.bots} limit={d.limits.max_bots} />
        <Meter label="Oylik xabarlar" used={d.usage.messages} limit={d.limits.monthly_messages} />
        {d.plan !== 'oddiy' && (
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={d.autoRenew} onChange={(e) => toggle(e.target.checked)} /> Avto-uzaytirish (tugashidan keyin balansdan)
          </label>
        )}
      </section>
      <section className="rounded-[var(--radius-md)] bg-surface border border-border p-4">
        <h3 className="font-bold text-sm mb-2">Hisob-fakturalar</h3>
        {d.invoices.length === 0 ? <p className="text-[13px] text-text-muted">Hali to‘lov yo‘q.</p> : (
          <ul className="divide-y divide-border">
            {d.invoices.map((i) => (
              <li key={i.number} className="py-2 flex justify-between gap-2 text-[12.5px]">
                <div><div className="font-semibold">{i.title}</div><div className="text-text-muted">{i.number} · {i.created_at}{i.period_to ? ` · ${i.period_to} gacha` : ''}</div></div>
                <div className="tabular-nums font-bold">{formatMoney(i.amount)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
