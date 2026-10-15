import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';

export default function AdminPromokodlar() {
  const [promos, setPromos] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ kod: '', soni: 1, mukofot_oddiy: '0', mukofot_pro: '0', mukofot_premium: '0', mukofot_max: '0', shaxsiy_user_id: '' });
  const [busy, setBusy] = useState(false);

  function load() {
    api.get('/admin/promokodlar.php').then((d) => setPromos(d.promos)).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post('/admin/promokodlar.php', { amal: 'yaratish', ...form });
      setMessage(res.message);
      setForm({ kod: '', soni: 1, mukofot_oddiy: '0', mukofot_pro: '0', mukofot_premium: '0', mukofot_max: '0', shaxsiy_user_id: '' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id) {
    await api.post('/admin/promokodlar.php', { amal: 'holat_almashtir', id });
    load();
  }

  async function remove(id) {
    if (!confirm("Bu promokodni o'chirmoqchimisiz?")) return;
    await api.post('/admin/promokodlar.php', { amal: 'ochirish', id });
    load();
  }

  if (error && !promos) return <p className="text-danger text-sm">{error}</p>;

  return (
    <div>
      <h2 className="font-extrabold text-lg mb-4">Promokodlar</h2>

      <form onSubmit={create} className="rounded-[var(--radius-md)] bg-surface border border-border p-4 space-y-2.5 mb-5">
        <div className="font-bold text-sm mb-1">Yangi promokod</div>
        {message && <div className="text-[12.5px] text-accent bg-accent-soft rounded-[var(--radius-sm)] px-3 py-2">{message}</div>}
        {error && <div className="text-[12.5px] text-danger bg-danger-soft rounded-[var(--radius-sm)] px-3 py-2">{error}</div>}
        <input value={form.kod} onChange={set('kod')} placeholder="Kod (masalan: SUMMER2026)" required className={`${inputCls} uppercase`} />
        <input type="number" min={1} value={form.soni} onChange={set('soni')} placeholder="Nechta odam foydalana oladi?" required className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <input value={form.mukofot_oddiy} onChange={set('mukofot_oddiy')} placeholder="Oddiy" className={inputCls} />
          <input value={form.mukofot_pro} onChange={set('mukofot_pro')} placeholder="Pro" className={inputCls} />
          <input value={form.mukofot_premium} onChange={set('mukofot_premium')} placeholder="Premium" className={inputCls} />
          <input value={form.mukofot_max} onChange={set('mukofot_max')} placeholder="Max" className={inputCls} />
        </div>
        <input value={form.shaxsiy_user_id} onChange={set('shaxsiy_user_id')} placeholder="Faqat shu Telegram ID uchun (ixtiyoriy)" className={inputCls} />
        <button disabled={busy} className="w-full py-2.5 rounded-[var(--radius-sm)] bg-[var(--mf-brand)] text-[var(--mf-on-brand)] font-bold text-sm disabled:opacity-60">
          {busy ? 'Yaratilmoqda...' : 'Yaratish'}
        </button>
      </form>

      {!promos ? (
        <div className="h-32 rounded-[var(--radius-md)] bg-surface-2 animate-pulse" />
      ) : promos.length === 0 ? (
        <p className="text-center text-sm text-text-muted py-6">Hali promokod yaratilmagan</p>
      ) : (
        <div className="space-y-2">
          {promos.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-surface border border-border rounded-[var(--radius-md)] px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm">
                  {p.kod} {Number(p.faol) === 0 && <span className="text-danger text-[11px]">(o'chirilgan)</span>}
                </div>
                <div className="text-[11.5px] text-text-muted">
                  {p.ishlatilgan}/{p.soni} ishlatilgan · Oddiy:{p.mukofot_oddiy} Pro:{p.mukofot_pro} Premium:{p.mukofot_premium} Max:{p.mukofot_max}
                  {p.shaxsiy_user_id && ` · faqat ID: ${p.shaxsiy_user_id}`}
                </div>
              </div>
              <button onClick={() => toggle(p.id)} className="w-8 h-8 flex items-center justify-center text-text-muted">
                <i className="fa-solid fa-power-off" />
              </button>
              <button onClick={() => remove(p.id)} className="w-8 h-8 flex items-center justify-center text-danger">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-[var(--radius-sm)] bg-surface-2 border border-border text-sm outline-none focus:border-accent';
