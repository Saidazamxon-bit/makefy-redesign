import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';

export default function AdminTurlar() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [yangiTur, setYangiTur] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.get('/admin/turlar.php').then(setData).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  async function createCategory(e) {
    e.preventDefault();
    if (!yangiTur.trim()) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post('/admin/turlar.php', { amal: 'yaratish', nomi: yangiTur.trim() });
      setMessage(res.message);
      setYangiTur('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setBusy(false);
    }
  }

  async function removeCategory(id) {
    if (!confirm("Bu turni o'chirmoqchimisiz?")) return;
    await api.post('/admin/turlar.php', { amal: 'ochirish', id });
    load();
  }

  async function assignBot(botSlug, tur) {
    try {
      await api.post('/admin/turlar.php', { amal: 'biriktir', bot: botSlug, tur });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    }
  }

  if (error && !data) return <p className="text-danger text-sm">{error}</p>;
  if (!data) return <div className="h-64 rounded-[var(--radius-md)] bg-surface-2 animate-pulse" />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-extrabold text-lg mb-1">Bot turlari (kategoriyalar)</h2>
        <p className="text-[12.5px] text-text-muted mb-4">Bu turlar Create sahifasidagi filtr sifatida ko'rinadi</p>

        <form onSubmit={createCategory} className="flex gap-2 mb-3">
          <input
            value={yangiTur}
            onChange={(e) => setYangiTur(e.target.value)}
            placeholder="Yangi tur nomi"
            className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] bg-surface-2 border border-border text-sm outline-none focus:border-accent"
          />
          <button disabled={busy} className="px-4 rounded-[var(--radius-sm)] bg-accent text-accent-text font-bold text-sm disabled:opacity-60">
            Qo'shish
          </button>
        </form>
        {message && <div className="text-[12.5px] text-accent bg-accent-soft rounded-[var(--radius-sm)] px-3 py-2 mb-3">{message}</div>}
        {error && <div className="text-[12.5px] text-danger bg-danger-soft rounded-[var(--radius-sm)] px-3 py-2 mb-3">{error}</div>}

        <div className="flex flex-wrap gap-2">
          {data.categories.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-2 border border-border text-[12.5px] font-bold">
              {c.nomi}
              <button onClick={() => removeCategory(c.id)} className="text-danger">
                <i className="fa-solid fa-xmark" />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-extrabold text-sm mb-3">Botlar va ularning turi</h3>
        <div className="space-y-2">
          {data.bots.map((b) => (
            <div key={b.kod} className="flex items-center gap-3 bg-surface border border-border rounded-[var(--radius-md)] px-3.5 py-3">
              <span className="flex-1 font-semibold text-sm truncate">{b.nomi}</span>
              <select
                value={b.tur}
                onChange={(e) => assignBot(b.kod, e.target.value)}
                className="px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-surface-2 border border-border text-[12.5px] outline-none"
              >
                <option value="Umumiy">Umumiy</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.nomi}>{c.nomi}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
