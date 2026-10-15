import { useEffect, useState, useRef } from 'react';
import { 
  Menu, 
  X, 
  Bot, 
  Coins, 
  Users, 
  HelpCircle, 
  LogIn, 
  UserPlus, 
  LayoutDashboard 
} from 'lucide-react';
import { api } from '../lib/api';
import { useI18n } from '../i18n';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import MakefyOverview from '../components/introduction/MakefyOverview';
import HeroPreview from '../components/landing/HeroPreview';
import ThemeToggle from '../components/ThemeToggle';
import { RevealText, RevealWords, SectionHeaderReveal } from '../components/ui/RevealText';
import './Login.css';

const BOT_LINK = 'https://t.me/Makefybot/app';

function TelegramMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="makefy-icon">
      <path fill="currentColor" d="M21.7 3.3 18.6 20c-.23 1.18-.86 1.47-1.74.92l-4.78-3.52-2.31 2.22c-.26.26-.48.48-.98.48l.35-4.87 8.86-8c.39-.35-.08-.55-.6-.2L6.44 13.8l-4.72-1.48c-1.03-.32-1.05-1.03.22-1.52L20.4 3.1c.87-.32 1.63.2 1.3.2Z" />
    </svg>
  );
}

function Arrow() {
  return <span className="makefy-arrow" aria-hidden="true">↗</span>;
}

