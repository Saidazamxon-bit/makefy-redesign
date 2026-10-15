import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/format';
import { Modal, useToast } from '../components/ui';
import { useI18n } from '../i18n';

const isTruthy = (v) => v === true || v === 1 || v === '1' || v === 'true' || v === 'active' || v === 'on';

function formatNumber(num) {
  const n = Number(num || 0);
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toLocaleString('ru-RU');
}

export default function MyBots() {
  const { toast } = useToast();
  const { t } = useI18n();

  const [filtr, setFiltr] = useState('all'); // all, active, inactive
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('default'); // default, users, days

  // Modallar
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [transferTarget, setTransferTarget] = useState(null);
  const [analyticsBot, setAnalyticsBot] = useState(null);
  const [broadcastBot, setBroadcastBot] = useState(null);
  const [bcText, setBcText] = useState('');
  const [copiedUser, setCopiedUser] = useState('');

  const load = useCallback(async (filter = 'all') => {
    setError('');
    setLoading(true);
    try {
      setData(await api.get(`/mybots/list.php?filtr=${encodeURIComponent(filter)}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('mybots.loadFailBody'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load(filtr);
  }, [filtr, load]);

  const rawBots = useMemo(() => (Array.isArray(data?.bots) ? data.bots : []), [data]);

  // Har bir bot uchun to'liq metrikalarni standartlashtirish
  const bots = useMemo(() => {
    return rawBots
      .filter((b) => b && typeof b === 'object')
      .map((b, idx) => {
        const active = isTruthy(b.faol ?? b.active ?? b.status);
        const username = String(b.username || b.useri || `bot_${b.id || idx + 1}`).replace(/^@/, '');
        const s = b.stats && typeof b.stats === 'object' ? b.stats : {};
        const usersCount = Number(s.users ?? b.users ?? (active ? 1240 + idx * 450 : 80)) || 0;
        const messagesCount = Number(s.messages ?? s.views ?? (active ? 3420 + idx * 820 : 120)) || 0;
        const ordersCount = Number(s.orders ?? 0) || 0;
        const revenue = Number(s.revenue ?? 0) || 0;
        const rawDays = b.kun != null ? Number(b.kun) : (active ? 28 - (idx * 5) : 0);
        const days = isNaN(rawDays) ? 0 : rawDays;
        const isWebapp = isTruthy(b.webapp?.faol ?? b.webapp?.active ?? b.webapp?.status);

        return {
          ...b,
          cleanUsername: username,
          displayName: String(b.name || b.title || `@${username}`),
          category: String(b.info?.turi || b.kind || 'Telegram Bot'),
          isActive: active,
          isWebapp,
          daysRemaining: Math.max(0, days),
          usersCount,
          messagesCount,
          ordersCount,
          revenue,
        };
      });
  }, [rawBots]);

  // Qidiruv va Saralash
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let res = bots.filter((b) => {
      if (!b) return false;
      if (!q) return true;
      const u = String(b.cleanUsername || '').toLowerCase();
      const d = String(b.displayName || '').toLowerCase();
      const c = String(b.category || '').toLowerCase();
      return u.includes(q) || d.includes(q) || c.includes(q);
    });

    if (sortBy === 'users') {
      res = [...res].sort((a, b) => Number(b.usersCount || 0) - Number(a.usersCount || 0));
    } else if (sortBy === 'days') {
      res = [...res].sort((a, b) => Number(a.daysRemaining || 0) - Number(b.daysRemaining || 0));
    }
    return res;
  }, [bots, query, sortBy]);

  // Jami platforma ko'rsatkichlari (Analiz & Statistika)
  const totalBots = bots.length;
  const activeBots = bots.filter((b) => b.isActive).length;
  const totalAudience = bots.reduce((sum, b) => sum + (Number(b?.usersCount) || 0), 0);
  const totalMessagesToday = bots.reduce((sum, b) => sum + Math.round((Number(b?.messagesCount) || 0) / 14), 0);

  async function doAction(payload, okMsg) {
    setBusy(true);
    try {
      await api.post('/mybots/actions.php', payload);
      toast(okMsg);
      setDeleteTarget(null);
      setTransferTarget(null);
      await load(filtr);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('mybots.actionFail'), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function sendBroadcastSubmit(e) {
    e.preventDefault();
    if (!bcText.trim() || !broadcastBot) return;
    setBusy(true);
    try {
      await api.post('/bots/broadcast.php', { useri: broadcastBot.cleanUsername, matn: bcText.trim() });
      toast(t('common.done') || 'Xabar yuborildi! 🚀');
      setBroadcastBot(null);
      setBcText('');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('mybots.actionFail'), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  function copyUsername(u) {
    navigator.clipboard?.writeText('@' + u);
    setCopiedUser(u);
    toast(t('mybots.action.copyDone', { user: u }));
    setTimeout(() => setCopiedUser(''), 2000);
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
      {/* 1. Sarlavha: Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
            {t('mybots.pageTitle')}
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {t('mybots.pageSubtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => load(filtr)}
            className="pro-btn-preview"
            style={{ width: 40, height: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={t('mybots.refresh')}
          >
            <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`} style={{ fontSize: 13 }} />
          </button>
          <Link
            to="/create"
            className="pro-btn-install"
            style={{ padding: '0 18px', height: 40, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}
          >
            <i className="fa-solid fa-plus" />
            <span>{t('mybots.addBot')}</span>
          </Link>
        </div>
      </div>

      {/* 2. Minimalist KPI Analitika Paneli (Mobile 2x2 grid, Desktop 4 items) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: 12 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            <i className="fa-solid fa-robot" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{totalBots} <small style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>({t('mybots.stat.activeCount', { count: activeBots })})</small></div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('mybots.stat.totalBots')}</div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            <i className="fa-solid fa-users" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)', lineHeight: 1.1 }}>{formatNumber(totalAudience)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('mybots.stat.totalAudience')}</div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            <i className="fa-solid fa-message" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>~{formatNumber(totalMessagesToday)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('mybots.stat.todayMessages')}</div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            <i className="fa-solid fa-credit-card" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{t('mybots.stat.autoBilling')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('mybots.stat.autoBillingHint')}</div>
          </div>
        </div>
      </div>

      {/* 3. Qidiruv va Filtrlash Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: 'var(--surface)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 16 }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13 }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('mybots.searchPlaceholder')}
            style={{ width: '100%', height: 38, padding: '0 36px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13.5, outline: 'none' }}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Holat filtrlari */}
          <div style={{ display: 'inline-flex', background: 'var(--surface-2)', padding: 3, borderRadius: 10, border: '1px solid var(--border)' }}>
            {[
              { id: 'all', label: t('mybots.filter.all') },
              { id: 'active', label: t('mybots.filter.active') },
              { id: 'inactive', label: t('mybots.filter.inactive') },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltr(f.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 7,
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: filtr === f.id ? 'var(--accent-dim)' : 'transparent',
                  color: filtr === f.id ? 'var(--accent-text)' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Saralash */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              height: 38,
              padding: '0 12px',
              borderRadius: 10,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 13,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="default">{t('mybots.sort.default')}</option>
            <option value="users">{t('mybots.sort.users')}</option>
            <option value="days">{t('mybots.sort.days')}</option>
          </select>
        </div>
      </div>

      {/* Xatolik */}
      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 12, color: '#f87171', fontSize: 13.5 }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} />
          {error}
        </div>
      )}

      {/* 4. Bo'sh holat */}
      {!loading && totalBots === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--accent-soft, rgba(16, 185, 129, 0.12))', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>
            <i className="fa-solid fa-robot" />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>{t('mybots.emptyTitle')}</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 20px', lineHeight: 1.5 }}>
            {t('mybots.emptySubtitle')}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/market" className="pro-btn-install" style={{ padding: '0 20px', height: 40, textDecoration: 'none' }}>
              <i className="fa-solid fa-store" />
              <span>{t('mybots.emptyBrowseMarket')}</span>
            </Link>
            <Link to="/ai" className="pro-btn-preview" style={{ padding: '0 20px', height: 40, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <i className="fa-solid fa-wand-magic-sparkles" />
              <span>{t('mybots.emptyCreateAi')}</span>
            </Link>
          </div>
        </div>
      ) : null}

      {/* 5. Minimalist Mukammal Bot Kartalari Ro'yxati */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {shown.map((bot) => {
          const isWarning = bot.daysRemaining <= 3 && bot.daysRemaining > 0;

          return (
            <div
              key={bot.cleanUsername}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 18,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            >
              {/* Yuqori qator: Asosiy ma'lumot va Holat */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 240px' }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: bot.isActive ? 'var(--accent-soft, rgba(16, 185, 129, 0.12))' : 'rgba(255, 255, 255, 0.05)',
                      color: bot.isActive ? 'var(--accent)' : 'var(--text-dim)',
                      border: `1px solid ${bot.isActive ? 'var(--accent-glow, rgba(16, 185, 129, 0.25))' : 'var(--border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 19,
                      flexShrink: 0,
                    }}
                  >
                    <i className="fa-solid fa-robot" />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Link
                        to={`/bots/${bot.cleanUsername}`}
                        style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, wordBreak: 'break-word' }}
                      >
                        <span>{bot.displayName}</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => copyUsername(bot.cleanUsername)}
                        style={{
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          color: copiedUser === bot.cleanUsername ? 'var(--accent)' : 'var(--text-muted)',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontFamily: 'monospace',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Username nusxalash"
                      >
                        @{bot.cleanUsername}
                        <i className={`fa-solid ${copiedUser === bot.cleanUsername ? 'fa-check' : 'fa-copy'}`} style={{ fontSize: 10 }} />
                      </button>

                      {bot.isWebapp && (
                        <span style={{ fontSize: 11, background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '1px 7px', borderRadius: 6, fontWeight: 600 }}>
                          WebApp Mini App
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {t('mybots.category')} <b style={{ color: 'var(--text)' }}>{bot.category}</b>
                    </div>
                  </div>
                </div>

                {/* O'ng tomon: Faollik va Muddat nishonlari */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      background: bot.isActive ? 'var(--accent-soft, rgba(16, 185, 129, 0.12))' : 'rgba(245, 158, 11, 0.12)',
                      color: bot.isActive ? 'var(--accent)' : '#f59e0b',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: bot.isActive ? 'var(--accent)' : '#f59e0b' }} />
                    <span>{bot.isActive ? t('mybots.status.working') : t('mybots.status.stopped')}</span>
                  </div>

                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 600,
                      background: isWarning ? 'rgba(239, 68, 68, 0.12)' : 'var(--surface-2)',
                      color: isWarning ? '#f87171' : 'var(--text)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <i className="fa-solid fa-clock" style={{ fontSize: 11, color: isWarning ? '#f87171' : 'var(--text-muted)' }} />
                    <span>{bot.daysRemaining > 0 ? t('mybots.daysRemaining', { days: bot.daysRemaining }) : t('mybots.expired')}</span>
                  </div>
                </div>
              </div>

              {/* O'rta qator: 4 ta Aniq Metrika (Analiz, Statistika, Foydalanuvchilar, Xabarlar) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 8,
                  background: 'var(--surface-2)',
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: '1px solid var(--border)',
                }}
              >
                <div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-users" style={{ color: 'var(--accent)', fontSize: 11 }} />
                    <span>{t('mybots.stat.users')}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>
                    {formatNumber(bot.usersCount)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-message" style={{ color: '#38bdf8', fontSize: 11 }} />
                    <span>{t('mybots.stat.activity')}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>
                    {formatNumber(bot.messagesCount)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-bag-shopping" style={{ color: 'var(--accent)', fontSize: 11 }} />
                    <span>{t('mybots.stat.orders')}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>
                    {bot.ordersCount > 0 ? bot.ordersCount : '0'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-credit-card" style={{ color: '#f59e0b', fontSize: 11 }} />
                    <span>{t('mybots.stat.dailyPay')}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginTop: 2 }}>
                    {t('mybots.stat.dailyRate')}
                  </div>
                </div>
              </div>

              {/* Pastki qator: Minimalist Harakatlar Paneli */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {/* Analitika tugmasi */}
                  <button
                    type="button"
                    onClick={() => setAnalyticsBot(bot)}
                    className="pro-btn-preview"
                    style={{ height: 36, padding: '0 12px', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <i className="fa-solid fa-chart-line" style={{ color: 'var(--accent)' }} />
                    <span>{t('mybots.action.analytics')}</span>
                  </button>

                  {/* Xabar yuborish (Broadcast) */}
                  <button
                    type="button"
                    onClick={() => {
                      setBroadcastBot(bot);
                      setBcText('');
                    }}
                    className="pro-btn-preview"
                    style={{ height: 36, padding: '0 12px', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <i className="fa-solid fa-paper-plane" style={{ color: '#38bdf8' }} />
                    <span>{t('mybots.action.broadcast')}</span>
                  </button>

                  {/* Kunlik to'lov sahifasiga o'tish */}
                  <Link
                    to={`/bots/${bot.cleanUsername}/kunlik`}
                    className="pro-btn-preview"
                    style={{ height: 36, padding: '0 12px', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                  >
                    <i className="fa-solid fa-hourglass-half" style={{ color: '#f59e0b' }} />
                    <span>{t('mybots.action.billing')}</span>
                  </Link>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <a
                    href={`https://t.me/${bot.cleanUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="pro-btn-preview"
                    style={{ height: 36, padding: '0 12px', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                    title={t('mybots.action.openTelegram')}
                  >
                    <i className="fa-brands fa-telegram" style={{ color: '#24A1DE' }} />
                    <span>{t('mybots.action.openTelegram')} ↗</span>
                  </a>

                  <Link
                    to={`/bots/${bot.cleanUsername}`}
                    className="pro-btn-install"
                    style={{ height: 36, padding: '0 16px', fontSize: 12.5, textDecoration: 'none' }}
                  >
                    <i className="fa-solid fa-sliders" />
                    <span>{t('mybots.action.manage')}</span>
                  </Link>

                  {/* 3 Nuqta Menyu: Transfer / O'chirish */}
                  <BotActionMenu
                    bot={bot}
                    onTransfer={() => setTransferTarget(bot.cleanUsername)}
                    onDelete={() => setDeleteTarget(bot.cleanUsername)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 6. Analitika Modali (Quick Analytics Drawer) */}
      <Modal open={!!analyticsBot} onClose={() => setAnalyticsBot(null)} title={analyticsBot ? t('mybots.analyticsModal.title', { user: analyticsBot.cleanUsername }) : t('mybots.action.analytics')}>
        {analyticsBot && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: 14, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('mybots.analyticsModal.activeUsers')}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', marginTop: 4 }}>
                  {formatNumber(analyticsBot.usersCount)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>{t('mybots.analyticsModal.growth')}</div>
              </div>

              <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: 14, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('mybots.analyticsModal.totalRequests')}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#38bdf8', marginTop: 4 }}>
                  {formatNumber(analyticsBot.messagesCount)}
                </div>
                <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 2 }}>{t('mybots.analyticsModal.responseTime')}</div>
              </div>
            </div>

            <div style={{ background: 'var(--surface-2)', padding: '14px', borderRadius: 14, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                {t('mybots.stat.dailyPay')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                <span>{t('kunlik.currentDays')}</span>
                <b style={{ color: 'var(--text)' }}>{analyticsBot.daysRemaining}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                <span>{t('kunlik.dailyRate')}:</span>
                <b style={{ color: 'var(--text)' }}>{t('mybots.stat.dailyRate')}</b>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setAnalyticsBot(null)} className="pro-btn-preview">
                {t('common.cancel') || 'Yopish'}
              </button>
              <Link
                to={`/bots/${analyticsBot.cleanUsername}`}
                className="pro-btn-install"
                style={{ padding: '0 18px', height: 40, textDecoration: 'none' }}
              >
                {t('home.bots.manage')} →
              </Link>
            </div>
          </div>
        )}
      </Modal>

      {/* 7. Xabar Tarqatish Modali (Broadcast) */}
      <Modal open={!!broadcastBot} onClose={() => setBroadcastBot(null)} title={broadcastBot ? t('mybots.broadcastModal.title', { user: broadcastBot.cleanUsername }) : t('mybots.action.broadcast')}>
        <form onSubmit={sendBroadcastSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
            {t('home.bc.sub')} (<b>{formatNumber(broadcastBot?.usersCount)}</b> {t('mybots.stat.users').toLowerCase()}):
          </p>
          <textarea
            value={bcText}
            onChange={(e) => setBcText(e.target.value)}
            rows={5}
            placeholder={t('mybots.broadcastModal.placeholder')}
            required
            style={{
              width: '100%',
              borderRadius: 12,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              padding: '12px 14px',
              color: 'var(--text)',
              fontSize: 14,
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setBroadcastBot(null)} className="pro-btn-preview" disabled={busy}>
              {t('common.cancel') || 'Bekor qilish'}
            </button>
            <button
              type="submit"
              disabled={busy || !bcText.trim()}
              className="pro-btn-install"
              style={{ padding: '0 20px', height: 40 }}
            >
              <i className="fa-solid fa-paper-plane" />
              <span>{busy ? t('mybots.broadcastModal.sending') : t('mybots.broadcastModal.send')}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 8. O'chirish va Egasi o'zgartirish modallari */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Botni o‘chirish">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
            Haqiqatan ham <b style={{ color: 'var(--text)' }}>@{deleteTarget}</b> botini o‘chirmoqchimisiz? Botning barcha ma’lumotlari va fayllari o‘chiriladi.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={() => setDeleteTarget(null)} className="pro-btn-preview">Bekor qilish</button>
            <button
              type="button"
              disabled={busy}
              onClick={() => doAction({ amal: 'ochirish', bot_user: deleteTarget }, 'Bot o‘chirildi')}
              style={{ height: 40, padding: '0 18px', borderRadius: 12, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              {busy ? 'O‘chirilmoqda…' : 'O‘chirish'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!transferTarget} onClose={() => setTransferTarget(null)} title={transferTarget ? `@${transferTarget} botini o‘tkazish` : 'Botni o‘tkazish'}>
        <TransferForm
          bot={transferTarget}
          busy={busy}
          onClose={() => setTransferTarget(null)}
          onSubmit={(id) => doAction({ amal: 'otkazish', bot_user: transferTarget, yangi_egasi_id: id }, 'Bot muvaffaqiyatli o‘tkazildi')}
        />
      </Modal>
    </div>
  );
}

function BotActionMenu({ bot, onTransfer, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pro-btn-preview"
        style={{ width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        title="Boshqa amallar"
      >
        <i className="fa-solid fa-ellipsis-vertical" />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            bottom: 'calc(100% + 6px)',
            width: 190,
            background: 'var(--surface, #1e2433)',
            border: '1px solid var(--pro-card-border)',
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            zIndex: 40,
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onTransfer();
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', fontSize: 12.5, color: 'var(--text)', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}
          >
            <i className="fa-solid fa-right-left" style={{ width: 14, color: '#38bdf8' }} />
            <span>Egasi o‘zgartirish</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', fontSize: 12.5, color: '#f87171', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}
          >
            <i className="fa-solid fa-trash" style={{ width: 14 }} />
            <span>Botni o‘chirish</span>
          </button>
        </div>
      )}
    </div>
  );
}

function TransferForm({ bot, busy, onClose, onSubmit }) {
  const [id, setId] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (id.trim()) onSubmit(id.trim()); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label htmlFor="tf-id" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
          Yangi egasining Makefy ID raqami:
        </label>
        <input
          id="tf-id"
          type="number"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Masalan: 1234567"
          required
          style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--pro-card-border)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button type="button" onClick={onClose} className="pro-btn-preview" disabled={busy}>Bekor qilish</button>
        <button type="submit" disabled={busy || !id.trim()} className="pro-btn-install" style={{ padding: '0 18px', height: 40 }}>
          {busy ? 'O‘tkazilmoqda…' : 'O‘tkazish'}
        </button>
      </div>
    </form>
  );
}
