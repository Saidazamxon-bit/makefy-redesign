import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import { formatMoney } from '../lib/format';
import { applyReducedMotion, readReducedMotion } from '../lib/theme';
import { AVATAR_COLORS, AVATAR_EMOJI, useAvatar } from '../lib/avatar';
import { Modal, useToast } from '../components/ui';
import Avatar from '../components/Avatar';

const TABS = [
  { id: 'umumiy', label: 'Umumiy', icon: 'fa-gauge-high' },
  { id: 'tolovlar', label: 'To‘lovlar', icon: 'fa-receipt' },
  { id: 'faoliyat', label: 'Faollik', icon: 'fa-clock-rotate-left' },
  { id: 'xavfsizlik', label: 'Xavfsizlik', icon: 'fa-shield-halved' },
  { id: 'sozlamalar', label: 'Sozlamalar', icon: 'fa-sliders' },
];

const KIND_META = {
  plan: { label: 'Tarif', icon: 'fa-crown' },
  renewal: { label: 'Tarif', icon: 'fa-crown' },
  template: { label: 'Shablon', icon: 'fa-clone' },
  ai_bot: { label: 'AI bot', icon: 'fa-wand-magic-sparkles' },
  refund: { label: 'Qaytarilgan', icon: 'fa-rotate-left' },
};
const FILTERS = [
  ['all', 'Hammasi'], ['plan', 'Tarif'], ['template', 'Shablon'], ['ai_bot', 'AI bot'], ['refund', 'Qaytarilgan'],
];
const ACTION_LABELS = {
  'bot.create': ['Bot yaratildi', 'fa-robot'],
  'bot.ai_deploy': ['AI bot ishga tushirildi', 'fa-wand-magic-sparkles'],
  'bot.ai_pay': ['AI bot uchun to‘lov', 'fa-credit-card'],
  'charge.plan': ['Tarif to‘lovi', 'fa-crown'],
  'charge.template': ['Shablon to‘lovi', 'fa-clone'],
  'charge.ai_bot': ['AI bot to‘lovi', 'fa-wand-magic-sparkles'],
  'charge.refund': ['Pul qaytarildi', 'fa-rotate-left'],
  'plan.auto_renew': ['Avto-uzaytirish o‘zgardi', 'fa-arrows-rotate'],
  'account.password': ['Parol o‘zgartirildi', 'fa-key'],
};

