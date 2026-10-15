import { useState, useRef, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Sparkles,
  WalletCards,
  Zap,
} from 'lucide-react';
import './HowItWorks.css';

const templates = [
  { name: 'Onlayn do\'kon', icon: '🏪' },
  { name: 'Kino', icon: '🎬' },
  { name: 'Obuna', icon: '📺' },
  { name: 'Viktorina', icon: '❓' },
  { name: 'Premium', icon: '✨' },
];

const progressSteps = [
  'Token tekshirilmoqda',
  'Bot aniqlanmoqda',
  'Shablon tayyorlanmoqda',
  'Fayllar yaratilmoqda',
  'Ulanish o\'rnatilmoqda',
  'Baza sozlanmoqda',
];

const testimonials = [
  {
    quote: 'Makefy orqali do\'kon botimni tez ishga tushirdim. Eng yoqqani — hammasi bitta joyda.',
    name: 'Aziz',
    role: 'Onlayn do\'kon egasi',
  },
  {
    quote: 'Bot yaratish uchun dasturchi qidirishim shart bo\'lmadi.',
    name: 'Madina',
    role: 'Kontent yaratuvchi',
  },
  {
    quote: 'Buyurtmalar va bot holatini bitta paneldan kuzatish juda qulay.',
    name: 'Bekzod',
    role: 'Telegram kanal admini',
  },
];

const statCards = [
  { label: 'Bot yaratish jarayoni', value: 'Bir necha qadam' },
  { label: 'Boshqaruv', value: '24/7' },
  { label: 'Platforma', value: 'Telegram Mini App' },
];

function StepConnector({ index, total }) {
  return (
    <svg className="step-connector" viewBox="0 0 1 100" preserveAspectRatio="none">
      <motion.line
        x1="0.5"
        y1="0"
        x2="0.5"
        y2="100"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: index * 0.2 }}
      />
    </svg>
  );
}

function TemplateCard({ template, isActive, onClick }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`template-card ${isActive ? 'is-active' : ''}`}
      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
    >
      <span className="template-card__icon">{template.icon}</span>
      <span className="template-card__name">{template.name}</span>
      {isActive && <Check size={16} className="template-card__check" />}
    </motion.button>
  );
}

