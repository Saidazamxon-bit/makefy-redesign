import BroadcastProgress from '../components/BroadcastProgress';
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { openBotAdmin } from '../lib/botAdmin';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/format';
import BotTarif from '../components/BotTarif';
import '../styles/home.css';

export default function BotDetail() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [newToken, setNewToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [cred, setCred] = useState(null);
  const [bcText, setBcText] = useState('');
  const [batchId, setBatchId] = useState(null);

  useEffect(() => {
    setError('');
    api
      .get(`/mybots/detail.php?useri=${encodeURIComponent(username)}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [username]);

  async function handleTokenChange(event) {
    event.preventDefault();
    if (!confirm('Token almashtirilsinmi?')) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const result = await api.post('/mybots/actions.php', {
        amal: 'token_almashtir',
        eski_user: username,
        yangi_token: newToken,
      });
      setMessage(result.message);
      setNewToken('');
      if (result.botUser && result.botUser !== username) {
        navigate(`/bots/${result.botUser}`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setBusy(false);
    }
  }

  async function resetAdmin() {
    if (!confirm('Yangi admin paroli yaratilsinmi? Eskisi ishlamay qoladi.')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const r = await api.post('/mybots/actions.php', { amal: 'admin_parol_tiklash', bot_user: username });
      setCred(r.credentials); setMessage(r.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    } finally { setBusy(false); }
  }

  async function sendBroadcast(event) {
    event.preventDefault();
    if (!bcText.trim() || !confirm('Barcha foydalanuvchilarga xabar yuborilsinmi?')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const r = await api.post('/bots/broadcast.php', { useri: username, matn: bcText.trim() });
      setMessage(r.message); setBcText(''); setBatchId(r.batchId || null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Yuborib bo‘lmadi.');
    } finally { setBusy(false); }
  }

  if (error && !data) {
    return (
      <div className="mf-page--error">
        <div className="mf-error-card">
          <span><i className="fa-solid fa-wifi" /></span>
          <h1>Botni yuklab bo‘lmadi</h1>
          <p>{error}</p>
          <Link to="/bots" className="mf-button mf-button--primary">← Botlarimga qaytish</Link>
        </div>
      </div>
    );
  }
  if (!data) return <DetailSkeleton />;

  const isActive = data.faol ?? data.active ?? data.status === 'active';
  const name = String(data.botUser || username).replace(/^@/, '');
  const botUrl = `https://t.me/${name}`;
  const plan = data.plan;
  const s = data.stats || {};
  const users = Number(s.users ?? 0);
  const days = Number(data.kun ?? 0);
  const items = Number(s.items ?? 0);
  const maxItems = Number(plan?.features?.max_kontent ?? 0);
  const can = (k) => (data.can || []).includes(k);

  return (
    <div className="mf-page hm bd">
      <header className="hm-head">
        <div>
          <h1>@{name}</h1>
          <p>{data.turiNomi || data.turi || 'Bot'}{plan ? ` · ${plan.nomi} tarif` : ''}</p>
        </div>
        <div className="hm-head__act">
          <span className={'hm-badge' + (isActive ? ' is-on' : '')}>{isActive ? 'Faol' : 'Nofaol'}</span>
          <a href={botUrl} target="_blank" rel="noopener noreferrer" className="mf-button mf-button--ghost"><i className="fa-brands fa-telegram" /> Telegram</a>
        </div>
      </header>

      {message && <Banner type="ok">{message}</Banner>}
      {error && <Banner type="err">{error}</Banner>}

      <section className="hm-kpi hm-kpi--4" aria-label="Holat">
        <div><small>Muddat</small><strong className={days <= 0 ? 'bd-bad' : days <= 3 ? 'bd-warn' : ''}>{days > 0 ? `${days} kun` : 'Tugagan'}</strong><em><Link to={`/bots/${username}/kunlik`} className="text-accent">Uzaytirish →</Link></em></div>
        <div><small>Tarif</small><strong>{plan?.nomi || '—'}</strong><em>{plan ? `${formatMoney(plan.oylikNet ?? plan.oylik)}/oy` : 'tarif yo‘q'}</em></div>
        <div><small>Foydalanuvchilar</small><strong>{users}</strong><em>{plan ? (plan.maxUsers ? `limit ${plan.maxUsers}` : 'cheksiz') : ''}</em></div>
        <div><small>{data.kind === 'starska' ? 'Buyurtmalar' : 'Kontent'}</small><strong>{data.kind === 'starska' ? Number(s.orders ?? 0) : items}</strong><em>{data.kind === 'starska' ? `daromad ${formatMoney(s.revenue || 0)}` : maxItems ? `limit ${maxItems}` : 'cheksiz'}</em></div>
      </section>

      {plan && (
        <section className="hm-sec">
          <div className="hm-sec__head"><div><h2>Limitlar</h2><p>Tarifingiz doirasida qancha ishlatilgani.</p></div></div>
          <div className="bd-bars">
            <Usage label="Foydalanuvchilar" used={users} limit={plan.maxUsers} />
            <Usage label="Oylik xabarlar" used={plan.messagesUsed} limit={plan.monthlyMessages} />
            {data.kind === 'anime' && <Usage label="Kinolar" used={items} limit={maxItems} />}
          </div>
        </section>
      )}

      {plan && (
        <section className="hm-sec">
          <div className="hm-sec__head"><div><h2>Bot qanday ishlaydi</h2><p>Joriy tarifdagi imkoniyatlar.</p></div></div>
          <ul className="bd-feat">
            <li className="is-on"><i className="fa-solid fa-circle-check" /> Tugmali bot — Telegram’da to‘liq ishlaydi</li>
            <li className={plan.webappOn ? 'is-on' : ''}>
              <i className={'fa-solid ' + (plan.webappOn ? 'fa-circle-check' : 'fa-circle-xmark')} />
              {plan.webappOn ? ' Web App yoqilgan' : plan.webapp === 'pullik' ? ` Web App o‘chiq — pastda yoqish mumkin (+${formatMoney(plan.webappNarx)}/oy)` : ' Web App bu tarifda yo‘q'}
            </li>
            {plan.features?.majburiy_obuna && <li className="is-on"><i className="fa-solid fa-circle-check" /> Majburiy obuna</li>}
            <li className="is-on"><i className="fa-solid fa-gauge-high" /> Tezlik: {['', 'oddiy', 'tez', 'eng tez'][plan.tezlik] || 'oddiy'} (ommaviy xabar navbati)</li>
          </ul>
        </section>
      )}

      <div id="tarif"><BotTarif username={username} onChanged={() => api.get(`/mybots/detail.php?useri=${encodeURIComponent(username)}`).then(setData).catch(() => {})} /></div>

      {cred && (
        <section className="hm-sec">
          <div className="hm-sec__head"><div><h2>Yangi admin ma’lumotlari</h2><p>Parol faqat hozir ko‘rsatiladi — saqlab qo‘ying.</p></div></div>
          <div className="mf-cred-grid"><div><small>Login</small><code>{cred.login}</code></div><div><small>Parol</small><code>{cred.password}</code></div></div>
        </section>
      )}

      <nav className="hm-links" aria-label="Amallar">
        {data.isTemplate && data.panels?.admin && (
          <a href={data.panels.admin} onClick={(e) => { e.preventDefault(); openBotAdmin(username); }}><i className="fa-solid fa-user-shield" /><span><b>Admin panel</b><small>{data.kind === 'anime' ? 'Brauzerda yoki Telegram ichida — tokenli havola bilan' : 'Kontent, narx va buyurtmalar'}</small></span><i className="fa-solid fa-chevron-right" /></a>
        )}
        {data.isTemplate && data.panels?.app && plan?.webappOn !== false && (
          <a href={data.panels.app} target="_blank" rel="noopener noreferrer"><i className="fa-solid fa-window-restore" /><span><b>Mini App</b><small>Foydalanuvchilar ko‘radigan ilova</small></span><i className="fa-solid fa-chevron-right" /></a>
        )}
        <Link to={`/analytics?bot=${encodeURIComponent(name)}`}><i className="fa-solid fa-chart-line" /><span><b>Tahlil</b><small>Foydalanuvchilar va faollik</small></span><i className="fa-solid fa-chevron-right" /></Link>
        {data.canResetAdmin && (
          <button type="button" onClick={resetAdmin} disabled={busy}><i className="fa-solid fa-key" /><span><b>Admin parolini tiklash</b><small>Yangi login va parol yaratadi</small></span><i className="fa-solid fa-chevron-right" /></button>
        )}
      </nav>

      {data.isTemplate && can('broadcast.send') && (
        <section className="hm-sec">
          <div className="hm-sec__head"><div><h2>Xabar yuborish</h2><p>Botning barcha foydalanuvchilariga matnli xabar.</p></div></div>
          <form onSubmit={sendBroadcast} className="hm-form">
            <textarea value={bcText} onChange={(e) => setBcText(e.target.value)} rows={3} maxLength={4000} placeholder="Xabar matni…" />
            <div className="hm-form__foot"><span>{bcText.length}/4000</span>
              <button disabled={busy || !bcText.trim()} className="mf-button mf-button--primary"><i className="fa-solid fa-paper-plane" /> Yuborish</button></div>
          </form>
          <BroadcastProgress batchId={batchId} />
        </section>
      )}

      {data.canChangeToken && (
        <details className="bd-more">
          <summary>Qo‘shimcha: tokenni yangilash</summary>
          <form onSubmit={handleTokenChange} className="mf-token-form">
            <input type="text" value={newToken} onChange={(e) => setNewToken(e.target.value)} placeholder="Yangi Bot Token" required />
            <button disabled={busy} className="mf-button mf-button--primary"><i className="fa-solid fa-arrows-rotate" /> {busy ? 'Tekshirilmoqda…' : 'Almashtirish'}</button>
          </form>
        </details>
      )}
    </div>
  );
}

function Usage({ label, used, limit }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone = limit > 0 && pct >= 100 ? 'is-bad' : pct >= 80 ? 'is-warn' : '';
  return (
    <div className="bd-bar">
      <div className="bd-bar__top"><span>{label}</span><b>{used}{limit > 0 ? ` / ${limit}` : ' · cheksiz'}</b></div>
      <div className={'bd-bar__track ' + tone}><i style={{ width: (limit > 0 ? pct : 0) + '%' }} /></div>
      {tone === 'is-bad' && <small className="bd-bad">Limit tugadi — <a href="#tarif">tarifni oshiring</a></small>}
      {tone === 'is-warn' && <small className="bd-warn">Limitga yaqinlashdi ({pct}%)</small>}
    </div>
  );
}

function DetailSkeleton() {
  return <div className="mf-detail-skeleton"><div /><div /><div /><div /></div>;
}

function Banner({ type, children }) {
  return <div className={`mf-notice ${type === 'ok' ? 'mf-notice--ok' : 'mf-notice--err'}`}>{children}</div>;
}