function prettyAction(a) {
  if (ACTION_LABELS[a]) return ACTION_LABELS[a];
  const s = String(a || '').replace(/[._]/g, ' ').trim();
  return [s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Amal', 'fa-circle-dot'];
}

function parseDate(v) {
  if (!v) return null;
  const d = new Date(String(v).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}
function fmtDate(v, withTime = false) {
  const d = parseDate(v);
  if (!d) return '—';
  const p = (n) => String(n).padStart(2, '0');
  const day = `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
  return withTime ? `${day} ${p(d.getHours())}:${p(d.getMinutes())}` : day;
}
function dayLabel(v) {
  const d = parseDate(v);
  if (!d) return 'Noma’lum sana';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dd = new Date(d); dd.setHours(0, 0, 0, 0);
  const diff = Math.round((today - dd) / 86400000);
  if (diff === 0) return 'Bugun';
  if (diff === 1) return 'Kecha';
  return fmtDate(v);
}
function daysLeft(until) {
  const d = parseDate(until);
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}
function csvCell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // formula-inyeksiyadan himoya
  return '"' + s.replace(/"/g, '""') + '"';
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function errText(e, fallback = 'Xatolik yuz berdi.') {
  return e instanceof ApiError && e.message ? e.message : fallback;
}

export default function Profil() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'umumiy';
  const setTab = (id) => setParams(id === 'umumiy' ? {} : { tab: id }, { replace: true });

  const [bal, setBal] = useState(null); // /balance.php
  const [plan, setPlan] = useState(null); // /plans/overview.php
  const [ref, setRef] = useState(null); // /referal.php
  const [ai, setAi] = useState(null); // /create/ai_list.php
  const [loadErr, setLoadErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setLoadErr('');
    const [a, b, c, d] = await Promise.allSettled([
      api.get('/balance.php'), api.get('/plans/overview.php'), api.get('/referal.php'), api.get('/create/ai_list.php'),
    ]);
    if (a.status === 'fulfilled') setBal(a.value); else setLoadErr(errText(a.reason, 'Profil yuklanmadi.'));
    if (b.status === 'fulfilled') setPlan(b.value);
    if (c.status === 'fulfilled') setRef(c.value);
    if (d.status === 'fulfilled') setAi(d.value);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading && !bal) {
    return <div className="mf-page mf-skeleton"><div className="mf-skeleton__head" /><div className="mf-skeleton__columns" /></div>;
  }
  if (loadErr && !bal) {
    return (
      <div className="mf-page mf-page--error"><div className="mf-error-card">
        <span><i className="fa-solid fa-wifi" /></span><h1>Profil yuklanmadi</h1><p>{loadErr}</p>
        <button type="button" onClick={load} className="mf-button mf-button--primary"><i className="fa-solid fa-rotate-right" /> Qayta urinish</button>
      </div></div>
    );
  }

  const u = bal?.user || {};
  const displayId = u.foydalanuvchi_id || u.user_id || '—';
  const balance = Number(u.balance ?? user?.pul ?? 0);
  const planName = bal?.plan?.nomi || plan?.plan || 'Oddiy';
  const left = daysLeft(plan?.until);

  async function handleLogout() { await logout(); navigate('/login'); }

  return (
    <div className="mf-page pf-page">
      <header className="pf-hero">
        <button type="button" className="pf-hero__avatar" onClick={() => setAvatarOpen(true)} aria-label="Avatarni o‘zgartirish">
          <Avatar uid={u.user_id} name={u.ism} size={72} />
          <span className="pf-hero__edit"><i className="fa-solid fa-pen" /></span>
        </button>
        <div className="pf-hero__who">
          <span className="mf-kicker">PROFIL</span>
          <h1>{u.ism || 'Makefy foydalanuvchisi'}</h1>
          <div className="pf-hero__meta">
            <CopyChip label="ID" value={String(displayId)} />
            <span className="pf-chip pf-chip--plan"><i className="fa-solid fa-crown" /> {planName}{left !== null && left >= 0 ? ` · ${left} kun` : ''}</span>
            {(u.linked_telegram_id || u.auth_turi === 'telegram') && <span className="pf-chip"><i className="fa-brands fa-telegram" /> {u.linked_tg_username || u.tg_username ? '@' + (u.linked_tg_username || u.tg_username) : 'Telegram'}</span>}
          </div>
        </div>
        <div className="pf-hero__balance">
          <small>Joriy balans</small>
          <strong>{formatMoney(balance)}</strong>
          <div className="pf-hero__actions">
            <Link to="/deposit" className="mf-button mf-button--primary"><i className="fa-solid fa-plus" /> To‘ldirish</Link>
            <Link to="/hamyon" className="mf-button mf-button--ghost"><i className="fa-solid fa-wallet" /> Hamyon</Link>
          </div>
        </div>
      </header>

      <div className="pf-tabs" role="tablist" aria-label="Profil bo‘limlari">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" id={'pf-tab-' + t.id} aria-selected={tab === t.id} aria-controls={'pf-panel-' + t.id}
            className={'pf-tab' + (tab === t.id ? ' is-on' : '')} onClick={() => setTab(t.id)}>
            <i className={'fa-solid ' + t.icon} /> <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={'pf-panel-' + tab} aria-labelledby={'pf-tab-' + tab}>
        {tab === 'umumiy' && <Overview bal={bal} plan={plan} refData={ref} ai={ai} left={left} onPlanChange={setPlan} />}
        {tab === 'tolovlar' && <Payments invoices={plan?.invoices || []} />}
        {tab === 'faoliyat' && <Activity />}
        {tab === 'xavfsizlik' && <Security onLogout={handleLogout} />}
        {tab === 'sozlamalar' && <Preferences bal={bal} plan={plan} refData={ref} />}
      </div>

      <AvatarModal open={avatarOpen} onClose={() => setAvatarOpen(false)} uid={u.user_id} name={u.ism} />
    </div>
  );
}

// ---------------------------------------------------------------- umumiy elementlar
function CopyChip({ label, value }) {
  const { toast } = useToast();
  async function copy() {
    try { await navigator.clipboard.writeText(value); toast(label + ' nusxalandi'); }
    catch { toast('Nusxalab bo‘lmadi', { tone: 'danger' }); }
  }
  return (
    <button type="button" className="pf-chip pf-chip--btn" onClick={copy} title="Nusxalash">
      <i className="fa-regular fa-copy" /> {label}: {value}
    </button>
  );
}

function AvatarModal({ open, onClose, uid, name }) {
  const [av, save] = useAvatar(uid);
  return (
    <Modal open={open} onClose={onClose} title="Avatarni sozlash">
      <div className="pf-avatar-edit">
        <Avatar uid={uid} name={name} size={84} />
        <p className="pf-muted">Avatar faqat shu qurilmada saqlanadi.</p>
        <div className="pf-swatches" role="radiogroup" aria-label="Rang">
          {AVATAR_COLORS.map(([a, b], i) => (
            <button key={i} type="button" role="radio" aria-checked={av.c === i} aria-label={'Rang ' + (i + 1)}
              className={'pf-swatch' + (av.c === i ? ' is-on' : '')} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }} onClick={() => save({ ...av, c: i })} />
          ))}
        </div>
        <div className="pf-emojis" role="radiogroup" aria-label="Belgi">
          {AVATAR_EMOJI.map((e) => (
            <button key={e || 'harf'} type="button" role="radio" aria-checked={av.e === e} className={'pf-emoji' + (av.e === e ? ' is-on' : '')} onClick={() => save({ ...av, e })}>
              {e || 'Aa'}
            </button>
          ))}
        </div>
        <button type="button" className="mf-button mf-button--primary" onClick={onClose}>Tayyor</button>
      </div>
    </Modal>
  );
}

function Stat({ icon, label, value, hint, tone }) {
  return (
    <div className={'pf-stat' + (tone ? ' pf-stat--' + tone : '')}>
      <span className="pf-stat__icon"><i className={'fa-solid ' + icon} /></span>
      <div><small>{label}</small><strong>{value}</strong>{hint && <em>{hint}</em>}</div>
    </div>
  );
}

function Meter({ label, used, max }) {
  const unlimited = !max;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / max) * 100));
  const tone = pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : 'ok';
  return (
    <div className="pf-meter">
      <div className="pf-meter__row"><span>{label}</span><b>{used.toLocaleString('ru-RU')} / {unlimited ? '∞' : max.toLocaleString('ru-RU')}</b></div>
      <div className="pf-meter__bar" role="progressbar" aria-valuenow={unlimited ? 0 : pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <span className={'is-' + tone} style={{ width: (unlimited ? 4 : Math.max(pct, 3)) + '%' }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 1) UMUMIY
function Overview({ bal, plan, refData, ai, left, onPlanChange }) {
  const { toast } = useToast();
  const [renewBusy, setRenewBusy] = useState(false);
  const lim = plan?.limits || {};
  const use = plan?.usage || {};
  const link = refData?.referralLink || '';
  const invited = refData?.stats?.count ?? bal?.referralLevel?.count ?? 0;
  const bonus = refData?.stats?.totalBonus ?? 0;
  const lvl = refData?.level;
  const nextMin = lvl?.next?.min;
  const refPct = nextMin ? Math.min(100, Math.round((invited / nextMin) * 100)) : 100;

  async function toggleRenew() {
    if (!plan || renewBusy) return;
    setRenewBusy(true);
    try {
      const r = await api.post('/plans/auto_renew.php', { on: !plan.autoRenew });
      onPlanChange({ ...plan, autoRenew: r.autoRenew });
      toast(r.autoRenew ? 'Avto-uzaytirish yoqildi' : 'Avto-uzaytirish o‘chirildi');
    } catch (e) { toast(errText(e), { tone: 'danger' }); }
    finally { setRenewBusy(false); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(link); toast('Havola nusxalandi'); }
    catch { toast('Nusxalab bo‘lmadi', { tone: 'danger' }); }
  }
  const aiItems = (ai?.items || []).slice(0, 3);

  return (
    <div className="pf-grid">
      <div className="pf-stats">
        <Stat icon="fa-robot" label="Botlar" value={(bal?.botsCount ?? use.bots ?? 0) + ' ta'} hint={lim.max_bots ? `limit: ${lim.max_bots}` : 'cheksiz'} />
        <Stat icon="fa-crown" label="Tarif" value={bal?.plan?.nomi || plan?.plan || 'Oddiy'} hint={left !== null ? (left >= 0 ? `${left} kun qoldi` : 'muddati tugagan') : 'muddatsiz'} tone={left !== null && left <= 3 ? 'warn' : ''} />
        <Stat icon="fa-user-group" label="Taklif qilinganlar" value={invited + ' ta'} hint={bonus ? '+' + formatMoney(bonus) : 'bonus yo‘q'} />
        <Stat icon="fa-wand-magic-sparkles" label="AI loyihalar" value={(ai?.items?.length ?? 0) + ' ta'} hint={ai?.items?.some((x) => x.bot) ? 'ishga tushgan bor' : 'hali yo‘q'} />
      </div>
      {String(bal?.plan?.nomi || plan?.plan || 'Oddiy').trim().toLowerCase() === 'oddiy' && (
        <Link to="/tariflar" className="pf-upgrade">
          <span className="pf-upgrade__icon"><i className="fa-solid fa-crown" aria-hidden="true" /></span>
          <span className="pf-upgrade__copy"><b>Premium tarifga yangilang</b><small>Ko‘proq imkoniyatlar, cheksiz botlar va ustuvor texnik yordam.</small></span>
          <span className="pf-upgrade__action">Yangilash <i className="fa-solid fa-chevron-right" aria-hidden="true" /></span>
        </Link>
      )}

      <section className="pf-card">
        <CardHead icon="fa-gauge" title="Tarif va limitlar" sub="Joriy foydalanish" />
        {plan ? (
          <>
            <Meter label="Botlar" used={use.bots ?? 0} max={lim.max_bots} />
            <Meter label="Oylik xabarlar" used={use.messages ?? 0} max={lim.monthly_messages} />
            <div className="pf-row">
              <div><b>Avto-uzaytirish</b><small>{plan.until ? `Tarif ${fmtDate(plan.until)} gacha` : 'Tarif muddati belgilanmagan'}</small></div>
              <button type="button" role="switch" aria-checked={Boolean(plan.autoRenew)} disabled={renewBusy} onClick={toggleRenew} className={'mf-switch ' + (plan.autoRenew ? 'is-on' : '')}><span /></button>
            </div>
            <Link to="/tariflar" className="mf-button mf-button--ghost pf-wide"><i className="fa-solid fa-arrow-up-right-dots" /> Tarifni ko‘rish / oshirish</Link>
          </>
        ) : <p className="pf-muted">Tarif ma’lumoti hozircha yuklanmadi.</p>}
      </section>

      <section className="pf-card">
        <CardHead icon="fa-users" title="Referal dasturi" sub="Do‘stlarni taklif qiling — bonus oling" />
        <div className="pf-reflink">
          <input readOnly value={link || '—'} aria-label="Referal havola" onFocus={(e) => e.target.select()} />
          <button type="button" className="mf-button mf-button--primary" onClick={copyLink} disabled={!link}><i className="fa-regular fa-copy" /></button>
        </div>
        {link && (
          <a className="mf-button mf-button--ghost pf-wide" target="_blank" rel="noreferrer"
            href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Makefy — Telegram bot yaratish platformasi')}`}>
            <i className="fa-brands fa-telegram" /> Telegramda ulashish
          </a>
        )}
        <div className="pf-meter">
          <div className="pf-meter__row"><span>Daraja: {lvl?.current?.name || bal?.referralLevel?.name || 'Oddiy'}</span><b>{nextMin ? `${invited} / ${nextMin}` : 'Eng yuqori'}</b></div>
          <div className="pf-meter__bar"><span className="is-ok" style={{ width: Math.max(refPct, 3) + '%' }} /></div>
        </div>
      </section>

      <section className="pf-card pf-card--wide">
        <CardHead icon="fa-wand-magic-sparkles" title="AI bilan yaratilgan botlar" sub="Oxirgi loyihalar" action={<Link to="/ai" className="pf-link">Hammasi <i className="fa-solid fa-arrow-right" /></Link>} />
        {aiItems.length === 0 ? (
          <div className="pf-empty">
            <p>Hali AI loyiha yo‘q. Botingiz nima qilishini yozing — AI tayyorlab beradi.</p>
            <Link to="/ai" className="mf-button mf-button--primary"><i className="fa-solid fa-wand-magic-sparkles" /> AI bilan bot yaratish</Link>
          </div>
        ) : (
          <ul className="pf-list">
            {aiItems.map((p) => (
              <li key={p.id}>
                <Link to={`/ai?chat=${p.id}`} className="pf-list__item">
                  <span className="pf-list__icon"><i className="fa-solid fa-robot" /></span>
                  <div><b>{p.title}</b><small>{p.bot ? '@' + p.bot + ' · ishlayapti' : p.due > 0 ? `To‘lov kutilmoqda · ${formatMoney(p.due)}` : p.ready ? 'To‘langan — token kutilmoqda' : 'Tayyorlanmoqda'}</small></div>
                  <i className="fa-solid fa-chevron-right" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pf-card pf-card--wide">
        <CardHead icon="fa-bolt" title="Tezkor amallar" sub="Ko‘p ishlatiladigan bo‘limlar" />
        <div className="pf-quick">
          <QuickLink to="/create" icon="fa-plus" label="Yangi bot" primary />
          <QuickLink to="/ai" icon="fa-wand-magic-sparkles" label="AI bilan yaratish" />
          <QuickLink to="/bots" icon="fa-robot" label="Botlarim" />
          <QuickLink to="/deposit" icon="fa-wallet" label="Hisobni to‘ldirish" />
          <QuickLink to="/tariflar" icon="fa-crown" label="Tariflar" />
          <QuickLink to="/sozlamalar" icon="fa-gear" label="Sozlamalar" />
          <QuickLink to="/vazifalar" icon="fa-list-check" label="Vazifalar" />
          <QuickLink to="/chat" icon="fa-comments" label="Yordam" />
        </div>
      </section>
    </div>
  );
}

function CardHead({ icon, title, sub, action }) {
  return (
    <div className="pf-card__head">
      <span><i className={'fa-solid ' + icon} /></span>
      <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
      {action && <div className="pf-card__action">{action}</div>}
    </div>
  );
}
function QuickLink({ to, icon, label, primary }) {
  return <Link to={to} className={'pf-quick__item' + (primary ? ' is-primary' : '')}><i className={'fa-solid ' + icon} /> {label}</Link>;
}

// ---------------------------------------------------------------- 2) TO'LOVLAR
function Payments({ invoices }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [shown, setShown] = useState(15);

  const norm = useMemo(() => invoices.map((i) => ({ ...i, k: i.kind === 'renewal' ? 'plan' : i.kind })), [invoices]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return norm.filter((i) => (filter === 'all' || i.k === filter) && (!s || (i.title + ' ' + i.number).toLowerCase().includes(s)));
  }, [norm, filter, q]);
  const spent = norm.filter((i) => i.amount > 0).reduce((a, i) => a + i.amount, 0);
  const refunded = norm.filter((i) => i.amount < 0).reduce((a, i) => a + Math.abs(i.amount), 0);

  function exportCsv() {
    const rows = [['Raqam', 'Sana', 'Turi', 'Nomi', 'Summa (so‘m)', 'Holat']]
      .concat(list.map((i) => [i.number, fmtDate(i.created_at, true), (KIND_META[i.kind] || {}).label || i.kind, i.title, i.amount, i.status]));
    download('makefy-tolovlar.csv', '\ufeff' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  }

  return (
    <div className="pf-stack">
      <div className="pf-stats pf-stats--3">
        <Stat icon="fa-arrow-trend-down" label="Jami sarflangan" value={formatMoney(spent)} />
        <Stat icon="fa-rotate-left" label="Qaytarilgan" value={formatMoney(refunded)} />
        <Stat icon="fa-file-invoice" label="Hisob-fakturalar" value={norm.length + ' ta'} hint="oxirgi 50 tasi" />
      </div>
      <section className="pf-card">
        <div className="pf-toolbar">
          <div className="pf-search"><i className="fa-solid fa-magnifying-glass" /><input value={q} onChange={(e) => { setQ(e.target.value); setShown(15); }} placeholder="Nomi yoki raqam bo‘yicha qidirish" aria-label="To‘lovlarni qidirish" /></div>
          <button type="button" className="mf-button mf-button--ghost" onClick={exportCsv} disabled={!list.length}><i className="fa-solid fa-file-csv" /> CSV</button>
        </div>
        <div className="pf-filters" role="group" aria-label="Tur bo‘yicha filtr">
          {FILTERS.map(([id, l]) => <button key={id} type="button" aria-pressed={filter === id} className={'pf-filter' + (filter === id ? ' is-on' : '')} onClick={() => { setFilter(id); setShown(15); }}>{l}</button>)}
        </div>
        {list.length === 0 ? (
          <div className="pf-empty"><p>{norm.length ? 'Filtrga mos to‘lov topilmadi.' : 'Hali to‘lovlar yo‘q.'}</p></div>
        ) : (
          <ul className="pf-list">
            {list.slice(0, shown).map((i) => {
              const m = KIND_META[i.kind] || { label: i.kind, icon: 'fa-receipt' };
              const neg = i.amount < 0;
              return (
                <li key={i.number} className="pf-list__item pf-list__item--static">
                  <span className="pf-list__icon"><i className={'fa-solid ' + m.icon} /></span>
                  <div><b>{i.title}</b><small>{m.label} · {fmtDate(i.created_at, true)} · {i.number}</small></div>
                  <strong className={neg ? 'is-plus' : 'is-minus'}>{neg ? '+' : '−'}{formatMoney(Math.abs(i.amount))}</strong>
                </li>
              );
            })}
          </ul>
        )}
        {list.length > shown && <button type="button" className="mf-button mf-button--ghost pf-wide" onClick={() => setShown((n) => n + 15)}>Yana ko‘rsatish ({list.length - shown})</button>}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- 3) FAOLIYAT
function Activity() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    api.get('/profile/activity.php').then((r) => { if (alive) setItems(r.items || []); }).catch((e) => { if (alive) setErr(errText(e, 'Faoliyat yuklanmadi.')); });
    return () => { alive = false; };
  }, []);

  const groups = useMemo(() => {
    const g = [];
    (items || []).forEach((it) => {
      const label = dayLabel(it.at);
      const last = g[g.length - 1];
      if (last && last.label === label) last.rows.push(it); else g.push({ label, rows: [it] });
    });
    return g;
  }, [items]);

  if (err) return <div className="pf-card"><div className="pf-alert pf-alert--err">{err}</div></div>;
  if (!items) return <div className="pf-card"><p className="pf-muted">Yuklanmoqda…</p></div>;
  if (!items.length) return <div className="pf-card"><div className="pf-empty"><p>Hali faoliyat yo‘q. Bot yaratganingizda yoki to‘lov qilganingizda shu yerda ko‘rinadi.</p></div></div>;
  return (
    <section className="pf-card">
      <CardHead icon="fa-clock-rotate-left" title="So‘nggi faoliyat" sub="Hisobingizdagi oxirgi 60 ta amal" />
      {groups.map((g) => (
        <div key={g.label} className="pf-timeline">
          <h3>{g.label}</h3>
          <ul>
            {g.rows.map((r) => {
              const [label, icon] = prettyAction(r.action);
              const t = parseDate(r.at);
              return (
                <li key={r.id}>
                  <span className="pf-timeline__dot"><i className={'fa-solid ' + icon} /></span>
                  <div><b>{label}{r.bot ? ` · @${r.bot}` : ''}</b><small>{t ? `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}` : ''}{r.ip ? ` · IP ${r.ip}` : ''}</small></div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------- 4) XAVFSIZLIK
function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const STRENGTH_LABELS = ['Juda zaif', 'Zaif', 'O‘rtacha', 'Yaxshi', 'A’lo'];

function Security({ onLogout }) {
  const [eski, setEski] = useState('');
  const [yangi, setYangi] = useState('');
  const [yangi2, setYangi2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const sc = strength(yangi);
  const match = yangi2.length > 0 && yangi === yangi2;
  const canSubmit = eski && yangi.length >= 8 && match && !busy;

  async function submit(e) {
    e.preventDefault();
    setMsg(''); setErr('');
    if (yangi !== yangi2) { setErr('Yangi parollar bir-biriga mos kelmaydi.'); return; }
    setBusy(true);
    try {
      const r = await api.post('/balance.php', { amal: 'parol_ozgartir', eski_parol: eski, yangi_parol: yangi, yangi_parol2: yangi2 });
      setMsg(r.message || 'Parol o‘zgartirildi.'); setEski(''); setYangi(''); setYangi2('');
    } catch (ex) { setErr(errText(ex)); }
    finally { setBusy(false); }
  }

  return (
    <div className="pf-grid">
      <section className="pf-card">
        <CardHead icon="fa-key" title="Parolni yangilash" sub="Kuchli va noyob parol tanlang" />
        {msg && <div className="pf-alert pf-alert--ok" role="status">{msg}</div>}
        {err && <div className="pf-alert pf-alert--err" role="alert">{err}</div>}
        <form onSubmit={submit} className="pf-form">
          <label>Joriy parol<input type={show ? 'text' : 'password'} value={eski} onChange={(e) => setEski(e.target.value)} autoComplete="current-password" required /></label>
          <label>Yangi parol<input type={show ? 'text' : 'password'} value={yangi} onChange={(e) => setYangi(e.target.value)} autoComplete="new-password" minLength={8} required /></label>
          {yangi && (
            <div className="pf-strength" aria-live="polite">
              <div className="pf-strength__bars">{[0, 1, 2, 3].map((i) => <span key={i} className={i < sc ? 'is-on is-s' + sc : ''} />)}</div>
              <small>{STRENGTH_LABELS[sc]}</small>
            </div>
          )}
          <label>Yangi parolni tasdiqlang<input type={show ? 'text' : 'password'} value={yangi2} onChange={(e) => setYangi2(e.target.value)} autoComplete="new-password" minLength={8} required /></label>
          {yangi2 && <small className={match ? 'pf-ok' : 'pf-bad'}><i className={'fa-solid ' + (match ? 'fa-circle-check' : 'fa-circle-xmark')} /> {match ? 'Parollar mos' : 'Parollar mos emas'}</small>}
          <label className="pf-check"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Parolni ko‘rsatish</label>
          <button disabled={!canSubmit} className="mf-button mf-button--primary pf-wide"><i className="fa-solid fa-floppy-disk" /> {busy ? 'Saqlanmoqda…' : 'Parolni o‘zgartirish'}</button>
        </form>
      </section>

      <div className="pf-stack">
        <LinkedAccount />
        <section className="pf-card">
          <CardHead icon="fa-shield-halved" title="Xavfsizlik bo‘yicha maslahatlar" />
          <ul className="pf-tips">
            <li><i className="fa-solid fa-check" /> Parol kamida 12 belgi: katta-kichik harf, raqam va belgi aralash bo‘lsin.</li>
            <li><i className="fa-solid fa-check" /> Bot tokenini hech kimga yubormang — tokeni oshkor bo‘lsa @BotFather’da qayta yarating.</li>
            <li><i className="fa-solid fa-check" /> Begona qurilmada ishlatgan bo‘lsangiz, hisobdan chiqing.</li>
          </ul>
          <button type="button" onClick={onLogout} className="mf-settings-link mf-settings-link--danger pf-wide">
            <span><i className="fa-solid fa-right-from-bracket" /></span><b>Hisobdan chiqish</b><i className="fa-solid fa-arrow-right" />
          </button>
        </section>
      </div>
    </div>
  );
}

function LinkedAccount() {
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const load = useCallback(() => api.get('/auth/link_status.php').then(setLink).catch(() => setLink(null)), []);
  useEffect(() => { load(); }, [load]);

  function openExternal(url) {
    const tg = window.Telegram?.WebApp;
    if (tg?.openLink) tg.openLink(url); else window.open(url, '_blank', 'noopener,noreferrer');
  }
  async function start() {
    setBusy(true); setMsg('');
    try {
      const d = await api.post(link?.mode === 'telegram' ? '/auth/link_google_start.php' : '/auth/link_start.php', {});
      const url = d?.url || d?.botLink;
      if (url) openExternal(url); else setMsg('Havola olinmadi.');
    } catch (e) { setMsg(errText(e)); }
    finally { setBusy(false); }
  }
  async function unlink() {
    if (!window.confirm('Ulanishni uzasizmi?')) return;
    setBusy(true); setMsg('');
    try { await api.post('/auth/link_unlink.php', {}); await load(); }
    catch (e) { setMsg(errText(e)); }
    finally { setBusy(false); }
  }
  if (!link) return null;
  const isTg = link.mode === 'telegram';
  return (
    <section className="pf-card">
      <CardHead icon={isTg ? 'fa-google' : 'fa-telegram'} title={isTg ? 'Google hisob' : 'Telegram akkaunt'} sub="Qo‘shimcha kirish usuli va bildirishnomalar" />
      {link.linked
        ? <div className="pf-alert pf-alert--ok"><i className="fa-solid fa-circle-check" /> {link.label || 'Ulangan'}</div>
        : <p className="pf-muted">Hali ulanmagan. Ulasangiz, ikkinchi usul bilan ham kira olasiz.</p>}
      {msg && <div className="pf-alert pf-alert--err" role="alert">{msg}</div>}
      {link.linked
        ? <button type="button" disabled={busy} onClick={unlink} className="mf-button mf-button--ghost pf-wide"><i className="fa-solid fa-link-slash" /> Ulanishni uzish</button>
        : <button type="button" disabled={busy} onClick={start} className="mf-button mf-button--primary pf-wide"><i className={'fa-brands ' + (isTg ? 'fa-google' : 'fa-telegram')} /> {isTg ? 'Google bilan ulash' : 'Telegram ulash'}</button>}
    </section>
  );
}

// ---------------------------------------------------------------- 5) SOZLAMALAR
const THEME_OPTIONS = [
  { value: 'system', icon: 'fa-circle-half-stroke', label: 'Tizim' },
  { value: 'light', icon: 'fa-sun', label: 'Kun' },
  { value: 'dark', icon: 'fa-moon', label: 'Tun' },
];

function readLocal(key, fallback) { try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; } }

function Preferences({ bal, plan, refData }) {
  const { preference, setPreference } = useTheme();
  const { t, pref: langPref, setPref: setLangPref } = useI18n();
  const { toast } = useToast();
  const { user: authUser, saveName } = useAuth();
  const [ismVal, setIsmVal] = useState(authUser?.ism || '');
  const [ismBusy, setIsmBusy] = useState(false);
  async function submitIsm(e) {
    e.preventDefault();
    const ism = ismVal.trim().replace(/\s+/g, ' ');
    if (ism.length < 2 || ism.length > 40) { toast(t('name.invalid')); return; }
    setIsmBusy(true);
    const r = await saveName(ism);
    setIsmBusy(false);
    toast(r.ok ? t('name.saved') : r.error);
  }
  const [notif, setNotif] = useState(readLocal('mf_bildirishnoma', '1') !== '0');
  const [reduced, setReduced] = useState(() => readReducedMotion());
  useEffect(() => {
    applyReducedMotion(reduced);
    try { localStorage.setItem('mf_bildirishnoma', notif ? '1' : '0'); localStorage.setItem('mf_reduced_motion', reduced ? '1' : '0'); } catch { /* sessiyada qoladi */ }
  }, [notif, reduced]);

  async function exportData() {
    let activity = [];
    try { activity = (await api.get('/profile/activity.php')).items || []; } catch { /* faoliyatsiz ham eksport qilinadi */ }
    const data = {
      eksport_sanasi: new Date().toISOString(),
      profil: { ism: bal?.user?.ism, id: bal?.user?.foydalanuvchi_id || bal?.user?.user_id, balans: bal?.user?.balance },
      tarif: { nomi: bal?.plan?.nomi, muddat: plan?.until, limitlar: plan?.limits, foydalanish: plan?.usage },
      referal: { havola: refData?.referralLink, soni: refData?.stats?.count, bonus: refData?.stats?.totalBonus },
      tolovlar: plan?.invoices || [],
      faoliyat: activity,
    };
    download('makefy-malumotlarim.json', JSON.stringify(data, null, 2), 'application/json');
    toast('Ma’lumotlar yuklab olindi');
  }

  return (
    <div className="pf-grid">
      <section className="pf-card">
        <CardHead icon="fa-palette" title="Ko‘rinish" sub="Mavzu va animatsiyalar" />
        <div className="mf-theme-picker pf-theme" role="radiogroup" aria-label="Ko‘rinish rejimi">
          {THEME_OPTIONS.map((o) => (
            <button key={o.value} type="button" role="radio" aria-checked={preference === o.value} onClick={() => setPreference(o.value)} className={'mf-theme-choice ' + (preference === o.value ? 'is-active' : '')}>
              <i className={'fa-solid ' + o.icon} /><span>{o.label}</span>
            </button>
          ))}
        </div>
        <ToggleRow icon="fa-wand-magic-sparkles" title="Harakatlarni kamaytirish" sub="Animatsiyalarni yengil rejimga o‘tkazish" checked={reduced} onChange={setReduced} />
        <ToggleRow icon="fa-bell" title="Bot va tizim xabarlari" sub="Muhim yangiliklar va holat o‘zgarishlari" checked={notif} onChange={setNotif} />
      </section>

      <section className="pf-card">
        <CardHead icon="fa-user" title={t('name.label')} sub={t('name.settingsHint')} />
        <form className="flex gap-2" onSubmit={submitIsm}>
          <input className="flex-1 min-w-0 rounded-[12px] border border-border bg-bg px-3 py-2 outline-none focus:border-accent" value={ismVal} onChange={(e) => setIsmVal(e.target.value)} placeholder={t('name.placeholder')} maxLength={40} aria-label={t('name.label')} />
          <button type="submit" disabled={ismBusy} className="mf-button mf-button--primary">{t('name.save')}</button>
        </form>
      </section>

      <section className="pf-card">
        <CardHead icon="fa-language" title={t('settings.language')} sub={t('settings.languageHint')} />
        <div className="pf-langs" role="radiogroup" aria-label={t('lang.label')}>
          {['auto', 'uz', 'ru', 'en'].map((l) => (
            <button key={l} type="button" role="radio" aria-checked={langPref === l} onClick={() => setLangPref(l)} className={'mf-button ' + (langPref === l ? 'mf-button--primary' : 'mf-button--ghost')}>
              {l === 'auto' ? t('lang.auto') : { uz: 'O‘zbekcha', ru: 'Русский', en: 'English' }[l]}
            </button>
          ))}
        </div>
      </section>

      <section className="pf-card pf-card--wide">
        <CardHead icon="fa-database" title="Ma’lumotlarim" sub="Profil, tarif, to‘lovlar va faoliyatni yuklab oling" />
        <div className="pf-quick">
          <button type="button" className="pf-quick__item" onClick={exportData}><i className="fa-solid fa-file-export" /> JSON yuklab olish</button>
          <Link to="/sozlamalar" className="pf-quick__item"><i className="fa-solid fa-sliders" /> Barcha sozlamalar</Link>
          <a href="/Manual/" className="pf-quick__item"><i className="fa-solid fa-book-open" /> Qo‘llanma</a>
        </div>
      </section>
    </div>
  );
}

function ToggleRow({ icon, title, sub, checked, onChange }) {
  return (
    <div className="pf-row">
      <span className="pf-row__icon"><i className={'fa-solid ' + icon} /></span>
      <div><b>{title}</b><small>{sub}</small></div>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={'mf-switch ' + (checked ? 'is-on' : '')}><span /></button>
    </div>
  );
}
