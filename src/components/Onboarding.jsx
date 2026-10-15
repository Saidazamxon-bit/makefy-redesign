import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { Card } from './ui';

const KEY = 'mf_onboarding_dismissed';

// 3 qadamli yo'riqnoma. Qadam holati haqiqiy ma'lumotdan: botlar soni (2-qadam), bot foydalanuvchilari/xabar (3-qadam).
export default function Onboarding({ botCount = 0, hasUsers = false }) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } });
  const done = [botCount > 0, botCount > 0, botCount > 0 && hasUsers];
  const n = done.filter(Boolean).length;
  if (hidden && n < 3) return null;
  if (n === 3) return <Card className="text-[14px]" role="status"><i className="fa-solid fa-circle-check text-success mr-2" aria-hidden="true" />{t('onb.done')}</Card>;
  const steps = [
    { k: 1, to: '/market' }, { k: 2, to: '/market' }, { k: 3, to: '/bots' },
  ];
  const firstOpen = done.findIndex((d) => !d);
  return (
    <Card aria-labelledby="onb-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="onb-title" className="font-bold">{t('onb.title')}</h2>
          <p className="text-[12.5px] text-text-muted mt-0.5 tabular-nums">{t('onb.progress', { done: n })}</p>
        </div>
        <button onClick={() => { setHidden(true); try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } }} className="text-[12px] underline text-text-muted min-h-[44px] md:min-h-0">{t('onb.dismiss')}</button>
      </div>
      <div className="h-2 rounded-full bg-surface-2 overflow-hidden mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={3} aria-valuenow={n} aria-label={t('onb.progress', { done: n })}>
        <div className="h-full bg-[var(--mf-brand)] transition-all" style={{ width: (n / 3) * 100 + '%' }} />
      </div>
      <ol className="mt-4 grid md:grid-cols-3 gap-3">
        {steps.map((s, i) => (
          <li key={s.k} className={'rounded-[12px] border p-3 ' + (done[i] ? 'border-accent bg-accent-soft' : i === firstOpen ? 'border-accent' : 'border-border')}>
            <div className="flex items-center gap-2 font-bold text-[14px]">
              <span className={'w-6 h-6 rounded-full grid place-items-center text-[12px] ' + (done[i] ? 'bg-accent text-accent-text' : 'bg-surface-2')}>{done[i] ? <i className="fa-solid fa-check" aria-hidden="true" /> : s.k}</span>
              {t(`onb.step${s.k}.title`)}
            </div>
            <p className="text-[12.5px] text-text-muted mt-1">{t(`onb.step${s.k}.body`)}</p>
            {!done[i] && <Link to={s.to} className="inline-flex items-center min-h-[44px] md:min-h-0 mt-2 text-[13px] font-bold text-accent underline">{t(`onb.step${s.k}.cta`)}</Link>}
          </li>
        ))}
      </ol>
    </Card>
  );
}
