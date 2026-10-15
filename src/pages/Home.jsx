import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Onboarding from '../components/Onboarding';
import BroadcastProgress from '../components/BroadcastProgress';
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, IconButton, Input, PageHeader, Section, Select, Skeleton, StatCard, Table, Tabs, Textarea } from '../components/ui';
import { openBotAdmin } from '../lib/botAdmin';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { formatMoney } from '../lib/format';

const num = (v) => new Intl.NumberFormat('uz-UZ').format(Number(v || 0));
const kindIcon = (k) => (k === 'starska' ? 'fa-star' : k === 'anime' ? 'fa-clapperboard' : 'fa-robot');

export default function Home() {
  const { user, updateBalance } = useAuth();
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const value = await api.get('/home.php');
      setData(value); setError(''); updateBalance(value?.balance ?? 0);
    } catch (err) { setError(err.message); } finally { setRefreshing(false); }
  }, [updateBalance]);
  useEffect(() => { load(); }, [load]);

  const bots = data?.botsPreview || [];
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bots.filter((b) => (filter === 'all' || b.kind === filter || (filter === 'on' && b.faol) || (filter === 'off' && !b.faol))
      && (!q || String(b.username || '').toLowerCase().includes(q)));
  }, [bots, query, filter]);

  if (error && !data) return <div className="pg"><ErrorState title={t('home.connectFail')} body={error} onRetry={load} /></div>;
  if (!data) {
    return (
      <div className="pg-skeleton" aria-busy="true">
        <Skeleton className="h-14 w-2/3" />
        <div className="mf-grid mf-grid--stats">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const tot = data.totals || {};
  const board = data.leaderboard?.top || [];
  const expiring = data.expiring || [];
  const name = user?.ism || t('home.friend');
  const filters = ['all', 'anime', 'starska', 'on', 'off'].map((id) => ({ id, label: t('home.filter.' + id) }));

  const columns = [
    { key: 'bot', header: t('home.col.bot'), render: (b) => <BotCell bot={b} t={t} /> },
    { key: 'faol', header: t('home.col.status'), render: (b) => <Badge tone={b.faol ? 'success' : 'neutral'} dot>{b.faol ? t('home.status.on') : t('home.status.off')}</Badge> },
    { key: 'kun', header: t('home.col.term'), render: (b) => <Term days={Number(b.kun ?? 0)} t={t} /> },
    { key: 'users', header: t('home.col.users'), render: (b) => <span className="pg-num">{b.stats ? num(b.stats.users) : '—'}</span> },
    { key: 'revenue', header: t('home.col.revenue'), render: (b) => <span className="pg-num">{b.kind === 'starska' && b.stats ? formatMoney(b.stats.revenue || 0) : '—'}</span> },
    { key: 'acts', header: '', align: 'right', render: (b) => <BotActions bot={b} t={t} /> },
  ];

  return (
    <div className="pg">
      <PageHeader
        title={t('home.greeting', { name })}
        subtitle={data.botsCount ? t('home.subtitleBots', { count: data.botsCount }) : t('home.subtitleEmpty')}
        actions={<>
          <IconButton icon={refreshing ? 'fa-rotate-right fa-spin' : 'fa-rotate-right'} label={t('home.refresh')} onClick={load} disabled={refreshing} />
          <Link to="/create" className="mf-btn mf-btn--primary"><i className="fa-solid fa-plus" aria-hidden="true" />{t('home.newBot')}</Link>
        </>}
      />

      {(expiring.length > 0 || tot.pending > 0) && (
        <div className="pg-alerts">
          {expiring.map((b) => (
            <Link key={b.username} to={`/bots/${b.username}/kunlik`} className="mf-alert mf-alert--warning mf-alert--link">
              <i className="fa-solid fa-hourglass-half" aria-hidden="true" />
              <span><b>@{b.username}</b> {b.kun <= 0 ? t('home.expired') : t('home.expires', { days: b.kun })} — {t('home.extend')}</span>
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </Link>
          ))}
          {tot.pending > 0 && (
            <Link to="/bots" className="mf-alert mf-alert--link">
              <i className="fa-solid fa-receipt" aria-hidden="true" />
              <span>{t('home.pending', { count: tot.pending })}</span>
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}

      <section className="mf-grid mf-grid--stats" aria-label={t('home.kpi.aria')}>
        <StatCard icon="fa-robot" label={t('home.kpi.bots')} value={data.botsCount ?? 0} hint={t('home.kpi.botsHint', { anime: data.byType?.anime || 0, starska: data.byType?.starska || 0 })} />
        <StatCard icon="fa-users" label={t('home.kpi.users')} value={num(tot.users)} hint={t('home.kpi.usersHint')} />
        <StatCard icon="fa-bag-shopping" label={t('home.kpi.orders')} value={num(tot.orders)} hint={t('home.kpi.ordersHint')} />
        <StatCard icon="fa-sack-dollar" label={t('home.kpi.revenue')} value={formatMoney(tot.revenue || 0)} hint={t('home.kpi.revenueHint')} />
        <StatCard icon="fa-wallet" label={t('home.kpi.balance')} value={formatMoney(data.balance ?? 0)} hint={<Link to="/deposit" className="text-accent font-semibold">{t('home.kpi.topup')} →</Link>} />
      </section>

      {(bots.length === 0 || !(tot.users > 0)) && <Onboarding botCount={bots.length} hasUsers={Number(tot.users || 0) > 0} />}

      <Section title={t('home.bots.title')} action={<Link to="/bots" className="mf-btn mf-btn--ghost mf-btn--sm">{t('home.bots.manage')}<i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>}>
        {bots.length > 0 && (
          <div className="pg-toolbar">
            <div className="pg-search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('home.search')} aria-label={t('home.search')} />
            </div>
            <Tabs items={filters} value={filter} onChange={setFilter} ariaLabel={t('home.bots.title')} />
          </div>
        )}
        {bots.length === 0 ? (
          <Card variant="flat"><EmptyState icon="fa-robot" title={t('home.empty.title')} body={t('home.empty.body')} action={<Link to="/create" className="mf-btn mf-btn--primary"><i className="fa-solid fa-plus" aria-hidden="true" />{t('home.empty.cta')}</Link>} /></Card>
        ) : (
          <Table columns={columns} rows={shown} rowKey="username" empty={<Card variant="flat"><EmptyState icon="fa-magnifying-glass" title={t('home.noMatch')} /></Card>} />
        )}
      </Section>

      <div className="pg-two">
        {bots.length > 0 && <Broadcast bots={bots} t={t} />}
        <Section title={t('home.lb.title')}>
          <Card>
            {board.length === 0 ? <EmptyState icon="fa-ranking-star" title={t('home.lb.empty')} /> : (
              <ol className="pg-lb" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {board.map((r) => {
                  const me = String(r.user_id) === String(user?.user_id);
                  return (
                    <li key={r.user_id} className={'pg-lb__row' + (me ? ' is-me' : '')}>
                      <span className="pg-lb__rank">{r.rank}</span>
                      <span className="pg-lb__name">{r.ism || t('home.lb.user')}{me && ` (${t('home.lb.you')})`}</span>
                      <span className="pg-num pg-muted">{formatMoney(r.value)}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </Section>
      </div>

      <nav className="pg-quick" aria-label={t('home.quick.aria')}>
        {[['/create', 'fa-plus', 'newBot'], ['/deposit', 'fa-wallet', 'balance'], ['/vazifalar', 'fa-bolt', 'tasks'], ['/chat', 'fa-headset', 'help']].map(([to, icon, k]) => (
          <Card key={to} interactive style={{ padding: 0 }}>
            <Link to={to}><span className="pg-quick__ico"><i className={'fa-solid ' + icon} aria-hidden="true" /></span><span><b>{t(`home.quick.${k}`)}</b><small>{t(`home.quick.${k}Note`)}</small></span></Link>
          </Card>
        ))}
      </nav>
    </div>
  );
}

function BotCell({ bot, t }) {
  return (
    <Link to={'/bots/' + bot.username} className={'pg-botcell' + (bot.faol ? ' is-on' : '')}>
      <span className="pg-botcell__ico"><i className={'fa-solid ' + kindIcon(bot.kind)} aria-hidden="true" /></span>
      <span style={{ minWidth: 0 }}><b>{bot.username ? '@' + bot.username : t('home.noToken')}</b><small>{bot.turiNomi || 'Bot'}</small></span>
    </Link>
  );
}

function Term({ days, t }) {
  return <span className={days <= 0 ? 'pg-days--bad' : days <= 3 ? 'pg-days--warn' : ''}>{days > 0 ? t('home.term.days', { days }) : t('home.term.over')}</span>;
}

function BotActions({ bot, t }) {
  return (
    <div className="pg-acts">
      {bot.panels?.app && <a className="mf-btn mf-btn--ghost mf-btn--sm" href={bot.panels.app} target="_blank" rel="noopener noreferrer"><i className="fa-solid fa-window-restore" aria-hidden="true" />{t('home.act.app')}</a>}
      {bot.panels?.admin && <a className="mf-btn mf-btn--ghost mf-btn--sm" href={bot.panels.admin} onClick={(e) => { e.preventDefault(); openBotAdmin(bot.username); }}><i className="fa-solid fa-user-shield" aria-hidden="true" />{t('home.act.admin')}</a>}
      {bot.username && <a className="mf-iconbtn" href={'https://t.me/' + bot.username} target="_blank" rel="noopener noreferrer" aria-label={t('home.act.telegram')} title={t('home.act.telegram')}><i className="fa-brands fa-telegram" aria-hidden="true" /></a>}
      <Link className="mf-btn mf-btn--secondary mf-btn--sm" to={'/bots/' + bot.username}><i className="fa-solid fa-sliders" aria-hidden="true" />{t('home.act.manage')}</Link>
    </div>
  );
}

function Broadcast({ bots, t }) {
  const [bot, setBot] = useState(bots[0]?.username || '');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [batchId, setBatchId] = useState(null);
  const [confirm, setConfirm] = useState(false);

  async function send() {
    setBusy(true); setMsg(null);
    try {
      const r = await api.post('/bots/broadcast.php', { useri: bot, matn: text.trim() });
      setMsg({ ok: true, text: r.message }); setBatchId(r.batchId || null); setText('');
      setConfirm(false);
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : t('home.bc.fail') });
      setConfirm(false);
    } finally { setBusy(false); }
  }

  return (
    <Section title={t('home.bc.title')}>
      <Card>
        <p className="pg-muted" style={{ marginBottom: 12, fontSize: 'var(--fs-sm)' }}>{t('home.bc.sub')}</p>
        <form className="pg-form" onSubmit={(e) => { e.preventDefault(); if (text.trim() && bot) setConfirm(true); }}>
          <Select value={bot} onChange={(e) => setBot(e.target.value)} aria-label={t('home.bc.bot')}>
            {bots.map((b) => <option key={b.username} value={b.username}>@{b.username}</option>)}
          </Select>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} rows={3} placeholder={t('home.bc.placeholder')} aria-label={t('home.bc.title')} />
          <div className="pg-form__foot">
            <span className="pg-num">{text.length}/4000</span>
            <Button type="submit" variant="primary" loading={busy} disabled={!text.trim()}><i className="fa-solid fa-paper-plane" aria-hidden="true" />{busy ? t('home.bc.sending') : t('home.bc.send')}</Button>
          </div>
          {msg && <Alert tone={msg.ok ? 'success' : 'danger'}>{msg.text}</Alert>}
        </form>
        <BroadcastProgress batchId={batchId} />
      </Card>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={send} loading={busy} tone="primary"
        title={t('home.bc.confirmTitle')} body={t('home.bc.confirmBody', { bot })} confirmLabel={t('home.bc.send')} />
    </Section>
  );
}
