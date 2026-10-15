import { useState, useEffect, useMemo } from 'react';
import { 
  Bot, 
  Send, 
  WalletCards, 
  Activity, 
  CheckCircle2, 
  Zap, 
  Sparkles,
  TrendingUp,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useI18n } from '../../i18n';

const fmt = (n) => Number(n || 0).toLocaleString('ru-RU');

// Jonli hodisalar tasmachasi (Live simulation ticker)
const LIVE_EVENTS = [
  { 
    id: 1, 
    bot: '@ShopBot', 
    badge: '+48,000 so‘m', 
    text: 'Yangi buyurtma #2940 qabul qilindi', 
    icon: Zap,
    time: 'hozirgina' 
  },
  { 
    id: 2, 
    bot: '@KinoBot', 
    badge: '+1,240 a’zo', 
    text: 'Kanalga yangi obunachilar ulandi', 
    icon: Sparkles,
    time: '2 daq oldin' 
  },
  { 
    id: 3, 
    bot: '@PaymentBot', 
    badge: 'Muvaffaqiyatli', 
    text: 'Click & Payme orqali to‘lov o‘tdi', 
    icon: CheckCircle2,
    time: 'hozirgina' 
  },
];

export default function HeroPreview({ stats }) {
  const { t } = useI18n();

  // 1. Jonli hisoblagichlar (Animated counter effect)
  const targetUsers = Number(stats?.users) || 15420;
  const targetBots = Number(stats?.bots) || 4850;
  const targetTemplates = Number(stats?.templates) || 48;

  const [countUsers, setCountUsers] = useState(0);
  const [countBots, setCountBots] = useState(0);
  const [countTemplates, setCountTemplates] = useState(0);

  useEffect(() => {
    let start = null;
    let animId;
    const duration = 1200;

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      setCountUsers(Math.floor(ease * targetUsers));
      setCountBots(Math.floor(ease * targetBots));
      setCountTemplates(Math.floor(ease * targetTemplates));

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [targetUsers, targetBots, targetTemplates]);

  // 2. Jonli xabarlar karuseli (Live ticker rotation)
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveEventIndex((prev) => (prev + 1) % LIVE_EVENTS.length);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  const activeEvent = LIVE_EVENTS[activeEventIndex];

  // 3. 3D Parallax & Mouse tilt
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 10, y: -y * 10 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const [activeRow, setActiveRow] = useState(null);

  const rows = useMemo(() => [
    { 
      id: 'bots',
      icon: Bot, 
      title: t('landing.preview.bots'), 
      text: t('landing.preview.botsText'),
      badge: '⚡ Tayyor',
      accent: 'emerald',
      pulse: '99.9% uptime'
    },
    { 
      id: 'telegram',
      icon: Send, 
      title: t('landing.preview.telegram'), 
      text: t('landing.preview.telegramText'),
      badge: '✓ Faol',
      accent: 'cyan',
      pulse: 'Mini App 2.0'
    },
    { 
      id: 'balance',
      icon: WalletCards, 
      title: t('landing.preview.balance'), 
      text: t('landing.preview.balanceText'),
      badge: '✓ Ulangan',
      accent: 'amber',
      pulse: 'Avto-hisob'
    },
  ], [t]);

  return (
    <div 
      className="mf-preview-wrapper"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Orqa yorug'lik gilosi (Backdrop ambient aura) */}
      <div className={`mf-preview-aura ${isHovered ? 'is-active' : ''}`} aria-hidden="true" />

      <div 
        className="mf-preview" 
        role="group" 
        aria-label={t('landing.preview.aria')}
        style={{
          transform: `perspective(1000px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) translateY(${isHovered ? -4 : 0}px)`,
        }}
      >
        {/* Aylana bo'ylab harakatlanuvchi nur (Border beam shine) */}
        <div className="mf-preview__beam" aria-hidden="true" />

        {/* 1. Yuqori macOS oynasi paneli */}
        <div className="mf-preview__bar">
          <span className="mf-preview__dots" aria-hidden="true">
            <i className="mf-preview__dot--red" />
            <i className="mf-preview__dot--yellow" />
            <i className="mf-preview__dot--green" />
          </span>
          <div className="mf-preview__brand-tag">
            <span className="mf-preview__brand-name">makefy.ai</span>
            <span className="mf-preview__live-badge">
              <span className="mf-preview__pulse-dot" />
              Live
            </span>
          </div>
          <div className="mf-preview__bar-right" aria-hidden="true">
            <ShieldCheck size={14} className="mf-preview__secure-icon" />
            <span className="mf-preview__status-text">v2.6 Cloud</span>
          </div>
        </div>

        {/* 2. Asosiy tana qismi */}
        <div className="mf-preview__body">
          {/* Statistika kartochkalari (Animated Stats) */}
          <div className="mf-preview__stats">
            <div className="mf-preview__stat mf-preview__stat--1">
              <div className="mf-preview__stat-head">
                <small>{t('landing.stats.users')}</small>
                <TrendingUp size={12} className="mf-preview__trend-icon" />
              </div>
              <strong>{fmt(countUsers)}+</strong>
              <span className="mf-preview__stat-delta">+18% bu oy</span>
            </div>

            <div className="mf-preview__stat mf-preview__stat--2">
              <div className="mf-preview__stat-head">
                <small>{t('landing.stats.bots')}</small>
                <Activity size={12} className="mf-preview__trend-icon" />
              </div>
              <strong>{fmt(countBots)}+</strong>
              <span className="mf-preview__stat-delta">99.9% uptime</span>
            </div>

            <div className="mf-preview__stat mf-preview__stat--3">
              <div className="mf-preview__stat-head">
                <small>{t('landing.stats.templates')}</small>
                <Sparkles size={12} className="mf-preview__trend-icon" />
              </div>
              <strong>{countTemplates} ta</strong>
              <span className="mf-preview__stat-delta">AI builder</span>
            </div>
          </div>

          {/* Imkoniyatlar qatorlari (Interactive Rows) */}
          <div className="mf-preview__list">
            {rows.map(({ id, icon: Icon, title, text, badge, pulse }) => {
              const isRowActive = activeRow === id;
              return (
                <div 
                  className={`mf-preview__row ${isRowActive ? 'is-active' : ''}`} 
                  key={id}
                  onMouseEnter={() => setActiveRow(id)}
                  onMouseLeave={() => setActiveRow(null)}
                >
                  <span className={`mf-preview__ico mf-preview__ico--${id}`}>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <div className="mf-preview__row-info">
                    <b>{title}</b>
                    <small>{text}</small>
                  </div>
                  <div className="mf-preview__row-actions">
                    <span className="mf-preview__chip">
                      <span className="mf-preview__chip-pulse" />
                      {badge}
                    </span>
                    <ChevronRight size={14} className="mf-preview__row-arrow" aria-hidden="true" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Jonli bot faoliyati xabarnomasi (Live Activity Simulator Ticker) */}
          <div className="mf-preview__ticker" key={activeEvent.id}>
            <div className="mf-preview__ticker-icon">
              <activeEvent.icon size={14} />
            </div>
            <div className="mf-preview__ticker-content">
              <div className="mf-preview__ticker-title">
                <span className="mf-preview__ticker-bot">{activeEvent.bot}</span>
                <span className="mf-preview__ticker-time">{activeEvent.time}</span>
              </div>
              <div className="mf-preview__ticker-text">{activeEvent.text}</div>
            </div>
            <span className="mf-preview__ticker-badge">{activeEvent.badge}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
