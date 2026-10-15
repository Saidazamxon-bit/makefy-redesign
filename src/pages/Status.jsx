import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useI18n } from '../i18n';
import BrandLogo from '../components/BrandLogo';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui';

const TONE = { operational: 'success', degraded: 'danger', unknown: 'neutral' };
const HERO = { operational: ['is-ok', 'fa-circle-check'], degraded: ['is-bad', 'fa-triangle-exclamation'], unknown: ['is-unk', 'fa-circle-question'] };

// 30 kunlik "uptime" chiziqlari: rang + balandlik (rang-ko'rlar uchun), ma'lumot yo'q kun alohida
function Bars({ days, t }) {
  return (
    <div className="pg-uptime" role="img" aria-label={t('status.uptime30', { pct: '' })}>
      {days.map((d) => {
        const v = d.uptime;
        const bg = v === null ? 'var(--surface-3)' : v >= 99.5 ? 'var(--success)' : v >= 95 ? 'var(--warn)' : 'var(--danger)';
        return <span key={d.day} title={`${d.day}: ${v === null ? t('status.noData') : v + '%'}`} style={{ background: bg, height: v === null ? '30%' : Math.max(30, v) + '%' }} />;
      })}
    </div>
  );
}

export default function Status() {
  const { t } = useI18n();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  const load = useCallback(() => { setErr(false); api.get('/status.php').then(setD).catch(() => setErr(true)); }, []);
  useEffect(() => { load(); const id = setInterval(load, 60000); return () => clearInterval(id); }, [load]);
  const hero = d ? HERO[d.overall] || HERO.unknown : null;

  return (
    <div className="pg-public">
      <div className="pg-public__bar">
        <Link to="/" aria-label="Makefy"><BrandLogo /></Link>
        <Link to="/dashboard" className="mf-btn mf-btn--ghost mf-btn--sm">{t('docs.back')}</Link>
      </div>
      <main className="pg-public__body pg-public__narrow" style={{ width: '100%' }}>
        <PageHeader title={t('status.title')} />
        {err && <Card><ErrorState title={t('status.title')} body={t('status.error')} onRetry={load} /></Card>}
        {!d && !err && <div className="pg-skeleton" aria-busy="true"><Skeleton className="h-20" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>}
        {d && (
          <>
            <Card role="status">
              <div className="pg-statushero">
                <span className={'pg-statushero__ico ' + hero[0]}><i className={'fa-solid ' + hero[1]} aria-hidden="true" /></span>
                <div>
                  <b>{t('status.overall.' + d.overall)}</b>
                  <p className="pg-muted pg-num" style={{ fontSize: 12.5 }}>{t('status.updated', { time: new Date(d.updated).toLocaleTimeString() })}</p>
                </div>
              </div>
            </Card>
            {d.components.map((c) => (
              <Card key={c.key}>
                <div className="mf-section__head" style={{ marginBottom: 12 }}>
                  <h2 className="mf-section__title">{t('status.component.' + c.key)}</h2>
                  <Badge tone={TONE[c.state]} dot>{t('status.state.' + c.state)}</Badge>
                </div>
                <Bars days={c.days} t={t} />
                <p className="pg-muted pg-num" style={{ fontSize: 12.5, marginTop: 8 }}>{t('status.uptime30', { pct: c.uptime30 === null ? t('status.noData') : c.uptime30 + '%' })}</p>
              </Card>
            ))}
            <Card>
              <h2 className="mf-section__title" style={{ marginBottom: 8 }}>{t('status.incidents')}</h2>
              {d.incidents.length === 0 ? <EmptyState icon="fa-shield-heart" title={t('status.noIncidents')} /> : (
                <ul className="pg-incidents">
                  {d.incidents.map((i) => (
                    <li key={i.id}>
                      <div className="mf-section__head"><b style={{ fontSize: 14 }}>{i.title}</b><Badge tone={i.resolved ? 'success' : 'warning'}>{i.resolved ? t('status.resolved') : t('status.ongoing')}</Badge></div>
                      {i.body && <p className="pg-muted" style={{ fontSize: 13, marginTop: 4 }}>{i.body}</p>}
                      <p className="pg-muted pg-num" style={{ fontSize: 11.5, marginTop: 4 }}>{i.created_at}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
