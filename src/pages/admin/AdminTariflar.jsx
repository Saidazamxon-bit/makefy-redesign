import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';

const ICONS = { pro: 'fa-star', premium: 'fa-gem', max: 'fa-crown' };

export default function AdminTariflar() {
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api.get('/admin/tariflar.php').then((d) => setPlans(d.plans)).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  if (error && !plans) return <p className="text-danger text-sm">{error}</p>;
  if (!plans) return <div className="h-64 rounded-[var(--radius-md)] bg-surface-2 animate-pulse" />;

  return (
    <div>
      <h2 className="font-extrabold text-lg mb-4">Tariflarni boshqarish</h2>
      <div className="space-y-4">
        {plans.map((p) => (
          <PlanForm key={p.id} plan={p} onSaved={load} />
        ))}
      </div>
    </div>
  );
}

function PlanForm({ plan, onSaved }) {
  const [form, setForm] = useState({
    narxi: plan.narxi,
    muddat_kun: plan.muddat_kun,
    chegirma: plan.chegirma,
    kunlik_bonus_foiz: plan.kunlik_bonus_foiz,
    referal_bonus_foiz: plan.referal_bonus_foiz,
    bot_bonus_kun: plan.bot_bonus_kun,
    otkazish: Number(plan.otkazish) === 1,
    token_yangila: Number(plan.token_yangila ?? 1) === 1,
    chat_rasm: Number(plan.chat_rasm ?? 1) === 1,
    webapp_bepul: Number(plan.webapp_bepul ?? 0) === 1,
    tezlik_bonus: Number(plan.tezlik_bonus ?? 0) >= 1,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (k) => () => setForm((f) => ({ ...f, [k]: !f[k] }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post('/admin/tariflar.php', { id: plan.id, ...form });
      setMessage(res.message);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[var(--radius-md)] bg-surface border border-border p-4 space-y-2.5">
      <div className="font-extrabold text-sm mb-1">
        <i className={`fa-solid ${ICONS[plan.kalit] || 'fa-tag'} text-accent mr-1.5`} /> {plan.nomi} tarifi
      </div>
      {message && <div className="text-[12.5px] text-accent bg-accent-soft rounded-[var(--radius-sm)] px-3 py-2">{message}</div>}
      {error && <div className="text-[12.5px] text-danger bg-danger-soft rounded-[var(--radius-sm)] px-3 py-2">{error}</div>}

      <Row label="Narxi (so'm)"><input value={form.narxi} onChange={set('narxi')} className={inputCls} /></Row>
      <Row label="Muddati (kun)"><input type="number" value={form.muddat_kun} onChange={set('muddat_kun')} className={inputCls} /></Row>
      <Row label="Bot yaratishda chegirma (%)"><input type="number" value={form.chegirma} onChange={set('chegirma')} min={0} max={100} className={inputCls} /></Row>
      <Row label="Kunlik bonus qo'shimchasi (%)"><input type="number" value={form.kunlik_bonus_foiz} onChange={set('kunlik_bonus_foiz')} min={0} className={inputCls} /></Row>
      <Row label="Referal bonus qo'shimchasi (%)"><input type="number" value={form.referal_bonus_foiz} onChange={set('referal_bonus_foiz')} min={0} className={inputCls} /></Row>
      <Row label="Bot yaratganda bonus kun"><input type="number" value={form.bot_bonus_kun} onChange={set('bot_bonus_kun')} min={0} className={inputCls} /></Row>

      <div className="space-y-1.5 pt-1">
        <Check checked={form.otkazish} onChange={toggle('otkazish')} label="Bot egaligini o'tkazish ruxsat etilsin" />
        <Check checked={form.token_yangila} onChange={toggle('token_yangila')} label="Bot tokenini yangilash ruxsat etilsin" />
        <Check checked={form.chat_rasm} onChange={toggle('chat_rasm')} label="Chatda rasm yuborishga ruxsat" />
        <Check checked={form.webapp_bepul} onChange={toggle('webapp_bepul')} label="Web App qo'shimchasi shu tarifda bepul (bot tarifida)" />
        <Check checked={form.tezlik_bonus} onChange={toggle('tezlik_bonus')} label="Ommaviy xabar navbatida +1 ustuvorlik" />
      </div>

      <button disabled={busy} className="w-full py-2.5 rounded-[var(--radius-sm)] bg-[var(--mf-brand)] text-[var(--mf-on-brand)] font-bold text-sm disabled:opacity-60">
        {busy ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>
    </form>
  );
}

function Row({ label, children }) {
  return (
    <div>
      <div className="text-[11.5px] font-bold text-text-muted mb-1">{label}</div>
      {children}
    </div>
  );
}

function Check({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 text-[12.5px] font-semibold">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 accent-[var(--accent)]" />
      {label}
    </label>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-[var(--radius-sm)] bg-surface-2 border border-border text-sm outline-none focus:border-accent';
