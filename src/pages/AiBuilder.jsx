import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/format';
import { useToast } from '../components/ui';

const LS_KEY = 'mf_ai_chat';
const GREETING = {
  role: 'ai',
  text: 'Assalomu alaykum! Men Makefy AI bot arxitektoriman. Qanday Telegram bot yaratmoqchisiz? Botingiz nimalar qila olishi kerakligini oddiy so‘zlar bilan yozing — men uning to‘liq tuzilmasini va tugmalarini tayyorlab beraman.',
};

const PROMPT_TEMPLATES = [
  {
    icon: 'fa-utensils',
    title: 'Kafe & Restoran',
    desc: 'Menyu ko‘rish, savatcha, buyurtma uchun ism va telefon olish',
  },
  {
    icon: 'fa-graduation-cap',
    title: 'O‘quv Markazi',
    desc: 'Kurslar ro‘yxati, dars jadvali, ro‘yxatdan o‘tish va test',
  },
  {
    icon: 'fa-cart-shopping',
    title: 'Do‘kon & Katalog',
    desc: 'Mahsulotlar toifalari, narxlar, savat va yetkazib berish manzili',
  },
  {
    icon: 'fa-bullhorn',
    title: 'Kanal Admin Boti',
    desc: 'Obunani tekshirish, savol-javob, admin bilan qayta aloqa',
  },
];

const STEPS = [
  { title: 'Tasvirlash', desc: 'Bot vazifasini yozish' },
  { title: 'Sinab ko‘rish', desc: 'Telegram simulyatorida tekshirish' },
  { title: 'To‘lov', desc: 'Botni aktivlashtirish' },
  { title: 'Ishga tushirish', desc: 'Token bilan ulash' },
];

const SIM_MEDIA = {
  photo: '📷 (rasm yuborildi)',
  file: '📎 (fayl yuborildi)',
  location: '📍 (joylashuv yuborildi)',
  contact: '📱 (raqam yuborildi)',
};

const SIM_LABEL = {
  photo: '📷 Rasm yuborish (sinov)',
  file: '📎 Fayl yuborish (sinov)',
  location: '📍 Joylashuv yuborish (sinov)',
  contact: '📱 Raqam yuborish (sinov)',
};

function errText(error, fallback = 'Xatolik yuz berdi. Qayta urinib ko‘ring.') {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code === 'UNAUTHENTICATED') return 'Sessiya tugagan. Qayta kiring.';
  if (error.code === 'FETCH_FAILED' || error.status >= 500) return 'Serverda vaqtinchalik muammo. Bir ozdan keyin qayta urinib ko‘ring.';
  if (error.code === 'BAD_RESPONSE') return 'Server noto‘g‘ri javob qaytardi. Qayta urinib ko‘ring.';
  return error.message || fallback;
}

function readLS() {
  try { return localStorage.getItem(LS_KEY) || ''; } catch { return ''; }
}
function writeLS(v) {
  try { if (v) localStorage.setItem(LS_KEY, v); else localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}
function ago(ts) {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - Number(ts || 0));
  if (s < 90) return 'hozir';
  if (s < 3600) return Math.floor(s / 60) + ' daq. oldin';
  if (s < 86400) return Math.floor(s / 3600) + ' soat oldin';
  return Math.floor(s / 86400) + ' kun oldin';
}

