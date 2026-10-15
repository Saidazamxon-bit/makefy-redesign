import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/format';
import { LineChart, BarChart, Funnel, Heatmap, CHART_COLORS, fmtNum } from '../components/charts';
import { useI18n } from '../i18n';

function Delta({ d }) {
  if (d === null || d === undefined) return <span className="text-[12px] text-text-muted">yangi</span>;
  const up = d > 0; const zero = d === 0;
  return (
    <span className={'text-[12px] font-bold tabular-nums ' + (zero ? 'text-text-muted' : up ? 'text-success' : 'text-danger')}>
      <i className={'fa-solid mr-1 ' + (zero ? 'fa-minus' : up ? 'fa-arrow-up' : 'fa-arrow-down')} aria-hidden="true" />
      {d > 0 ? '+' : ''}{d}% <span className="sr-only">oldingi davrga nisbatan</span>
    </span>
  );
}

function Kpi({ label, value, delta, hint }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface border border-border p-3 sm:p-3.5">
      <div className="text-[11.5px] sm:text-[12px] text-text-muted mb-1 truncate">{label}</div>
      <div className="text-[18px] sm:text-[22px] font-bold tabular-nums leading-tight">{value}</div>
      <div className="mt-1 min-h-[18px]">{delta !== undefined ? <Delta d={delta} /> : <span className="text-[11px] sm:text-[12px] text-text-muted">{hint}</span>}</div>
    </div>
  );
}

function Card({ title, children, right }) {
  return (
    <section className="rounded-[var(--radius-md)] bg-surface border border-border p-3.5 sm:p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-bold text-sm">{title}</h2>{right}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }) {
  return (
    <div className="text-center py-8 text-[13px] text-text-muted">
      <i className="fa-solid fa-chart-simple text-2xl mb-2 block opacity-50" aria-hidden="true" />
      {text}
    </div>
  );
}