export default function HowItWorks() {
  const shouldReduceMotion = useReducedMotion();
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].name);
  const containerRef = useRef(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <section className="how-it-works" id="how-it-works" ref={containerRef}>
      <div className="how-it-works__bg" aria-hidden="true">
        <div className="how-it-works__grid" />
        <div className="how-it-works__glow how-it-works__glow--1" />
        <div className="how-it-works__glow how-it-works__glow--2" />
      </div>

      <div className="how-it-works__container">
        {/* Header Section */}
        <motion.div
          className="how-it-works__header"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <div className="how-it-works__eyebrow">
            <span className="how-it-works__eyebrow-dot" />
            QANDAY ISHLAYDI?
          </div>
          <h2 className="how-it-works__title">
            Fikrdan <span>ishlaydigan Telegram botgacha</span>
          </h2>
          <p className="how-it-works__subtitle">
            Makefy yordamida dasturlashni bilmasdan botingizni bir necha qadamda ishga tushiring.
            Barcha murakkab jarayonlarni biz o'zimiz bajaramiz.
          </p>
        </motion.div>

        {/* Main Workflow Section */}
        <motion.div
          className="how-it-works__workflow"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {/* Step 1: Template Selector */}
          <motion.div className="workflow-step" variants={itemVariants}>
            <div className="workflow-step__header">
              <div className="workflow-step__number">01</div>
              <div>
                <h3>Kerakli shablonni tanlang</h3>
                <p>Anime Bot yoki Starska Bot (Stars do'koni) shablonlaridan birini tanlang</p>
              </div>
            </div>

            <div className="workflow-step__content">
              <div className="template-selector">
                <label htmlFor="template-select" className="template-selector__label">
                  SHABLON
                </label>
                <select
                  id="template-select"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="template-selector__select"
                  aria-label="Template tanlang"
                >
                  {templates.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <div className="template-cards">
                  {templates.map((template) => (
                    <TemplateCard
                      key={template.name}
                      template={template}
                      isActive={template.name === selectedTemplate}
                      onClick={() => setSelectedTemplate(template.name)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Connector */}
            <div className="workflow-connector" aria-hidden="true">
              <svg viewBox="0 0 1 100" preserveAspectRatio="none">
                <motion.line
                  x1="0.5"
                  y1="0"
                  x2="0.5"
                  y2="100"
                  initial={shouldReduceMotion ? false : { pathLength: 0 }}
                  whileInView={shouldReduceMotion ? undefined : { pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </svg>
            </div>
          </motion.div>

          {/* Step 2: Connect Bot */}
          <motion.div className="workflow-step" variants={itemVariants}>
            <div className="workflow-step__header">
              <div className="workflow-step__number">02</div>
              <div>
                <h3>Telegram botingizni ulang</h3>
                <p>Bot tokenini kiriting va Makefy qolgan jarayonni o'zi bajaradi</p>
              </div>
            </div>

            <div className="workflow-step__content">
              <div className="bot-connection">
                <div className="bot-connection__input-group">
                  <div className="bot-connection__field-label">Bot tokeni</div>
                  <input
                    type="text"
                    placeholder="123456:ABC..."
                    className="bot-connection__input"
                    readOnly
                    value="123456:ABC..."
                  />
                  <motion.button
                    type="button"
                    className="bot-connection__button"
                    whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  >
                    Tekshirish
                    <ChevronRight size={16} />
                  </motion.button>
                </div>

                <motion.div
                  className="bot-connection__success"
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                  whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                >
                  <Check size={16} className="bot-connection__success-icon" />
                  <div>
                    <div className="bot-connection__success-title">Bot topildi</div>
                    <div className="bot-connection__success-subtitle">@makefy_store_bot</div>
                  </div>
                </motion.div>

                {/* Process Timeline */}
                <div className="process-timeline">
                  <div className="process-timeline__label">Jarayon</div>
                  <div className="process-timeline__items">
                    {progressSteps.map((step, index) => (
                      <motion.div
                        key={step}
                        className={`process-timeline__item ${index === 0 ? 'is-active' : ''}`}
                        initial={shouldReduceMotion ? false : { opacity: 0, x: -12 }}
                        whileInView={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <span className="process-timeline__number">{index + 1}</span>
                        <span className="process-timeline__text">{step}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Connector */}
            <div className="workflow-connector" aria-hidden="true">
              <svg viewBox="0 0 1 100" preserveAspectRatio="none">
                <motion.line
                  x1="0.5"
                  y1="0"
                  x2="0.5"
                  y2="100"
                  initial={shouldReduceMotion ? false : { pathLength: 0 }}
                  whileInView={shouldReduceMotion ? undefined : { pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                />
              </svg>
            </div>
          </motion.div>

          {/* Step 3: Processing */}
          <motion.div className="workflow-step" variants={itemVariants}>
            <div className="workflow-step__header">
              <div className="workflow-step__number">03</div>
              <div>
                <h3>Makefy botingizni tayyorlaydi</h3>
                <p>Murakkab texnik jarayonlarni Makefy o'zi bajaradi</p>
              </div>
            </div>

            <div className="workflow-step__content">
              <div className="processing-panel">
                {progressSteps.map((step, index) => (
                  <motion.div
                    key={step}
                    className={`processing-item ${index < 6 ? 'is-completed' : ''}`}
                    initial={shouldReduceMotion ? false : { opacity: 0, x: -12 }}
                    whileInView={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <span className="processing-item__icon">
                      {index < 6 ? <Check size={16} /> : <span>●</span>}
                    </span>
                    <span className="processing-item__text">{step}</span>
                  </motion.div>
                ))}
              </div>

              <motion.div
                className="processing-success"
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
                whileInView={shouldReduceMotion ? undefined : { opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.6 }}
              >
                <Check size={18} />
                <span>Bot tayyor!</span>
              </motion.div>
            </div>

            {/* Connector */}
            <div className="workflow-connector" aria-hidden="true">
              <svg viewBox="0 0 1 100" preserveAspectRatio="none">
                <motion.line
                  x1="0.5"
                  y1="0"
                  x2="0.5"
                  y2="100"
                  initial={shouldReduceMotion ? false : { pathLength: 0 }}
                  whileInView={shouldReduceMotion ? undefined : { pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.9 }}
                />
              </svg>
            </div>
          </motion.div>

          {/* Step 4: Dashboard */}
          <motion.div className="workflow-step" variants={itemVariants}>
            <div className="workflow-step__header">
              <div className="workflow-step__number">04</div>
              <div>
                <h3>Botingiz tayyor</h3>
                <p>Endi botingizni Makefy orqali boshqarish va kuzatishingiz mumkin</p>
              </div>
            </div>

            <div className="workflow-step__content">
              <div className="dashboard-preview">
                <div className="dashboard-preview__header">
                  <div className="dashboard-preview__title">
                    <span className="dashboard-preview__avatar">M</span>
                    <div>
                      <div className="dashboard-preview__bot-name">Makefy Store</div>
                      <div className="dashboard-preview__bot-handle">@makefy_store_bot</div>
                    </div>
                  </div>
                  <span className="dashboard-preview__status">
                    <span className="dashboard-preview__status-dot" />
                    Faol
                  </span>
                </div>

                <div className="dashboard-preview__menu">
                  {[
                    { label: 'Botni boshqarish', icon: Bot },
                    { label: 'Statistika', icon: MessageSquareText },
                    { label: 'Kontent', icon: Sparkles },
                    { label: 'Buyurtmalar', icon: WalletCards },
                  ].map(({ label, icon: Icon }) => (
                    <div key={label} className="dashboard-preview__menu-item">
                      <Icon size={18} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Minimal Process Bar */}
        <motion.div
          className="process-bar-section"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 40 }}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="process-bar">
            <div className="process-bar__step">
              <span className="process-bar__num">01</span>
              <span className="process-bar__label">Shablon</span>
            </div>
            <div className="process-bar__line" />
            <div className="process-bar__step">
              <span className="process-bar__num">02</span>
              <span className="process-bar__label">Ulash</span>
            </div>
            <div className="process-bar__line" />
            <div className="process-bar__step">
              <span className="process-bar__num">03</span>
              <span className="process-bar__label">Sozlash</span>
            </div>
            <div className="process-bar__line" />
            <div className="process-bar__step">
              <span className="process-bar__num">04</span>
              <span className="process-bar__label">Tayyor</span>
            </div>
          </div>
        </motion.div>

        {/* Before / After Section */}
        <motion.div
          className="comparison-section"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 40 }}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="comparison-panel comparison-panel--before">
            <div className="comparison-panel__label">OLDIN</div>
            <h3>Kod, server va texnik ish</h3>
            <ul className="comparison-panel__list">
              <li>Kod yozish</li>
              <li>Server sozlash</li>
              <li>Bazani ulash</li>
              <li>Botni ishga tushirish</li>
            </ul>
          </div>

          <div className="comparison-transform">
            <ArrowRight size={24} />
          </div>

          <div className="comparison-panel comparison-panel--after">
            <div className="comparison-panel__label">MAKEFY BILAN</div>
            <h3>Sodda va tezkor ish</h3>
            <ul className="comparison-panel__list comparison-panel__list--success">
              <li><Check size={18} />Shablon tanlash</li>
              <li><Check size={18} />Botni ulash</li>
              <li><Check size={18} />Sozlash</li>
              <li><Check size={18} />Tayyor</li>
            </ul>
          </div>
        </motion.div>

        {/* Testimonials Section */}
        <motion.div
          className="testimonials-section"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 40 }}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <div className="testimonials-header">
            <span className="testimonials-header__eyebrow">FOYDALANUVCHILAR FIKRI</span>
            <h3 className="testimonials-header__title">Makefy foydalanuvchilari nima deydi?</h3>
          </div>

          <div className="testimonials-carousel">
            <div className="testimonials-carousel__track">
              {[...testimonials, ...testimonials].map((testimonial, index) => (
                <motion.article
                  key={`${testimonial.name}-${index}`}
                  className="testimonial-card"
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={shouldReduceMotion ? undefined : { y: -6 }}
                >
                  <div className="testimonial-card__rating">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                  <p className="testimonial-card__quote">"{testimonial.quote}"</p>
                  <div className="testimonial-card__author">
                    <div>— {testimonial.name}</div>
                    <div className="testimonial-card__role">{testimonial.role}</div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          className="stats-section"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {statCards.map((stat) => (
            <motion.div key={stat.label} className="stat-card" variants={itemVariants}>
              <div className="stat-card__label">{stat.label}</div>
              <div className="stat-card__value">{stat.value}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
