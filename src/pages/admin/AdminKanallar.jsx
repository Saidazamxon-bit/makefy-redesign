import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import { formatMoney } from '../../lib/format';

export default function AdminKanallar() {
  const [channels, setChannels] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ nomi: '', username: '', mukofot: '' });
  const [busy, setBusy] = useState(false);

  function load() {
    api.get('/admin/kanallar.php').then((d) => setChannels(d.channels)).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post('/admin/kanallar.php', { amal: 'yaratish', ...form });
      setMessage(res.message);
      setForm({ nomi: '', username: '', mukofot: '' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm("Bu kanalni o'chirmoqchimisiz?")) return;
    await api.post('/admin/kanallar.php', { amal: 'ochirish', id });
    load();
  }

  return (
    <div>
      <h2 className="font-extrabold text-lg mb-1">Pul ishlash kanallari</h2>
      <p className="text-[12.5px] text-text-muted mb-4">Kanalga obuna bo'lgan foydalanuvchiga avtomatik pul beriladi</p>

      <form onSubmit={create} className="rounded-[var(--radius-md)] bg-surface border border-border p-4 space-y-2.5 mb-5">
        <div className="font-bold text-sm mb-1">Yangi kanal qo'shish</div>
        {message && <div className="text-[12.5px] text-accent bg-accent-soft rounded-[var(--radius-sm)] px-3 py-2">{message}</div>}
        {error && <div className="text-[12.5px] text-danger bg-danger-soft rounded-[var(--radius-sm)] px-3 py-2">{error}</div>}
        <input value={form.nomi} onChange={set('nomi')} placeholder="Kanal nomi" required className={inputCls} />
        <input value={form.username} onChange={set('username')} placeholder="@kanal yoki -100xxxxxxxxxx" required className={inputCls} />
        <input value={form.mukofot} onChange={set('mukofot')} placeholder="Mukofot summasi (so'm)" required className={inputCls} />
        <button disabled={busy} className="w-full py-2.5 rounded-[var(--radius-sm)] bg-[var(--mf-brand)] text-[var(--mf-on-brand)] font-bold text-sm disabled:opacity-60">
          {busy ? "Qo'shilmoqda..." : "Qo'shish"}
        </button>
        <p className="text-[11.5px] text-text-dim">
          <i className="fa-solid fa-circle-info mr-1" /> Botingiz (@Makefybot) shu kanalda admin bo'lishi shart!
        </p>
      </form>

      {!channels ? (
        <div className="h-24 rounded-[var(--radius-md)] bg-surface-2 animate-pulse" />
      ) : channels.length === 0 ? (
        <p className="text-center text-sm text-text-muted py-6">Hali kanal qo'shilmagan</p>
      ) : (
        <div className="space-y-2">
          {channels.map((k) => (
            <div key={k.id} className="flex items-center gap-3 bg-surface border border-border rounded-[var(--radius-md)] px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm">{k.nomi}</div>
                <div className="text-[11.5px] text-text-muted">{k.username} · {formatMoney(k.mukofot)}</div>
              </div>
              <button onClick={() => remove(k.id)} className="w-8 h-8 flex items-center justify-center text-danger">
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
