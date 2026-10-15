import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import ErrorNotice from '../../components/ErrorNotice';
import { Badge, Card, EmptyState, PageHeader } from '../../components/ui';

export default function AdminKartalar() {
  const [d, setD] = useState(null);
  const [rev, setRev] = useState(null);
  const [number, setNumber] = useState('');
  const [owner, setOwner] = useState('');
  const [type, setType] = useState('humo');
  const [sel, setSel] = useState({});
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get('/admin/cards.php').then(setD).catch(setErr);
    api.get('/admin/card_tx.php').then(setRev).catch(() => {});
  };
  useEffect(load, []);
  async function run(fn, ok) {
    setBusy(true); setErr(null); setMsg('');
    try { await fn(); setMsg(ok); load(); } catch (e) { setErr(e instanceof ApiError ? e : new Error('Xatolik yuz berdi.')); } finally { setBusy(false); }
  }
  const add = (e) => { e.preventDefault(); run(() => api.post('/admin/cards.php', { amal: 'add', number, owner, type }).then(() => { setNumber(''); setOwner(''); }), 'Karta qo‘shildi.'); };
  const toggle = (c) => run(() => api.post('/admin/cards.php', { amal: 'toggle', id: c.id }), 'Saqlandi.');
  const match = (tx) => run(() => api.post('/admin/card_tx.php', { tx_id: tx.id, payment_id: Number(sel[tx.id]) }), 'Biriktirildi, balans qo‘shildi.');
  const ago = (ts) => (ts ? new Date(ts * 1000).toLocaleString() : '—');

  return (
    <div className="space-y-4 pb-24">
      <PageHeader title="Karta avto-to‘lov" subtitle="Karta orqali avtomatik to‘lovlarni sozlash va kuzatish." />
      <ErrorNotice error={err} />
      {msg && <div className="text-[13px] font-semibold text-accent bg-accent-soft rounded-[var(--radius-sm)] px-3 py-2" role="status">{msg}</div>}

      {d && (
        <Card>
          <div className="flex items-center justify-between gap-2 text-[13px]">
            <span>Listener ({d.senders ? Object.entries(d.senders).filter(([, l]) => l.length).map(([k, l]) => `${k}: @${l.join(', @')}`).join(' · ') : '@HUMOcardbot'}): <b>{d.lastMessageTs ? `oxirgi xabar ${ago(d.lastMessageTs)}` : 'hali xabar kelmagan'}</b></span>
            <Badge tone={d.hookConfigured ? 'success' : 'danger'}>{d.hookConfigured ? 'secret sozlangan' : 'HUMOCARD_HOOK_SECRET yo‘q'}</Badge>
          </div>
          <p className="text-[12px] text-text-muted mt-1">Faol karta bo‘lsa, hisob to‘ldirish shu kartalar orqali (Humo shop API o‘rniga) ishlaydi.</p>
        </Card>
      )}

      <Card>
        <h2 className="font-bold text-sm mb-2">Karta qo‘shish</h2>
        <form onSubmit={add} className="space-y-2">
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Karta turi" className="w-full min-h-[44px] px-3 rounded-[12px] bg-surface-2 border border-border text-sm outline-none focus:border-accent">
            <option value="humo">Humo (9860…)</option>
            <option value="uzcard">Uzcard (8600…)</option>
          </select>
          <input value={number} onChange={(e) => setNumber(e.target.value)} inputMode="numeric" autoComplete="off" placeholder="9860 0000 0000 0000" aria-label="Karta raqami" className="w-full min-h-[44px] px-3.5 rounded-[12px] bg-surface-2 border border-border text-sm font-mono outline-none focus:border-accent" />
          <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Karta egasi (foydalanuvchiga ko‘rinadi)" aria-label="Karta egasi" className="w-full min-h-[44px] px-3.5 rounded-[12px] bg-surface-2 border border-border text-sm outline-none focus:border-accent" />
          <button disabled={busy || !number.trim()} className="w-full min-h-[44px] rounded-[12px] bg-accent text-accent-text font-bold text-sm disabled:opacity-50">Qo‘shish</button>
        </form>
      </Card>

      <Card>
        <h2 className="font-bold text-sm mb-2">Kartalar</h2>
        {!d ? <div className="h-12 rounded bg-surface-2 animate-pulse" /> : d.cards.length === 0 ? <EmptyState icon="fa-credit-card" title="Hali karta yo‘q" body="Karta qo‘shilmaguncha avto-to‘lov o‘chiq." /> : (
          <ul className="divide-y divide-border">
            {d.cards.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between gap-2 text-[13px]">
                <div><b className="font-mono">•••• {c.last4}</b> <Badge tone="neutral">{c.card_type === 'uzcard' ? 'Uzcard' : 'Humo'}</Badge> <span className="text-text-muted">{c.owner}</span><div className="text-[12px] text-text-muted tabular-nums">{c.paid} ta to‘lov · {formatMoney(c.total)}</div></div>
                <button onClick={() => toggle(c)} disabled={busy} className={'min-h-[44px] px-3 rounded-[12px] border text-[12px] font-bold ' + (c.active ? 'border-accent text-accent' : 'border-border text-text-muted')}>{c.active ? 'Faol' : 'O‘chiq'}</button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-bold text-sm mb-1">Qo‘lda ko‘rib chiqish</h2>
        <p className="text-[12px] text-text-muted mb-2">Avtomatik biriktirilmagan kirimlar (mos to‘lov topilmadi, noaniq yoki xabar tushunilmadi). Faqat summalari teng to‘lovga biriktirish mumkin.</p>
        {!rev ? <div className="h-12 rounded bg-surface-2 animate-pulse" /> : rev.review.length === 0 ? <p className="text-[13px] text-text-muted">Hammasi joyida: ko‘rib chiqiladigan kirim yo‘q.</p> : (
          <ul className="divide-y divide-border">
            {rev.review.map((tx) => {
              const cands = rev.pending.filter((p) => tx.amount !== null && Math.abs(Number(p.amount_final) - Number(tx.amount)) < 0.5);
              return (
                <li key={tx.id} className="py-3 text-[13px] space-y-1">
                  <div className="flex justify-between gap-2"><b>{tx.amount !== null ? formatMoney(tx.amount) : 'summa noma’lum'} · •••• {tx.last4 || '?'}</b><Badge tone="warning">{tx.status}</Badge></div>
                  <div className="text-[12px] text-text-muted break-words">{tx.raw_text}</div>
                  {cands.length > 0 && (
                    <div className="flex gap-2 items-center">
                      <select value={sel[tx.id] || ''} onChange={(e) => setSel({ ...sel, [tx.id]: e.target.value })} aria-label="To‘lovni tanlang" className="flex-1 min-h-[44px] px-2 rounded-[12px] bg-surface-2 border border-border text-[12px]">
                        <option value="">To‘lovni tanlang…</option>
                        {cands.map((p) => <option key={p.id} value={p.id}>#{p.order_id} · foydalanuvchi {p.user_id}</option>)}
                      </select>
                      <button onClick={() => match(tx)} disabled={busy || !sel[tx.id]} className="min-h-[44px] px-4 rounded-[12px] bg-accent text-accent-text font-bold text-[12px] disabled:opacity-50">Biriktirish</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
