import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatMoney } from '../lib/format';

const LEVEL_DOT_COLORS = {
  Oddiy: '#4A566E',
  Starter: '#4DA6FF',
  Pro: '#00F5A0',
  Premium: '#FFB800',
  VIP: '#FF4D6A',
};

const HOW_STEPS = [
  "Do'stlaringizga referral havolani yuboring yoki «Ulashish» tugmasini bosing.",
  "Do'stingiz havola orqali botga kirib, ro'yxatdan o'tadi.",
  "Bonus balansingizga avtomatik qo'shiladi.",
  "Ko'proq do'st taklif qiling — darajangiz va imtiyozlaringiz oshadi.",
];

const LEVEL_TABLE = [
  { name: 'Oddiy', desc: '0 ta taklif' },
  { name: 'Starter', desc: '1+ ta taklif' },
  { name: 'Pro', desc: '5+ ta taklif' },
  { name: 'Premium', desc: '10+ ta taklif' },
  { name: 'VIP', desc: '20+ ta taklif' },
];

export default function Referal() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/referal.php').then(setData).catch((err) => setError(err.message));
  }, []);

  function copyLink() {
    if (!data) return;
    navigator.clipboard?.writeText(data.referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (error && !data) return <p className="text-danger text-sm">{error}</p>;
  if (!data) return <div className="h-64 rounded-[var(--radius-md)] bg-surface-2 animate-pulse" />;

  const { current, next, raw } = data.level;
  const progressPct =
    raw.level >= 4 || next.min <= current.min
      ? 100
      : Math.min(100, Math.max(0, Math.round(((raw.count - current.min) / (next.min - current.min)) * 100)));

  const shareText = `🤖 MakerBot — Telegram botlarini osongina yaratish platformasi!\n\nBotingizni bepul yarating va boshqaring.\n\nBoshlash uchun quyidagi havolaga bosing 👇\n${data.referralLink}`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(data.referralLink)}&text=${encodeURIComponent(shareText)}`;

  return (
    <div className="mf-page mf-page--referral mf-page--standard">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-accent-soft text-accent flex items-center justify-center text-2xl mb-2">
          <i className="fa-solid fa-handshake" />
        </div>
        <h2 className="font-extrabold text-lg">Do'stlarni taklif qilish</h2>
        <p className="text-[12.5px] text-text-muted">Referral havolasi orqali do'stlaringizni taklif qiling va bonus oling</p>
      </div>

      <div className="rounded-[var(--radius-md)] bg-surface border border-border p-4">
        <div className="text-[12px] font-bold text-text-muted mb-1.5">
          <i className="fa-solid fa-link mr-1.5" /> Sizning referral havolangiz
        </div>
        <div className="text-[13px] font-mono bg-surface-2 border border-border rounded-[var(--radius-sm)] px-3 py-2.5 mb-3 break-all">
          {data.referralLink}
        </div>
        {data.needsTelegramLink && (
          <p className="text-[12px] text-text-muted mb-3">
            Referal bonuslari bot orqali hisoblanadi. Shaxsiy havolangiz chiqishi uchun Telegram akkauntingizni{' '}
            <Link to="/sozlamalar" className="text-accent font-bold">Sozlamalar</Link> orqali ulang.
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="flex-1 py-2.5 rounded-[var(--radius-sm)] bg-surface-3 border border-border font-bold text-sm"
          >
            <i className={`fa-solid ${copied ? 'fa-check text-accent' : 'fa-copy'} mr-1.5`} />
            {copied ? 'Nusxalandi!' : 'Nusxalash'}
          </button>
          <a
            href={telegramShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center py-2.5 rounded-[var(--radius-sm)] bg-[#229ED9] text-white font-bold text-sm"
          >
            <i className="fa-brands fa-telegram mr-1.5" /> Ulashish
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <StatCard icon="fa-users" value={data.stats.count} label="Takliflar soni" />
        <StatCard icon="fa-coins" value={formatMoney(data.stats.totalBonus)} label="Ishlab topilgan" small />
        <StatCard icon="fa-user-check" value={data.stats.activeCount} label="Faol takliflar" />
      </div>

      <div className="rounded-[var(--radius-md)] bg-surface border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-extrabold text-sm flex items-center gap-1.5">
            <i className="fa-solid fa-ranking-star text-accent" /> {raw.name}
          </span>
          <span className="text-[12px] font-semibold text-text-muted">
            {raw.level >= 4 ? 'Maksimal!' : `Keyingi: ${next.nomi}`}
          </span>
        </div>
        <div className="h-2 rounded-full bg-surface-3 overflow-hidden mb-1.5">
          <div className="h-full bg-[var(--mf-brand)]" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="text-[12px] text-text-muted">
          {raw.level >= 4 ? "🏆 VIP darajaga erishdingiz" : `${raw.count} ta taklif`}
        </div>
      </div>

      <div className="rounded-[var(--radius-md)] bg-surface border border-border p-4">
        <div className="font-extrabold text-sm mb-3">
          <i className="fa-solid fa-user-group mr-1.5 text-accent" /> Taklif qilinganlar
        </div>
        {data.invited.length === 0 ? (
          <div className="text-center py-6 text-text-muted text-sm">
            <i className="fa-solid fa-user-plus text-xl mb-2 block" />
            Hali hech kim taklif qilinmagan
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.invited.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="font-semibold truncate">{t.ism}</span>
                <span className={t.bonus_berildi !== '0' ? 'text-accent font-bold' : 'text-text-dim'}>
                  {t.bonus_berildi !== '0' ? `+${formatMoney(t.bonus_berildi)}` : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[var(--radius-md)] bg-surface border border-border p-4">
        <div className="font-extrabold text-sm mb-3">
          <i className="fa-solid fa-circle-question mr-1.5 text-accent" /> Qanday ishlaydi?
        </div>
        <div className="space-y-2.5">
          {HOW_STEPS.map((text, i) => (
            <div key={i} className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-accent-soft text-accent flex items-center justify-center text-[12px] font-bold flex-shrink-0">
                {i + 1}
              </span>
              <p className="text-[12.5px] text-text-muted">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[var(--radius-md)] bg-surface border border-border p-4">
        <div className="font-extrabold text-sm mb-2">
          <i className="fa-solid fa-star mr-1.5 text-accent" /> Bonus shartlari
        </div>
        <ul className="space-y-1.5 text-[12.5px]">
          <li><i className="fa-solid fa-check text-accent mr-1.5" /> Har bir do'stingiz ro'yxatdan o'tsa — {formatMoney(data.bonusPerReferral)} bonus</li>
          <li><i className="fa-solid fa-check text-accent mr-1.5" /> Do'stingiz havola orqali kirsa — avtomatik hisoblanadi</li>
          <li><i className="fa-solid fa-check text-accent mr-1.5" /> Cheksiz miqdordagi do'st taklif qilish mumkin</li>
          <li><i className="fa-solid fa-check text-accent mr-1.5" /> Darajangiz oshgan sari imtiyozlar ko'payadi</li>
        </ul>
      </div>

      <div className="rounded-[var(--radius-md)] bg-surface border border-border p-4">
        <div className="font-extrabold text-sm mb-2">
          <i className="fa-solid fa-chart-line mr-1.5 text-accent" /> Daraja shartlari
        </div>
        <ul className="space-y-1.5 text-[12.5px]">
          {LEVEL_TABLE.map((l) => (
            <li key={l.name} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: LEVEL_DOT_COLORS[l.name] }} />
              <strong>{l.name}</strong> — {l.desc}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, small }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface border border-border p-3 text-center">
      <i className={`fa-solid ${icon} text-accent`} />
      <div className={`font-extrabold mt-1 ${small ? 'text-[13px]' : 'text-lg'}`}>{value}</div>
      <div className="text-[10.5px] text-text-muted font-semibold leading-tight">{label}</div>
    </div>
  );
}