export default function AiBuilder() {
  const { user, updateBalance } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();

  const [chatId, setChatId] = useState(null);
  const [msgs, setMsgs] = useState([GREETING]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ready, setReady] = useState(false);
  const [summary, setSummary] = useState([]);
  const [left, setLeft] = useState(null);
  const [quote, setQuote] = useState(null);
  const [bot, setBot] = useState('');
  const [lowFunds, setLowFunds] = useState(false);
  const [token, setToken] = useState('');
  const [justDeployed, setJustDeployed] = useState(false);
  const [simKey, setSimKey] = useState(0);
  const [projects, setProjects] = useState(null);
  const [opening, setOpening] = useState(false);
  const endRef = useRef(null);

  const loadProjects = useCallback(() => {
    api.get('/create/ai_list.php')
      .then((r) => setProjects(r.items || []))
      .catch(() => setProjects([]));
  }, []);

  const reset = useCallback(() => {
    setChatId(null);
    setMsgs([GREETING]);
    setReady(false);
    setSummary([]);
    setLeft(null);
    setQuote(null);
    setBot('');
    setErr('');
    setLowFunds(false);
    setToken('');
    setJustDeployed(false);
    setSimKey((k) => k + 1);
  }, []);

  const openChat = useCallback(async (id) => {
    setOpening(true);
    setErr('');
    try {
      const r = await api.post('/create/ai_status.php', { chat_id: id });
      setChatId(r.chat_id);
      writeLS(r.chat_id);
      setMsgs(r.messages?.length ? [GREETING, ...r.messages] : [GREETING]);
      setReady(Boolean(r.ready));
      setSummary(r.summary || []);
      setLeft(r.turnsLeft);
      setQuote(r.quote || null);
      setBot(r.bot || '');
      setLowFunds(false);
      setToken('');
      setJustDeployed(false);
      setSimKey((k) => k + 1);
      if (typeof r.balance === 'number') updateBalance(r.balance);
    } catch (ex) {
      writeLS('');
      reset();
      if (!(ex instanceof ApiError && ex.status === 422)) setErr(errText(ex, 'Loyiha ochilmadi.'));
    } finally {
      setOpening(false);
    }
  }, [reset, updateBalance]);

  useEffect(() => {
    loadProjects();
    const id = params.get('chat') || readLS();
    if (id) openChat(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [msgs, busy]);

  function pick(id) {
    setParams({ chat: id }, { replace: true });
    openChat(id);
  }

  function startNew() {
    writeLS('');
    setParams({}, { replace: true });
    reset();
  }

  async function send(e) {
    e?.preventDefault();
    const m = text.trim();
    if (m.length < 3 || busy || left === 0) return;
    setBusy(true);
    setErr('');
    setText('');
    setMsgs((x) => [...x, { role: 'me', text: m }]);
    try {
      const r = await api.post('/create/ai_chat.php', { chat_id: chatId, message: m });
      setChatId(r.chat_id);
      writeLS(r.chat_id);
      setReady(Boolean(r.ready));
      setSummary(r.summary || []);
      setLeft(r.turnsLeft);
      setQuote(r.quote || null);
      setLowFunds(false);
      setMsgs((x) => [...x, { role: 'ai', text: r.reply }]);
      if (r.changed) {
        setSimKey((k) => k + 1);
        setJustDeployed(false);
      }
      loadProjects();
    } catch (ex) {
      setErr(errText(ex, 'AI javob bera olmadi. Qayta urinib ko‘ring.'));
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (busy || !quote || quote.due <= 0) return;
    setBusy(true);
    setErr('');
    setLowFunds(false);
    try {
      const r = await api.post('/create/ai_pay.php', { chat_id: chatId });
      setQuote(r.quote);
      if (typeof r.balance === 'number') updateBalance(r.balance);
      toast('To‘lov muvaffaqiyatli qabul qilindi! 🎉');
      loadProjects();
    } catch (ex) {
      if (ex instanceof ApiError && ex.code === 'INSUFFICIENT_BALANCE') setLowFunds(true);
      setErr(errText(ex, 'Balans yetarli emas yoki to‘lovda xatolik.'));
    } finally {
      setBusy(false);
    }
  }

  async function deploy(e) {
    e?.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const body = bot ? { chat_id: chatId, bot } : { chat_id: chatId, token: token.trim() };
      const r = await api.post('/create/ai_deploy.php', body);
      setBot(r.botUsername);
      setToken('');
      setJustDeployed(true);
      toast(bot ? 'Bot muvaffaqiyatli yangilandi!' : 'Bot muvaffaqiyatli ishga tushdi! 🚀');
      loadProjects();
    } catch (ex) {
      if (ex instanceof ApiError && ex.code === 'PAYMENT_REQUIRED') {
        setQuote((q) => (q ? { ...q, unlocked: false } : q));
      }
      setErr(errText(ex, 'Botni ishga tushirib bo‘lmadi. Tokenni tekshiring.'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(p) {
    if (!window.confirm(`«${p.title}» loyihasini butunlay o‘chirasizmi?`)) return;
    try {
      await api.post('/create/ai_delete.php', { chat_id: p.id });
      if (p.id === chatId) startNew();
      loadProjects();
    } catch (ex) {
      toast(errText(ex, 'O‘chirilmadi.'), { tone: 'danger' });
    }
  }

  const currentStep = !ready ? 0 : quote && quote.due > 0 ? 2 : !bot ? 3 : 3;
  const needsToken = !bot;

  return (
    <div className="pro-ai-page">
      {/* 1. AI Studio Zamonaviy Header */}
      <section className="pro-ai-hero">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 700, marginBottom: 10, border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            <i className="fa-solid fa-sparkles" />
            MAKEFY AI BOT STUDIO 2.0
          </div>
          <h1 className="pro-ai-hero__title">
            <i className="fa-solid fa-wand-magic-sparkles" />
            AI bilan Telegram bot yaratish
          </h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-muted)', maxWidth: 650, margin: 0, lineHeight: 1.55 }}>
            Botingiz qanday ishlashi kerakligini o‘z tilingizda ayting. AI darhol uning tugmalari, menyusi va javoblarini tayyorlab beradi.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={startNew} className="pro-btn-preview" style={{ height: 42, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-plus" />
            <span>Yangi loyiha</span>
          </button>
          <Link to="/market" className="pro-btn-preview" style={{ height: 42, display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <i className="fa-solid fa-store" />
            <span>Tayyor shablonlar</span>
          </Link>
        </div>
      </section>

      {/* 2. Stepper: 4 bosqichli indikator */}
      <div className="pro-ai-stepper">
        {STEPS.map((s, i) => {
          const isDone = i < currentStep;
          const isActive = i === currentStep;
          return (
            <div key={s.title} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
              <div className={'pro-ai-step' + (isDone ? ' is-done' : '') + (isActive ? ' is-active' : '')}>
                <div className="pro-ai-step__circle">
                  {isDone ? <i className="fa-solid fa-check" /> : i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? 'var(--text)' : 'inherit' }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 400 }}>{s.desc}</div>
                </div>
              </div>
              {i < STEPS.length - 1 && <div className="pro-ai-step__divider" />}
            </div>
          );
        })}
      </div>

      {/* 3. Asosiy Ish Maydoni (Workspace Grid) */}
      <div className="pro-ai-workspace">
        {/* Chap ustun: AI Chat */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="pro-ai-chat-card">
            {/* Chat header */}
            <div className="pro-ai-chat-head">
              <div className="pro-ai-chat-status">
                <span className="pro-pulse-dot" />
                <span>AI Arxitektor {opening ? 'bog‘lanmoqda…' : 'onlayn'}</span>
              </div>
              {left !== null && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 8 }}>
                  Qolgan xabarlar: <b>{left}</b>
                </span>
              )}
            </div>

            {/* Xabarlar ro'yxati */}
            <div className="pro-ai-messages">
              {msgs.map((m, i) => {
                const isUser = m.role === 'me';
                return (
                  <div key={i} className={'pro-ai-bubble' + (isUser ? ' is-user' : '')}>
                    <div className="pro-ai-bubble__avatar">
                      <i className={`fa-solid ${isUser ? 'fa-user' : 'fa-robot'}`} />
                    </div>
                    <div className="pro-ai-bubble__content">
                      {m.text}
                    </div>
                  </div>
                );
              })}

              {busy && (
                <div className="pro-ai-bubble">
                  <div className="pro-ai-bubble__avatar">
                    <i className="fa-solid fa-robot" />
                  </div>
                  <div className="pro-ai-bubble__content" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-circle-notch fa-spin" />
                    <span>AI o‘ylamoqda va tuzilmani qurmoqda…</span>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>

            {/* Boshlang'ich tavsiyalar (Quick Prompts) */}
            {!chatId && msgs.length <= 1 && (
              <div style={{ padding: '14px 18px', borderTop: '1px solid var(--pro-card-border)', background: 'rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 10 }}>
                  G‘oya kerakmi? Bir bosishda boshlang:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                  {PROMPT_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.title}
                      type="button"
                      onClick={() => setText(`${tpl.title} uchun bot: ${tpl.desc}`)}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--pro-card-border)',
                        borderRadius: 12,
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: 'var(--text)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#a5b4fc', marginBottom: 2 }}>
                        <i className={`fa-solid ${tpl.icon}`} />
                        <span>{tpl.title}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.35 }}>
                        {tpl.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Xatolik */}
            {err && (
              <div style={{ margin: '0 16px 10px', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 10, color: '#f87171', fontSize: 13 }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
                {err}
              </div>
            )}

            {/* Chat yozish paneli */}
            <form onSubmit={send} className="pro-ai-input-bar">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 800))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={left === 0 || busy}
                placeholder={
                  left === 0
                    ? 'Suhbat limiti tugadi. Yangi loyiha boshlang.'
                    : chatId
                    ? 'O‘zgartirish kiritish: «Yana yetkazib berish tugmasini qo‘shing»…'
                    : 'Botingiz haqida batafsil yozing (Masalan: Kafe uchun menyu va yetkazib berish…)'
                }
                className="pro-ai-textarea"
                rows={2}
              />
              <button
                type="submit"
                disabled={busy || left === 0 || text.trim().length < 3}
                className="pro-ai-send-btn"
                title="Yuborish (Enter)"
              >
                <i className="fa-solid fa-paper-plane" />
              </button>
            </form>
          </div>

          {/* Bot tuzilishi (Step-by-step Structure) */}
          {ready && summary.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--pro-card-border)', borderRadius: 18, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="fa-solid fa-sitemap" style={{ color: '#818cf8' }} />
                  Bot Arxitekturasi ({summary.length} ta tugun)
                </h3>
                <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                  <i className="fa-solid fa-circle-check" style={{ marginRight: 4 }} />
                  AI tomonidan tuzildi
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {summary.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      background: 'var(--surface-2)',
                      borderRadius: 10,
                      fontSize: 13,
                    }}
                  >
                    <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.25)', padding: '2px 6px', borderRadius: 6, color: '#c7d2fe' }}>
                      {n.id}
                    </code>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>{n.t}</span>
                    <span style={{ color: 'var(--text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {n.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* O'ng ustun: Telegram Device Simulator + Quote + Deploy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* 1. Telegram Smartphone Mockup */}
          {ready ? (
            <Simulator key={simKey} chatId={chatId} onError={(m) => setErr(m)} />
          ) : (
            <div
              style={{
                height: 480,
                background: 'var(--surface)',
                border: '1px solid var(--pro-card-border)',
                borderRadius: 24,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 30,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: 'rgba(99, 102, 241, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  color: '#818cf8',
                  marginBottom: 16,
                }}
              >
                <i className="fa-brands fa-telegram" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Jonli Telegram Simulyatori
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 300, margin: 0, lineHeight: 1.5 }}>
                Chap tomonda botingizni tasvirlang. AI uning arxitekturasini tayyorlashi bilanoq bu yerda Telegram interfeysida bepul sinab ko‘rishingiz mumkin bo‘ladi.
              </p>
            </div>
          )}

          {/* 2. Narx va To'lov Kartasi (Quote) */}
          {ready && quote && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--pro-card-border)', borderRadius: 18, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  <i className="fa-solid fa-receipt" style={{ color: '#818cf8', marginRight: 8 }} />
                  Hisob-kitob
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Balans: <b>{formatMoney(user?.pul ?? 0)}</b>
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {quote.items?.map((it, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
                    <span>{it.label}{it.qty > 1 ? ` × ${it.qty}` : ''}</span>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{formatMoney(it.sum)}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: 'var(--pro-card-border)', margin: '6px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                  <span>Jami to‘lov:</span>
                  <span style={{ color: '#10b981' }}>{formatMoney(quote.total)}</span>
                </div>
              </div>

              {quote.due > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    type="button"
                    onClick={pay}
                    disabled={busy}
                    className="pro-btn-install"
                    style={{ height: 42, width: '100%' }}
                  >
                    <i className="fa-solid fa-credit-card" />
                    <span>To‘lash va aktivlashtirish — {formatMoney(quote.due)}</span>
                  </button>
                  {lowFunds && (
                    <Link
                      to="/deposit"
                      style={{
                        textAlign: 'center',
                        fontSize: 13,
                        color: '#f59e0b',
                        fontWeight: 600,
                        textDecoration: 'underline',
                      }}
                    >
                      Balans yetarli emas — Hisobni to‘ldirish →
                    </Link>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontSize: 13.5, fontWeight: 600, padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 10 }}>
                  <i className="fa-solid fa-circle-check" />
                  <span>Bot uchun to‘lov muvaffaqiyatli amalga oshirilgan</span>
                </div>
              )}
            </div>
          )}

          {/* 3. Ishga tushirish (Deploy / Token) */}
          {ready && quote?.unlocked && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--pro-card-border)', borderRadius: 18, padding: 20 }}>
              {justDeployed && bot ? (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ width: 54, height: 54, borderRadius: 50, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 12px' }}>
                    <i className="fa-solid fa-rocket" />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Bot ishga tushirildi!</h3>
                  <a
                    href={`https://t.me/${bot}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 15, fontWeight: 700, color: '#38bdf8', display: 'block', marginBottom: 14 }}
                  >
                    @{bot}
                  </a>
                  <Link to="/bots" className="pro-btn-preview" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                    <i className="fa-solid fa-robot" />
                    <span>Botlarim ro‘yxatiga o‘tish</span>
                  </Link>
                </div>
              ) : needsToken ? (
                <form onSubmit={deploy} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                    <i className="fa-solid fa-key" style={{ color: '#818cf8', marginRight: 8 }} />
                    Telegram Bot Tokenini kiriting
                  </h3>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                    @BotFather bergan tokenni pastga qo‘ying va botingiz zudlik bilan ishga tushadi:
                  </p>
                  <input
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="123456789:ABCdefGhIJKlm…"
                    spellCheck={false}
                    autoComplete="off"
                    style={{
                      height: 42,
                      padding: '0 12px',
                      borderRadius: 10,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--pro-card-border)',
                      color: 'var(--text)',
                      fontFamily: 'monospace',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={busy || token.trim().length < 25}
                    className="pro-btn-install"
                    style={{ height: 42 }}
                  >
                    <i className="fa-solid fa-rocket" />
                    <span>Telegramda ishga tushirish</span>
                  </button>
                </form>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>@{bot}</div>
                      <div style={{ fontSize: 12, color: '#10b981' }}>● Bot faol ishlamoqda</div>
                    </div>
                    <a href={`https://t.me/${bot}`} target="_blank" rel="noreferrer" className="pro-btn-preview" style={{ textDecoration: 'none', height: 34, fontSize: 12.5 }}>
                      Ochish ↗
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={deploy}
                    disabled={busy}
                    className="pro-btn-install"
                    style={{ height: 40 }}
                  >
                    <i className="fa-solid fa-arrows-rotate" />
                    <span>Yangilangan versiyani yuklash</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4. Loyihalarim (Saved Projects Drawer) */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--pro-card-border)', borderRadius: 18, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                <i className="fa-solid fa-folder-open" style={{ color: '#818cf8', marginRight: 8 }} />
                Mening AI Loyihalarim
              </h3>
              <button type="button" onClick={startNew} className="pro-btn-preview" style={{ height: 30, fontSize: 11.5 }}>
                + Yangi
              </button>
            </div>

            {projects === null ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Yuklanmoqda…</div>
            ) : projects.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Hali AI loyihalaringiz mavjud emas.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                {projects.map((p) => {
                  const isCurrent = p.id === chatId;
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: isCurrent ? 'rgba(99, 102, 241, 0.12)' : 'var(--surface-2)',
                        border: `1px solid ${isCurrent ? 'var(--pro-accent)' : 'var(--pro-card-border)'}`,
                        borderRadius: 10,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => pick(p.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: 'var(--text)',
                          flex: 1,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {p.bot ? `@${p.bot}` : 'Qoralama'} · {ago(p.updatedAt)}
                        </div>
                      </button>
                      {p.paid === 0 && (
                        <button
                          type="button"
                          onClick={() => remove(p)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            padding: 6,
                          }}
                          title="Loyihani o‘chirish"
                        >
                          <i className="fa-regular fa-trash-can" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Telegram Smartphone Mockup Simulator
function Simulator({ chatId, onError }) {
  const [sim, setSim] = useState({ lines: [], state: { wait: null, vars: {} }, expect: null });
  const [txt, setTxt] = useState('');
  const boxRef = useRef(null);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [sim.lines]);

  async function step(input) {
    try {
      const r = await api.post('/create/ai_preview.php', { chat_id: chatId, input, state: sim.state });
      const mine = input.kind === 'text' ? [{ me: true, text: input.text }] : input.kind === 'media' ? [{ me: true, text: SIM_MEDIA[input.mtype] || '📎' }] : [];
      setSim((s) => ({
        lines: [...s.lines, ...mine, ...r.out.map((o) => ({ ...o }))],
        state: r.state,
        expect: r.expect || null,
      }));
    } catch (ex) {
      onError(errText(ex, 'Sinov xatosi.'));
    }
  }

  return (
    <div className="pro-telegram-mockup">
      {/* Mockup Header */}
      <div className="pro-mockup-header">
        <div className="pro-mockup-avatar">
          <i className="fa-solid fa-robot" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pro-mockup-botname" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Makefy AI Bot</span>
            <i className="fa-solid fa-circle-check" style={{ color: '#29b6f6', fontSize: 12 }} />
          </div>
          <div className="pro-mockup-sub">bot · sinov rejimi (bepul)</div>
        </div>
      </div>

      {/* Mockup Screen Body */}
      <div className="pro-mockup-screen" ref={boxRef}>
        {sim.lines.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: '#708499', fontSize: 13 }}>
            Botingizni ishga tushirish uchun pastdagi «/start» tugmasini bosing yoki matn yozing.
          </div>
        )}

        {sim.lines.map((l, i) => (
          <div key={i} className={'pro-tg-bubble' + (l.me ? ' is-me' : '')}>
            {l.media && (
              <div style={{ fontSize: 11.5, color: '#38bdf8', marginBottom: 4 }}>
                🖼 {l.media.type}: {l.media.url}
              </div>
            )}
            <div>{l.text}</div>
            {l.kb && l.kb.map((row, ri) => (
              <div key={ri} className="pro-tg-keyboard">
                <div className="pro-tg-kb-row">
                  {row.map((b, bi) =>
                    b.url ? (
                      <a key={bi} href={b.url} target="_blank" rel="noreferrer" className="pro-tg-kb-btn">
                        {b.text} ↗
                      </a>
                    ) : (
                      <button key={bi} type="button" onClick={() => step({ kind: 'cb', data: b.cb })} className="pro-tg-kb-btn">
                        {b.text}
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Agar media kutilayotgan bo'lsa */}
      {sim.expect && SIM_LABEL[sim.expect] && (
        <div style={{ padding: '6px 12px', background: '#17212b' }}>
          <button
            type="button"
            onClick={() => step({ kind: 'media', mtype: sim.expect })}
            className="pro-tg-kb-btn"
            style={{ width: '100%', background: '#2b5278', color: '#fff' }}
          >
            {SIM_LABEL[sim.expect]}
          </button>
        </div>
      )}

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = (txt || '/start').trim();
          setTxt('');
          step({ kind: 'text', text: v });
        }}
        className="pro-mockup-input-bar"
      >
        <input
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          placeholder="/start yoki javob yozing…"
          className="pro-mockup-input"
        />
        <button
          type="submit"
          style={{
            background: 'none',
            border: 'none',
            color: '#5288c1',
            cursor: 'pointer',
            padding: 8,
            fontSize: 16,
          }}
        >
          <i className="fa-solid fa-paper-plane" />
        </button>
      </form>
    </div>
  );
}
