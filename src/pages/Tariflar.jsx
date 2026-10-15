import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/format';
import PlanUsage from '../components/PlanUsage';
import { useI18n } from '../i18n';

const PLAN_ICONS = { pro: 'fa-star', premium: 'fa-gem', max: 'fa-crown' };

export default function Tariflar() {
  const { t } = useI18n();
  const { updateBalance } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyKalit, setBusyKalit] = useState(null);

  function load() {
    api.get('/tariflar.php').then(setData).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  async function buy(plan) {
    if (!confirm(`${plan.nomi} tarifini ${formatMoney(plan.narxi)}ga sotib olmoqchimisiz?`)) return;
    setBusyKalit(plan.kalit);
    setError('');
    setMessage('');
    try {
      const res = await api.post('/tariflar.php', { amal: 'sotib_ol', kalit: plan.kalit });
      setMessage(res.message);
      updateBalance(res.newBalance);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setBusyKalit(null);
    }
  }

  if (error && !data) return <p className="text-danger text-sm">{error}</p>;
  if (!data) return <div className="h-40 rounded-[var(--radius-md)] bg-surface-2 animate-pulse" />;

  return (
    <div className="mf-page mf-page--plans mf-page--standard space-y-4 pb-24">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-accent-soft text-accent flex items-center justify-center text-lg shrink-0">
          <i className="fa-solid fa-crown" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg leading-tight">{t('nav.plans') || 'Tariflar'}</h1>
          <p className="text-[12.5px] text-text-muted mt-0.5">
            Umumiy tarif — barcha botlaringizga chegirma va qo‘shimcha imtiyozlar beradi.
          </p>
        </div>
      </div>

      {message && (
        <div className="text-[13px] font-semibold text-accent bg-accent-soft rounded-[var(--radius-sm)] px-3 py-2">
          {message}
        </div>
      )}
      {error && (
        <div className="text-[13px] font-semibold text-danger bg-danger-soft rounded-[var(--radius-sm)] px-3 py-2">
          {error}
        </div>
      )}

      <PlanUsage refreshKey={data.currentPlan} />

      <div className="space-y-3">
        {(data.currentPlan === 'oddiy' || !data.currentPlan) && (
          <div className="rounded-[var(--radius-md)] bg-surface border-2 border-accent p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-sm">
                <i className="fa-regular fa-user mr-1.5" /> Oddiy
              </span>
              <span className="text-[11px] font-bold text-accent bg-accent-soft px-2 py-1 rounded-full">
                <i className="fa-solid fa-check mr-1" /> Joriy tarifingiz
              </span>
            </div>
            <p className="text-[12.5px] text-text-muted">
              Chegirma va qo‘shimcha bonuslarsiz, standart shartlar
            </p>
          </div>
        )}

        {data.plans.map((plan) => {
          const isCurrent = plan.kalit === data.currentPlan;
          return (
            <div
              key={plan.kalit}
              className={`rounded-[var(--radius-md)] bg-surface p-4 ${
                isCurrent ? 'border-2 border-accent' : 'border border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <span className="font-extrabold text-sm flex items-center gap-1.5">
                  <i className={`fa-solid ${PLAN_ICONS[plan.kalit] || 'fa-tag'} text-accent`} /> {plan.nomi}
                </span>
                {isCurrent ? (
                  <span className="text-[11px] font-bold text-accent bg-accent-soft px-2 py-1 rounded-full whitespace-nowrap">
                    <i className="fa-solid fa-check mr-1" /> Joriy tarifingiz
                  </span>
                ) : (
                  <span className="text-[12px] font-bold text-text-muted whitespace-nowrap">
                    {formatMoney(plan.narxi)} / {plan.muddat_kun} kun
                  </span>
                )}
              </div>

              <ul className="space-y-1.5 mb-3">
                <PlanFeature icon="fa-tag">
                  Bot tarifi va kunlik to‘lovga <b>{plan.chegirma}%</b> chegirma
                </PlanFeature>
                <PlanFeature icon="fa-coins">
                  Kunlik kirish bonusi <b>+{plan.kunlik_bonus_foiz}%</b>
                </PlanFeature>
                <PlanFeature icon="fa-user-plus">
                  Referal bonusi <b>+{plan.referal_bonus_foiz}%</b>
                </PlanFeature>
                <PlanFeature icon="fa-robot">
                  Bot yaratganda <b>+{plan.bot_bonus_kun} kun</b> tekin kunlik to‘lov
                </PlanFeature>
                {Number(plan.otkazish) === 1 && (
                  <PlanFeature icon="fa-right-left">Bot egaligini o‘tkazish imkoniyati</PlanFeature>
                )}
                {Number(plan.token_yangila) === 1 && (
                  <PlanFeature icon="fa-key">Token yangilash (komissiyasiz)</PlanFeature>
                )}
                {Number(plan.chat_rasm ?? 1) === 1 && (
                  <PlanFeature icon="fa-image">Chatda rasm yuborish</PlanFeature>
                )}
                {Number(plan.webapp_bepul ?? 0) === 1 && (
                  <PlanFeature icon="fa-window-restore">Web App qo‘shimchasi bepul (Oddiy bot tarifida ham)</PlanFeature>
                )}
                {Number(plan.tezlik_bonus ?? 0) >= 1 && (
                  <PlanFeature icon="fa-gauge-high">Ommaviy xabar navbatida +{plan.tezlik_bonus} ustuvorlik</PlanFeature>
                )}
              </ul>

              {!isCurrent && (
                <button
                  onClick={() => buy(plan)}
                  disabled={busyKalit === plan.kalit}
                  className="w-full py-2.5 rounded-[var(--radius-sm)] bg-accent text-accent-text font-bold text-sm disabled:opacity-60"
                >
                  <i className="fa-solid fa-cart-shopping mr-1.5" />
                  {busyKalit === plan.kalit ? 'Amalga oshirilmoqda...' : 'Sotib olish'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[12px] text-text-muted mt-4">
        <i className="fa-solid fa-circle-info mr-1.5 text-accent" /> Tarif narxi balansingizdan yechiladi. Yetarli
        mablag‘ bo‘lmasa, avval "Hisobni to‘ldirish" bo‘limidan balansingizni to‘ldiring.
      </p>
    </div>
  );
}

function PlanFeature({ icon, children }) {
  return (
    <li className="flex items-start gap-2 text-[12.5px]">
      <i className={`fa-solid ${icon} text-accent mt-0.5 w-3.5 flex-shrink-0`} />
      <span>{children}</span>
    </li>
  );
}
