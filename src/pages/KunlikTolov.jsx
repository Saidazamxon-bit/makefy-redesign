import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/format';
import { useI18n } from '../i18n';

const QUICK_DAYS = [7, 15, 30, 90];

export default function KunlikTolov() {
  const { t } = useI18n();
  const { username } = useParams();
  const { updateBalance } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [kunlik, setKunlik] = useState(30);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api
      .get(`/mybots/detail.php?useri=${encodeURIComponent(username)}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [username]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/mybots/kunlik_tolov.php', { useri: username, kunlik });
      setResult({ ok: true, message: res.message || t('kunlik.success') });
      updateBalance(res.newBalance);
      setData((d) => (d ? { ...d, kun: res.newKun } : d));
    } catch (err) {
      setResult({ ok: false, message: err instanceof ApiError ? err.message : 'Xatolik yuz berdi.' });
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) return <p className="text-danger text-sm">{error}</p>;
  if (!data) return <div className="h-64 rounded-[var(--radius-md)] bg-surface-2 animate-pulse" />;

  const eff = data.narxiEff ?? data.narxi;
  const ch = Number(data.chegirma || 0);
  const jami = Math.round((kunlik * eff * (100 - ch)) / 100);

  return (
    <div className="mf-page mf-page--payment mf-page--standard space-y-4 pb-20">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-accent-soft text-accent flex items-center justify-center text-lg shrink-0">
          <i className="fa-solid fa-credit-card" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg leading-tight">{t('kunlik.title')}</h1>
          <p className="text-[12.5px] text-text-muted">@{username}</p>
        </div>
      </div>

      <div className="rounded-[var(--radius-md)] bg-surface border border-border p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-text-muted font-semibold">{t('kunlik.currentDays')}</span>
          <span className="font-extrabold">{data.kun}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-muted font-semibold">{t('kunlik.dailyRate')}</span>
          <span className="font-extrabold">{formatMoney(eff)}{ch > 0 && <span className="text-accent text-xs"> · −{ch}%</span>}</span>
        </div>
      </div>

      {result ? (
        <div className={`rounded-[var(--radius-md)] p-4 text-center ${result.ok ? 'bg-accent-soft' : 'bg-danger-soft'}`}>
          <i className={`fa-solid ${result.ok ? 'fa-circle-check text-accent' : 'fa-ban text-danger'} text-xl mb-2 block`} />
          <p className={`text-sm font-semibold ${result.ok ? 'text-accent' : 'text-danger'}`}>{result.message}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-[var(--radius-md)] bg-surface border border-border p-4 space-y-3">
          <div className="text-[12.5px] font-bold text-text-muted">{t('kunlik.days')}</div>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_DAYS.map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => setKunlik(d)}
                className={`py-2 rounded-[var(--radius-sm)] text-sm font-bold border ${
                  kunlik === d ? 'bg-accent text-accent-text border-accent' : 'bg-surface-2 border-border text-text'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={1}
            value={kunlik}
            onChange={(e) => setKunlik(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-surface-2 border border-border text-sm outline-none focus:border-accent"
          />
          <div className="flex items-center justify-between text-sm bg-surface-2 rounded-[var(--radius-sm)] px-3.5 py-2.5">
            <span className="text-text-muted font-semibold">{t('kunlik.total')}</span>
            <span className="font-extrabold text-accent">{formatMoney(jami)}</span>
          </div>
          <button
            disabled={busy}
            className="w-full py-3 rounded-[var(--radius-md)] bg-accent text-accent-text font-extrabold text-sm disabled:opacity-60"
          >
            {busy ? t('kunlik.paying') : t('kunlik.payBtn')}
          </button>
        </form>
      )}

      <Link to={`/bots/${username}`} className="block text-center mt-5 text-sm font-bold text-text-muted hover:text-accent">
        ← {t('common.back') || 'Orqaga'}
      </Link>
    </div>
  );
}