export default function Analytics() {
  const { t } = useI18n();
  const [sp, setSp] = useSearchParams();
  const bot = sp.get('bot') || '';
  const [period, setPeriod] = useState('30');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [gran, setGran] = useState('day');
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [bots, setBots] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');

  const periods = useMemo(() => [
    { v: '7', t: t('analytics.period.7') },
    { v: '30', t: t('analytics.period.30') },
    { v: '90', t: t('analytics.period.90') },
    { v: 'custom', t: t('analytics.period.custom') },
  ], [t]);

  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (period === 'custom') { if (from && to) { q.set('from', from); q.set('to', to); } else { q.set('days', '30'); } } else q.set('days', period);
    if (bot) q.set('bot', bot);
    return q;
  }, [period, from, to, bot]);

  useEffect(() => {
    api.get('/mybots/list.php?filtr=all').then((r) => setBots(Array.isArray(r?.bots) ? r.bots : [])).catch(() => {});
  }, []);

  useEffect(() => {
    let off = false;
    setLoading(true); setErr('');
    const q = new URLSearchParams(query); q.set('gran', gran);
    const call = bot
      ? api.get(`/analytics/bot.php?${query}`).then((r) => { if (!off) { setData(r.overview); setInsights(r.insights); } })
      : api.get(`/analytics/overview.php?${q}`).then((r) => { if (!off) { setData(r); setInsights(null); } });
    call.catch((e) => { if (!off) setErr(e instanceof ApiError ? e.message : 'Ma‘lumotni olib bo‘lmadi. Qayta urinib ko‘ring.'); })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [query, gran, bot]);

  async function doExport(format) {
    setExporting(format);
    try {
      const q = new URLSearchParams(query); q.set('format', format);
      const r = await api.get(`/analytics/export.php?${q}`);
      const bin = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bin], { type: r.mime }));
      const a = document.createElement('a'); a.href = url; a.download = r.filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Eksport amalga oshmadi.'); } finally { setExporting(''); }
  }

  const k = data?.kpi;
  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <h1 className="mf-h1">{t('analytics.pageTitle')}</h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">{t('analytics.pageSubtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => doExport('csv')} disabled={!!exporting || !data?.hasData} className="px-3 py-1.5 rounded-[var(--radius-sm)] border border-border text-[12.5px] font-semibold disabled:opacity-50">{exporting === 'csv' ? 'CSV…' : 'CSV'}</button>
          <button onClick={() => doExport('xlsx')} disabled={!!exporting || !data?.hasData} className="px-3 py-1.5 rounded-[var(--radius-sm)] border border-border text-[12.5px] font-semibold disabled:opacity-50">{exporting === 'xlsx' ? 'Excel…' : 'Excel'}</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div role="tablist" aria-label="Davr" className="flex flex-wrap rounded-[var(--radius-sm)] bg-surface-2 p-1 gap-1">
          {periods.map((p) => (
            <button key={p.v} role="tab" aria-selected={period === p.v} onClick={() => setPeriod(p.v)}
              className={'px-3 py-1.5 rounded-[8px] text-[12.5px] font-semibold ' + (period === p.v ? 'bg-accent text-accent-text' : 'text-text-muted')}>{p.t}</button>
          ))}
        </div>
        <label className="sr-only" htmlFor="bot-sel">Bot</label>
        <select id="bot-sel" value={bot} onChange={(e) => { const v = e.target.value; if (v) setSp({ bot: v }); else setSp({}); }}
          className="px-3 py-2 rounded-[var(--radius-sm)] bg-surface-2 border border-border text-[13px] max-w-[200px]">
          <option value="">{t('analytics.allBots')}</option>
          {bots.map((b) => <option key={b.useri || b.username} value={b.useri || b.username}>@{b.useri || b.username}</option>)}
        </select>
      </div>
      {period === 'custom' && (
        <div className="flex flex-wrap gap-2 items-center text-[13px]">
          <input type="date" aria-label="Boshlanish sanasi" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 rounded-[var(--radius-sm)] bg-surface-2 border border-border text-xs" />
          <span>—</span>
          <input type="date" aria-label="Tugash sanasi" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 rounded-[var(--radius-sm)] bg-surface-2 border border-border text-xs" />
        </div>
      )}

      {err && <div className="text-[13px] font-semibold text-danger bg-danger-soft rounded-[var(--radius-sm)] px-3 py-2" role="alert">{err}</div>}

      {loading && !data && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-24 rounded-[var(--radius-md)] bg-surface-2 animate-pulse" />)}</div>
      )}

      {data && !data.hasData && !loading && (
        <div className="rounded-[var(--radius-md)] bg-surface border border-border p-6 text-center">
          <Empty text={t('home.noMatch')} />
          <div className="text-center pt-2"><Link to="/bots" className="px-4 py-2 rounded-[var(--radius-sm)] bg-accent text-accent-text font-bold text-sm inline-block">{t('home.bots.title')}</Link></div>
        </div>
      )}

      {data && data.hasData && (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
            <Kpi label={t('analytics.kpi.users')} value={fmtNum(k.new_users.value)} delta={k.new_users.delta} />
            <Kpi label={t('analytics.kpi.revenue')} value={formatMoney(k.revenue.value)} delta={k.revenue.delta} />
            <Kpi label={t('home.kpi.orders')} value={fmtNum(k.orders.value)} delta={k.orders.delta} />
            <Kpi label={t('analytics.kpi.active')} value={fmtNum(k.dau_avg.value)} delta={k.dau_avg.delta} />
            <Kpi label="O‘rtacha chek" value={formatMoney(k.avg_check.value)} delta={k.avg_check.delta} />
            <Kpi label="WAU / MAU" value={`${fmtNum(k.wau.value)} / ${fmtNum(k.mau.value)}`} hint="7 / 30 kun" />
          </div>
          <p className="text-[12px] text-text-muted mt-2">Solishtirish: {data.range.prevFrom} — {data.range.prevTo} davriga nisbatan.</p>

          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <Card title={t('analytics.chart.growth')} right={
              <select aria-label="Guruhlash" value={gran} onChange={(e) => setGran(e.target.value)} className="px-2 py-1 rounded-[8px] bg-surface-2 border border-border text-[12px]">
                <option value="day">Kunlik</option><option value="week">Haftalik</option><option value="month">Oylik</option>
              </select>}>
              <LineChart data={data.series} series={[{ key: 'new_users', label: 'Yangi', color: CHART_COLORS.users }, { key: 'dau', label: 'Faol', color: CHART_COLORS.active }]} />
              <div className="flex gap-4 text-[12px] mt-1"><span><i className="fa-solid fa-circle" style={{ color: CHART_COLORS.users }} aria-hidden="true" /> Yangi</span><span><i className="fa-solid fa-circle" style={{ color: CHART_COLORS.active }} aria-hidden="true" /> Faol</span></div>
            </Card>
            <Card title={t('analytics.kpi.revenue')}>
              <BarChart data={data.series} valueKey="revenue" color={CHART_COLORS.revenue} valueFmt={(v) => fmtNum(Math.round(v))} />
            </Card>
            <Card title={t('analytics.funnel.title')}><Funnel steps={data.funnel} /></Card>
            <Card title={t('analytics.topBots')}>
              {data.topBots.length === 0 ? <Empty text={t('home.noMatch')} /> : (
                <ul className="divide-y divide-border">
                  {data.topBots.map((b, i) => (
                    <li key={b.bot} className="py-2 flex items-center justify-between text-[13px] gap-2">
                      <Link to={`/analytics?bot=${b.bot}`} className="font-semibold truncate">{i + 1}. @{b.bot}</Link>
                      <span className="tabular-nums text-text-muted whitespace-nowrap">{formatMoney(b.revenue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <div className="mt-3"><Card title="Qachon faol? (hafta kuni × soat)"><Heatmap grid={data.heatmap} /></Card></div>
          {data.note && <p className="text-[12px] text-text-muted mt-2">{data.note}</p>}
        </div>
      )}

      {insights?.kind === 'starska' && (
        <Card title="Mahsulotlar bo‘yicha sotuv">
          <div className="grid grid-cols-3 gap-3 mb-3 text-center">
            <div><div className="text-[12px] text-text-muted">O‘rtacha chek</div><div className="font-bold tabular-nums">{formatMoney(insights.avgCheck)}</div></div>
            <div><div className="text-[12px] text-text-muted">Xaridorlar</div><div className="font-bold tabular-nums">{fmtNum(insights.buyers)}</div></div>
            <div><div className="text-[12px] text-text-muted">Qaytib kelganlar</div><div className="font-bold tabular-nums">{insights.returningRate}%</div></div>
          </div>
          {insights.topItems.length === 0 ? <Empty text="Bu davrda sotuv yo‘q." /> : (
            <ul className="divide-y divide-border">
              {insights.topItems.map((it) => (
                <li key={it.label} className="py-2 flex justify-between text-[13px]"><span>{it.label}</span><span className="tabular-nums text-text-muted">{it.count} ta · {formatMoney(it.revenue)}</span></li>
              ))}
            </ul>
          )}
        </Card>
      )}
      {insights?.kind === 'anime' && (
        <Card title="Eng ko‘p ko‘rilgan animelar">
          <div className="grid grid-cols-3 gap-3 mb-3 text-center">
            <div><div className="text-[12px] text-text-muted">Animelar</div><div className="font-bold tabular-nums">{fmtNum(insights.animeCount)}</div></div>
            <div><div className="text-[12px] text-text-muted">Qismlar</div><div className="font-bold tabular-nums">{fmtNum(insights.episodeCount)}</div></div>
            <div><div className="text-[12px] text-text-muted">Kanalga qo‘shilish</div><div className="font-bold tabular-nums">{insights.subscriptionRate}%</div></div>
          </div>
          {insights.topViewed.length === 0 ? <Empty text="Hali anime qo‘shilmagan." /> : (
            <ul className="divide-y divide-border">
              {insights.topViewed.map((a) => (
                <li key={a.id} className="py-2 flex justify-between text-[13px]"><span>{a.title}</span><span className="tabular-nums text-text-muted">{fmtNum(a.views)} ko‘rish · {a.episodes} qism</span></li>
              ))}
            </ul>
          )}
          {insights.notes?.map((n) => <p key={n} className="text-[12px] text-text-muted mt-2">{n}</p>)}
        </Card>
      )}
    </div>
  );
}
