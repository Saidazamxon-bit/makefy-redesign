import { ArrowUpRight, BarChart3, Bot, Layers3, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useI18n } from '../../i18n';
import { RevealText } from '../ui/RevealText';
import './MakefyOverview.css';

export default function MakefyOverview({ isLoggedIn = false }) {
  const { t } = useI18n();
  const steps = [
    { number: '01', icon: Layers3, title: t('landing.overview.step1.title'), text: t('landing.overview.step1.body') },
    { number: '02', icon: Bot, title: t('landing.overview.step2.title'), text: t('landing.overview.step2.body') },
    { number: '03', icon: BarChart3, title: t('landing.overview.step3.title'), text: t('landing.overview.step3.body') },
  ];
  const workspaces = [
    { icon: Bot, label: t('landing.overview.workspace.bots') },
    { icon: BarChart3, label: t('landing.overview.workspace.analytics') },
    { icon: WalletCards, label: t('landing.overview.workspace.balance') },
  ];

  return (
    <section className="mf-story" id="how-it-works" aria-labelledby="mf-story-title">
      <div className="mf-story__heading">
        <RevealText y={12} delay={0.05}>
          <span className="mf-story__eyebrow"><i /> {t('landing.overview.eyebrow')}</span>
        </RevealText>
        <RevealText y={16} delay={0.15}>
          <h2 id="mf-story-title">{t('landing.overview.title')}</h2>
        </RevealText>
        <RevealText y={16} delay={0.25}>
          <p>{t('landing.overview.description')}</p>
        </RevealText>
      </div>

      <div className="mf-story__layout">
        <ol className="mf-story__steps">
          {steps.map(({ number, icon: Icon, title, text }, idx) => (
            <motion.li
              className="mf-story__step"
              key={number}
              initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
              whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.55, delay: idx * 0.14 }}
            >
              <span className="mf-story__number">{number}</span>
              <span className="mf-story__step-icon"><Icon size={19} /></span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </motion.li>
          ))}
        </ol>

        <motion.aside
          className="mf-story__workspace"
          aria-label="Makefy boshqaruv vositalari"
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: '-30px' }}
          transition={{ duration: 0.6 }}
        >
          <div className="mf-story__workspace-head">
            <span className="mf-story__workspace-mark"><img src="/makefy-logo.png" alt="" /></span>
            <span><b>{t('landing.overview.workspaceTitle')}</b><small>{t('landing.overview.workspaceSubtitle')}</small></span>
          </div>
          <div className="mf-story__workspace-list">
            {workspaces.map(({ icon: Icon, label }) => (
              <div className="mf-story__workspace-item" key={label}>
                <span><Icon size={17} /></span>
                <b>{label}</b>
                <ArrowUpRight size={15} aria-hidden="true" />
              </div>
            ))}
          </div>
          <Link to={isLoggedIn ? '/dashboard' : '/register'} className="mf-story__cta">
            {isLoggedIn ? t('landing.dashboard') : t('landing.overview.workspaceCta')} <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </motion.aside>
      </div>
    </section>
  );
}
