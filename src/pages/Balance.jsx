import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/format';

export default function Balance() {
  const { logout, linkTelegramStart } = useAuth(); const navigate = useNavigate(); const [data, setData] = useState(null); const [error, setError] = useState(''); const [copied, setCopied] = useState(false); const [eski, setEski] = useState(''); const [yangi, setYangi] = useState(''); const [yangi2, setYangi2] = useState(''); const [pwMsg, setPwMsg] = useState(''); const [pwErr, setPwErr] = useState(''); const [busy, setBusy] = useState(false);
  const [linkData, setLinkData] = useState(null); const [linkLoading, setLinkLoading] = useState(false); const [linkError, setLinkError] = useState('');
  const pollRef = useRef(null);
  useEffect(() => { api.get('/balance.php').then(setData).catch(err => setError(err.message)); }, []);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);
  function copyId() { if (!data) return; navigator.clipboard?.writeText(String(data.user.foydalanuvchi_id || data.user.user_id)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }
  async function handlePasswordChange(e) { e.preventDefault(); setPwErr(''); setPwMsg(''); if (yangi !== yangi2) { setPwErr('Yangi parollar bir-biriga mos kelmaydi!'); return; } setBusy(true); try { const res = await api.post('/balance.php',{amal:'parol_ozgartir',eski_parol:eski,yangi_parol:yangi,yangi_parol2:yangi2}); setPwMsg(res.message); setEski(''); setYangi(''); setYangi2(''); } catch(err) { setPwErr(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.'); } finally { setBusy(false); } }
  async function handleLogout() { await logout(); navigate('/login'); }
  async function handleLinkTelegram() {
    setLinkLoading(true); setLinkError('');
    const res = await linkTelegramStart();
    setLinkLoading(false);
    if (!res?.ok) { setLinkError(res?.error || 'Xatolik yuz berdi.'); return; }
    if (res.alreadyLinked) { setData((d) => d ? { ...d, user: { ...d.user, linked_telegram_id: '1', linked_tg_username: res.tgUsername } } : d); return; }
    setLinkData(res);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const fresh = await api.get('/balance.php');
        setData(fresh);
        if (fresh.user?.linked_telegram_id) {
          clearInterval(pollRef.current);
          setLinkData(null);
        }
      } catch { /* keyingi urinishda qayta tekshiramiz */ }
    }, 3000);
  }
  if (error && !data) return <div className="mf-page mf-page--error"><div className="mf-error-card"><span><i className="fa-solid fa-wifi" /></span><h1>Profil yuklanmadi</h1><p>{error}</p><button type="button" onClick={() => window.location.reload()} className="mf-button mf-button--primary"><i className="fa-solid fa-rotate-right" /> Qayta urinish</button></div></div>;
  if (!data) return <div className="mf-page mf-skeleton"><div className="mf-skeleton__head" /><div className="mf-skeleton__columns" /></div>;
  const user=data.user||{};
  const displayId = user.foydalanuvchi_id || user.user_id || '—';
  const tgConnected = Boolean(user.linked_telegram_id) || user.auth_turi === 'telegram';
  const tgName = user.linked_tg_username || user.tg_username || '';
  return <div className="mf-page mf-profile-page"><header className="mf-profile-head"><div><span className="mf-kicker">ACCOUNT SPACE</span><h1>Profil</h1><p>Hisobingiz, balansingiz va shaxsiy boshqaruvlar bir joyda.</p></div><Link to="/sozlamalar" className="mf-button mf-button--ghost"><i className="fa-solid fa-sliders" /> Sozlamalar</Link></header><section className="mf-profile-hero"><div className="mf-profile-identity"><div className="mf-profile-avatar">{(user.ism||'M').slice(0,1).toUpperCase()}</div><div><strong>{user.ism||'Makefy foydalanuvchisi'}</strong><small>Foydalanuvchi ID: {displayId}</small></div></div><div className="mf-profile-balance"><small>Joriy balans</small><strong>{formatMoney(user.balance??0)}</strong><Link to="/deposit" className="mf-button mf-button--primary"><i className="fa-solid fa-plus" /> Hisobni to‘ldirish</Link></div></section><div className="mf-profile-grid"><section className="mf-profile-card mf-profile-card--wide"><div className="mf-profile-card__head"><span><i className="fa-solid fa-id-card" /></span><div><h2>Hisob ma’lumotlari</h2><p>Makefy workspace profilingiz</p></div></div><div className="mf-profile-facts"><Fact icon="fa-user" label="Ism" value={user.ism||'—'} /><Fact icon="fa-fingerprint" label="Foydalanuvchi ID" value={displayId} action={<button onClick={copyId} aria-label="ID nusxalash"><i className={'fa-'+(copied?'solid fa-check':'regular fa-copy')} /></button>} /><Fact icon="fa-wallet" label="Balans" value={formatMoney(user.balance??0)} accent /><Fact icon="fa-robot" label="Botlar soni" value={(data.botsCount??0)+' ta'} /><Fact icon="fa-crown" label="Tarif" value={data.plan?.nomi||'Oddiy'} /><Fact icon="fa-users" label="Referal daraja" value={(data.referralLevel?.name||'Oddiy')+' ('+(data.referralLevel?.count||0)+' ta)'} /></div></section><section className="mf-profile-card"><div className="mf-profile-card__head"><span><i className="fa-brands fa-telegram" /></span><div><h2>Telegram akkaunt</h2><p>Bot bildirishnomalari uchun ulang</p></div></div>{tgConnected ? <div className="mf-profile-alert mf-profile-alert--ok"><i className="fa-solid fa-circle-check" /> Ulangan{tgName ? ': @'+tgName : ''}</div> : linkData ? <div className="mf-telegram-link"><p>Botni oching va kodni avtomatik yuborish uchun quyidagi tugmani bosing:</p><div className="mf-telegram-link__code">{linkData.code}</div><a href={linkData.botLink} target="_blank" rel="noreferrer" className="mf-button mf-button--primary"><i className="fa-brands fa-telegram" /> Botni ochish</a><small>Kod 10 daqiqa amal qiladi. Botga o‘tgach, ulanish avtomatik yakunlanadi.</small></div> : <><p className="mf-profile-card__hint">Telegram akkauntingizni ulasangiz, botlaringiz haqida bildirishnomalarni Telegram orqali ham olasiz.</p>{linkError && <div className="mf-profile-alert mf-profile-alert--err">{linkError}</div>}<button type="button" onClick={handleLinkTelegram} disabled={linkLoading} className="mf-button mf-button--primary"><i className="fa-brands fa-telegram" /> {linkLoading?'Yuklanmoqda...':'Telegram ulash'}</button></>}</section><section className="mf-profile-card"><div className="mf-profile-card__head"><span><i className="fa-solid fa-bolt" /></span><div><h2>Tezkor amallar</h2><p>Ko‘p ishlatiladigan bo‘limlar</p></div></div><div className="mf-profile-links"><QuickLink to="/deposit" icon="fa-plus" label="To‘ldirish" primary /><QuickLink to="/bots" icon="fa-robot" label="Botlarim" /><QuickLink to="/referal" icon="fa-users" label="Referal" /><QuickLink to="/tariflar" icon="fa-crown" label="Tariflar" /></div></section><section className="mf-profile-card"><div className="mf-profile-card__head"><span><i className="fa-solid fa-lock" /></span><div><h2>Parolni yangilash</h2><p>Hisob xavfsizligini saqlang</p></div></div>{pwMsg&&<div className="mf-profile-alert mf-profile-alert--ok">{pwMsg}</div>}{pwErr&&<div className="mf-profile-alert mf-profile-alert--err">{pwErr}</div>}<form onSubmit={handlePasswordChange} className="mf-profile-form"><input type="password" value={eski} onChange={e=>setEski(e.target.value)} placeholder="Joriy parol" required/><input type="password" value={yangi} onChange={e=>setYangi(e.target.value)} placeholder="Yangi parol (kamida 8 belgi)" required minLength={8}/><input type="password" value={yangi2} onChange={e=>setYangi2(e.target.value)} placeholder="Yangi parolni tasdiqlang" required minLength={8}/><button disabled={busy} className="mf-button mf-button--primary"><i className="fa-solid fa-save" /> {busy?'Saqlanmoqda...':'Parolni o‘zgartirish'}</button></form></section></div><button type="button" onClick={handleLogout} className="mf-settings-link mf-settings-link--danger" style={{width:'100%',marginTop:'14px'}}><span><i className="fa-solid fa-right-from-bracket" /></span><b>Hisobdan chiqish</b><i className="fa-solid fa-arrow-right" /></button></div>;
}
function Fact({icon,label,value,action,accent}){return <div className="mf-profile-fact"><div className="mf-profile-fact__label"><small><i className={'fa-solid '+icon} /> {label}</small>{action}</div><strong className={accent?'is-accent':''}>{value}</strong></div>}
function QuickLink({to,icon,label,primary}){return <Link to={to} className={'mf-profile-link '+(primary?'mf-profile-link--primary':'')}><i className={'fa-solid '+icon} /> {label}</Link>}