export default function LandingPage() {
  const { status } = useAuth();
  const isLoggedIn = status === 'user' || status === 'admin';
  const { t, lang, pref, setPref } = useI18n();
  const [pub, setPub] = useState(null);
  const [pubErr, setPubErr] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => { api.get('/public_stats.php').then(setPub).catch(() => setPubErr(true)); }, []);
  const fmt = (n) => Number(n || 0).toLocaleString('ru-RU');

  // Menyu ochiq bo'lganda tashqariga bosilsa yopiladi
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClickOutside = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  return (
    <main className="makefy-landing" id="home">
      <div className="makefy-landing__bg" aria-hidden="true">
        <div className="makefy-landing__glow makefy-landing__glow--hero" />
        <div className="makefy-landing__glow makefy-landing__glow--cyan" />
        <div className="makefy-landing__glow makefy-landing__glow--mid" />
        <div className="makefy-landing__grid" />
        <div className="makefy-landing__dots" />
        <div className="makefy-landing__beam" />
        <div className="makefy-landing__vignette" />
      </div>

      <div className="makefy-login__shell makefy-landing__shell">
        <header className="makefy-header makefy-header--landing" ref={headerRef}>
          <a className="makefy-brand" href={BOT_LINK} target="_blank" rel="noreferrer">
            <img
              src="/makefy-logo.png"
              alt=""
              className="makefy-brand__mark"
              onError={(event) => {
                if (event.currentTarget.src.endsWith('/makefy-logo.png')) {
                  event.currentTarget.src = '/makerbot-logo.png';
                }
              }}
            />
            <span className="makefy-brand__name">makefy<span>.</span></span>
          </a>

          {/* Header Boshqaruvlari: Til, Kun/Tun va Menyular */}
          <div className="makefy-header__controls">
            <select 
              aria-label={t('lang.label')} 
              value={pref === 'auto' ? lang : pref} 
              onChange={(e) => setPref(e.target.value)} 
              className="makefy-landing-nav__link makefy-landing-nav__select"
            >
              <option value="uz">UZ</option>
              <option value="ru">RU</option>
              <option value="en">EN</option>
            </select>

            <ThemeToggle className="makefy-landing-nav__theme-btn" />

            {/* Desktop linklar */}
            <div className="makefy-desktop-nav">
              <Link to="/login" className="makefy-landing-nav__link makefy-landing-nav__link--ghost">Kirish</Link>
              <Link to="/register" className="makefy-landing-nav__link makefy-landing-nav__link--primary">Ro‘yxatdan o‘tish</Link>
              {isLoggedIn && <Link to="/dashboard" className="makefy-landing-nav__link">Dashboard</Link>}
            </div>

            {/* Mobil menyu tugmasi (Hamburger) */}
            <button
              type="button"
              className="makefy-menu-toggle"
              aria-label={mobileMenuOpen ? "Menyuni yopish" : "Menyuni ochish"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Mobil ochiluvchi menyu (Faqat ochilganda chiqadi, tashqariga bosilsa yopiladi) */}
          {mobileMenuOpen && (
            <div 
              className="makefy-mobile-drawer is-open" 
              role="dialog" 
              aria-label="Mobil navigatsiya"
            >
              <div className="makefy-mobile-drawer__links">
                <a href="#bot-types" onClick={() => setMobileMenuOpen(false)} className="makefy-mobile-drawer__link">
                  <Bot size={15} aria-hidden="true" className="makefy-mobile-drawer__icon" />
                  <span>Bot turlari</span>
                </a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="makefy-mobile-drawer__link">
                  <Coins size={15} aria-hidden="true" className="makefy-mobile-drawer__icon" />
                  <span>Narxlar</span>
                </a>
                <a href="#about" onClick={() => setMobileMenuOpen(false)} className="makefy-mobile-drawer__link">
                  <Users size={15} aria-hidden="true" className="makefy-mobile-drawer__icon" />
                  <span>Biz haqimizda</span>
                </a>
                <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="makefy-mobile-drawer__link">
                  <HelpCircle size={15} aria-hidden="true" className="makefy-mobile-drawer__icon" />
                  <span>FAQ</span>
                </a>
              </div>

              <div className="makefy-mobile-drawer__divider" />

              <div className="makefy-mobile-drawer__actions">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="makefy-mobile-drawer__btn makefy-mobile-drawer__btn--ghost">
                  <LogIn size={15} aria-hidden="true" />
                  <span>Kirish</span>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="makefy-mobile-drawer__btn makefy-mobile-drawer__btn--primary">
                  <UserPlus size={15} aria-hidden="true" />
                  <span>Ro‘yxatdan o‘tish</span>
                </Link>
                {isLoggedIn && (
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="makefy-mobile-drawer__btn makefy-mobile-drawer__btn--secondary">
                    <LayoutDashboard size={15} aria-hidden="true" />
                    <span>Dashboard</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </header>

        <section className="makefy-hero makefy-hero--landing" id="home">
          <div className="makefy-hero__copy">
            <RevealText y={12} delay={0.05} duration={0.5}>
              <div className="makefy-eyebrow"><span className="makefy-eyebrow__dot" /> Telegram platforma</div>
            </RevealText>

            <h1 className="makefy-hero__title">
              <RevealWords text="Barcha botlaringizni" delay={0.15} />
              <br />
              <RevealText delay={0.35} y={16}>
                <span className="makefy-gradient-text-animated">bitta joydan boshqaring</span>
              </RevealText>
            </h1>

            <RevealText delay={0.48} y={16} duration={0.65}>
              <p className="makefy-hero__description">
                Makefy yordamida botlarni yaratish, ularga xizmat ko‘rsatish va daromadni kuzatish bir joyda amalga oshiriladi.
                Hammasi Telegram ichida, silliq va qulay boshqaruv bilan.
              </p>
            </RevealText>

            <RevealText delay={0.62} y={16} duration={0.6}>
              <div className="makefy-actions">
                <a className="makefy-primary-landing" href={BOT_LINK} target="_blank" rel="noreferrer">
                  <TelegramMark />
                  Boshlash
                  <Arrow />
                </a>
                <Link to="/login" className="makefy-secondary-landing" style={{ border: '1px solid rgba(18,216,132,0.4)', background: 'rgba(18,216,132,0.08)' }}>
                  Demo hisob bilan kirish ⚡
                </Link>
                <Link to="/register" className="makefy-secondary-landing">
                  Ro‘yxatdan o‘tish <Arrow />
                </Link>
              </div>
            </RevealText>

            <RevealText delay={0.75} y={12} duration={0.5}>
              <div className="makefy-proof">
                <span><strong>Hammasi tayyor.</strong> Barcha boshqaruvlar bir joyda.</span>
              </div>
            </RevealText>
          </div>

          <div className="makefy-hero__visual">
            <HeroPreview stats={pub?.stats} />
          </div>
        </section>

        <section className="makefy-home-section" id="bot-types">
          <SectionHeaderReveal
            eyebrow="BOT TURLARI"
            title="Har bir bot uchun tayyor va tez ishlaydigan model"
          />

          <div className="makefy-home-cards">
            {[
              { icon: '🛒', title: 'Online do‘kon', desc: 'Buyurtmalar, katalog va to‘lovlarni bitta botda boshqarish.' },
              { icon: '🎬', title: 'Kino va kontent', desc: 'Premium obuna, media va foydalanuvchilar bilan ishlash.' },
              { icon: '📈', title: 'Lead va sales', desc: 'Client opsiyasi, savat va avtomatlashtirilgan sarlavhalar.' },
            ].map((card, idx) => (
              <motion.div
                key={card.title}
                className="makefy-home-card"
                initial={{ opacity: 0, y: 26, filter: 'blur(6px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
              >
                <span>{card.icon}</span>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="makefy-home-section" id="pricing">
          <SectionHeaderReveal
            eyebrow="NARXLAR"
            title="Qulay boshlash va tez kengayish"
          />

          <div className="makefy-pricing-grid">
            {pubErr && <p role="alert">{t('landing.pricing.error')}</p>}
            {!pub && !pubErr && [0, 1, 2].map((i) => <div key={i} className="makefy-pricing-card" aria-busy="true"><small>…</small></div>)}
            {pub && pub.plans.map((p, i) => (
              <motion.div
                key={p.kalit}
                className={'makefy-pricing-card' + (i === 1 ? ' is-featured' : '')}
                initial={{ opacity: 0, y: 24, filter: 'blur(5px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.55, delay: i * 0.1 }}
              >
                <small>{p.nomi}</small>
                <strong>{p.narxi > 0 ? `${fmt(p.narxi)} ${t('common.soum')}` : t('common.free')}{p.muddat_kun > 0 && <em> {t('landing.pricing.month', { days: p.muddat_kun })}</em>}</strong>
                {p.limits && (
                  <p>
                    {Number(p.limits.max_bots) > 0 ? t('landing.pricing.bots', { n: fmt(p.limits.max_bots) }) : t('landing.pricing.botsUnlimited')}
                    {Number(p.limits.monthly_messages) > 0 && <><br />{t('landing.pricing.messages', { n: fmt(p.limits.monthly_messages) })}</>}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        <section className="makefy-home-section" id="about">
          <SectionHeaderReveal
            eyebrow="BIZ HAQIMIZDA"
            title="Telegram botlarni biznes uchun qulay va tez yaratish platformasi"
            subtitle="Makefy — botlar, buyurtmalar, to‘lovlar va foydalanuvchilar bilan ishlash uchun zamonaviy ishlash vositasi."
          />
        </section>

        <section className="makefy-home-section" id="faq">
          <SectionHeaderReveal
            eyebrow="FAQ"
            title="Tez-tez beriladigan savollar"
          />
          <div className="makefy-faq-list">
            {[
              { q: 'Botni qayerdan boshlash kerak?', a: 'Bir necha bosqichda ishlashni boshlashingiz mumkin. Demo akkaunt orqali hoziroq sinab ko‘ring.' },
              { q: 'Makefy uchun dasturchi kerakmi?', a: 'Yo‘q, bloklar va shablonlar orqali ishlash mumkin.' },
              { q: 'Botlarimni kuzatamanmi?', a: 'Ha, dashboard orqali balans, statistika va faoliyatni kuzatishingiz mumkin.' },
            ].map((item, idx) => (
              <motion.div
                key={item.q}
                className="makefy-faq-item"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <b>{item.q}</b>
                <p>{item.a}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="makefy-home-section makefy-home-section--support" id="support">
          <motion.div
            className="makefy-home-support"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div>
              <span className="makefy-home-section__eyebrow">YORDAM</span>
              <h2>Yordamga muhtoj bo‘lsangiz, biz qo‘lidan kelgancha yo‘l ko‘rsatamiz.</h2>
            </div>
            <a href="https://t.me/Makefybot/app" target="_blank" rel="noreferrer" className="makefy-button-primary">Supportga murojaat</a>
          </motion.div>
        </section>

        <MakefyOverview isLoggedIn={isLoggedIn} />
      </div>
    </main>
  );
}
