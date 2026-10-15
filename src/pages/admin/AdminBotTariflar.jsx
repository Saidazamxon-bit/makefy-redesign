import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import '../../styles/home.css';

const TURLAR = { anime: 'Anime Bot', starska: 'Starska Bot' };
const WEBAPP = [['yopiq', 'Yopiq'], ['pullik', 'Pullik (qo‘shimcha)'], ['bor', 'Tarifga kiritilgan']];
const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(Number(n || 0));

export default function AdminBotTariflar() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const load = () => api.get('/admin/bot_tariflar.php').then((d) => setList(d.tariflar)).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  if (error && !list) return <p className="text-danger text-sm">{error}</p>;
  if (!list) return <div className="h-64 rounded-[var(--radius-md)] bg-surface-2 animate-pulse" />;
  if (list.length === 0) return <p className="text-sm">Bot tariflari topilmadi. Avval 008 migratsiyasini qo‘llang.</p>;

  const turlar = [...new Set(list.map((t) => t.botTuri))];
  return (
    <div className="hm">
      <header className="hm-head"><div><h2 className="font-extrabold text-lg">Bot tariflari</h2>
        <p>Har bot turi uchun alohida tarif. Narxlar — so‘m / oy. 0 = cheksiz (foydalanuvchi, xabar).</p></div></header>
      {turlar.map((tur) => (
        <section key={tur} className="hm-sec">
          <div className="hm-sec__head"><h2>{TURLAR[tur] || tur}</h2></div>
          <div className="hm-table">
            {list.filter((t) => t.botTuri === tur).map((t) => <Row key={t.id} t={t} onSaved={load} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function Row({ t, onSaved }) {
  const [f, setF] = useState({ ...t, features: JSON.stringify(t.features || {}) });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function save(e) {
    e.preventDefault();
    let features;
    try { features = JSON.parse(f.features || '{}'); } catch { setMsg({ ok: false, text: 'Funksiyalar JSON noto‘g‘ri.' }); return; }
    setBusy(true); setMsg(null);
    try {
      await api.post('/admin/bot_tariflar.php', {
        id: t.id, nomi: f.nomi, bosqich: Number(f.bosqich), narx: Number(f.narx), muddatKun: Number(f.muddatKun),
        maxUsers: Number(f.maxUsers), monthlyMessages: Number(f.monthlyMessages), webapp: f.webapp,
        webappNarx: Number(f.webappNarx), tezlik: Number(f.tezlik), features, faol: !!f.faol,
      });
      setMsg({ ok: true, text: 'Saqlandi' }); onSaved();
    } catch (err) { setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Xatolik' }); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={save} className="hm-row bta">
      <div className="bta__head"><b>{t.nomi}</b><small>{fmt(t.narx)} so‘m/oy · {t.kalit}</small></div>
      <div className="bta__grid">
        <label>Nomi<input value={f.nomi} onChange={set('nomi')} /></label>
        <label>Narx (so‘m/oy)<input type="number" min="0" value={f.narx} onChange={set('narx')} /></label>
        <label>Foydalanuvchi<input type="number" min="0" value={f.maxUsers} onChange={set('maxUsers')} /></label>
        <label>Oylik xabar<input type="number" min="0" value={f.monthlyMessages} onChange={set('monthlyMessages')} /></label>
        <label>Web App<select value={f.webapp} onChange={set('webapp')}>{WEBAPP.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Web App narxi<input type="number" min="0" value={f.webappNarx} onChange={set('webappNarx')} disabled={f.webapp !== 'pullik'} /></label>
        <label>Tezlik (1–3)<select value={f.tezlik} onChange={set('tezlik')}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
        <label>Muddat (kun)<input type="number" min="1" value={f.muddatKun} onChange={set('muddatKun')} /></label>
        <label className="bta__wide">Funksiyalar (JSON: majburiy_obuna, max_kontent…)<input value={f.features} onChange={set('features')} /></label>
      </div>
      <div className="bta__foot">
        <label className="bta__chk"><input type="checkbox" checked={!!f.faol} onChange={set('faol')} /> Faol (foydalanuvchiga ko‘rinadi)</label>
        {msg && <span className={msg.ok ? 'text-success' : 'text-danger'}>{msg.text}</span>}
        <button disabled={busy} className="mf-button mf-button--primary">{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
      </div>
    </form>
  );
}
