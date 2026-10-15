import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import BrandLogo from '../components/BrandLogo';
import { Card, EmptyState, Input, PageHeader } from '../components/ui';

const SECTIONS = ['start', 'templates', 'api'];
const FAQ = [1, 2, 3, 4];

export default function Docs() {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(0);
  const needle = q.trim().toLowerCase();
  const sections = useMemo(() => SECTIONS.filter((s) => !needle || (t(`docs.${s}.title`) + ' ' + t(`docs.${s}.body`)).toLowerCase().includes(needle)), [needle, t]);
  const faq = useMemo(() => FAQ.filter((n) => !needle || (t(`docs.faq.q${n}`) + ' ' + t(`docs.faq.a${n}`)).toLowerCase().includes(needle)), [needle, t]);

  return (
    <div className="pg-public">
      <div className="pg-public__bar">
        <Link to="/" aria-label="Makefy"><BrandLogo /></Link>
        <Link to="/dashboard" className="mf-btn mf-btn--ghost mf-btn--sm">{t('docs.back')}</Link>
      </div>
      <main className="pg-public__body">
        <PageHeader title={t('docs.title')} />
        <div className="pg-docs">
          <nav aria-label={t('docs.toc')} className="pg-toc">
            <h2>{t('docs.toc')}</h2>
            {SECTIONS.map((s) => <a key={s} href={`#${s}`}>{t(`docs.${s}.title`)}</a>)}
            <a href="#faq">{t('docs.faq.title')}</a>
            <a href="/v1/docs" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>OpenAPI ↗</a>
          </nav>
          <div className="mf-stack">
            <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('docs.search')} aria-label={t('docs.search')} />
            {sections.length === 0 && faq.length === 0 && <Card variant="flat"><EmptyState icon="fa-magnifying-glass" title={t('docs.noResults')} /></Card>}
            {sections.map((s) => (
              <Card key={s} id={s} aria-labelledby={`h-${s}`}>
                <h2 id={`h-${s}`} className="mf-section__title" style={{ marginBottom: 6 }}>{t(`docs.${s}.title`)}</h2>
                <p className="pg-muted" style={{ lineHeight: 1.65 }}>{t(`docs.${s}.body`)}</p>
              </Card>
            ))}
            {faq.length > 0 && (
              <Card id="faq">
                <h2 className="mf-section__title" style={{ marginBottom: 6 }}>{t('docs.faq.title')}</h2>
                {faq.map((n) => (
                  <div key={n} className="pg-faq__item">
                    <h3 style={{ margin: 0 }}>
                      <button type="button" className="pg-faq__q" onClick={() => setOpen(open === n ? 0 : n)} aria-expanded={open === n} aria-controls={`faq-${n}`}>
                        {t(`docs.faq.q${n}`)}<i className={'fa-solid pg-muted ' + (open === n ? 'fa-chevron-up' : 'fa-chevron-down')} aria-hidden="true" />
                      </button>
                    </h3>
                    {open === n && <p id={`faq-${n}`} className="pg-faq__a">{t(`docs.faq.a${n}`)}</p>}
                  </div>
                ))}
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
