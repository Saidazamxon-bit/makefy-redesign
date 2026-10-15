import { Link, NavLink, Outlet, useMatch, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import BrandLogo from './BrandLogo';
import CommandPalette from './CommandPalette';
import NameModal from './NameModal';
import TermsModal from './TermsModal';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import ErrorBoundary from './ErrorBoundary';
import { NAV_ITEMS, isItemActive } from '../lib/nav';

const COMPACT_KEY = 'mf_sidebar_compact';
const readCompact = () => { try { return localStorage.getItem(COMPACT_KEY) === '1'; } catch { return false; } };

// Bitta bot uchun ish maydoni tablari (har bir /bots/:username/... sahifasi tepasida)
function BotTabs() {
  const m = useMatch('/bots/:username/*');
  const { t } = useI18n();
  const u = m?.params?.username;
  if (!u) return null;
  const tabs = [['', t('bot.tabControl'), 'fa-gauge'], ['/kunlik', t('bot.tabBilling'), 'fa-hourglass-half']];
  return (
    <nav className="sh-bottabs" aria-label={'@' + u}>
      <Link to="/bots" className="sh-bottabs__back" aria-label={t('bot.backToList')}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></Link>
      <b className="sh-bottabs__name">@{u}</b>
      <div className="sh-bottabs__tabs">
        {tabs.map(([p, label, icon]) => (
          <NavLink key={p} to={`/bots/${u}${p}`} end className={({ isActive }) => 'sh-bottabs__tab' + (isActive ? ' is-active' : '')}>
            <i className={'fa-solid ' + icon} aria-hidden="true" />{label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default function Layout() {
  const { t } = useI18n();
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const [palette, setPalette] = useState(false);
  const [compact, setCompact] = useState(readCompact);

  useEffect(() => {
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((v) => !v); } };
    const onOpen = () => setPalette(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('mf:palette', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mf:palette', onOpen); };
  }, []);

  function toggleCompact() {
    setCompact((v) => { const n = !v; try { localStorage.setItem(COMPACT_KEY, n ? '1' : '0'); } catch { /* ixtiyoriy */ } return n; });
  }

  return (
    <div className="sh" data-compact={compact}>
      <NameModal />
      <TermsModal />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[80] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-surface focus:text-text focus:shadow-lg">{t('shell.skip')}</a>

      <aside className="sh-side" aria-label={t('nav.menu')}>
        <div className="sh-side__brand">
          <Link to="/dashboard" aria-label={t('shell.home')}><BrandLogo /></Link>
          <button type="button" className="mf-iconbtn" onClick={toggleCompact} aria-pressed={compact} aria-label={compact ? t('shell.expand') : t('shell.collapse')} title={compact ? t('shell.expand') : t('shell.collapse')}>
            <i className={'fa-solid ' + (compact ? 'fa-angles-right' : 'fa-angles-left')} aria-hidden="true" />
          </button>
        </div>

        <div className="sh-side__caption">{t('shell.workspace')}</div>
        <nav className="sh-nav" aria-label={t('shell.mainNav')}>
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(item, pathname);
            return (
              <NavLink key={item.to} to={item.to} end={item.end} title={compact ? t(item.labelKey) : undefined}
                className={'sh-nav__item' + (active ? ' is-active' : '')} aria-current={active ? 'page' : undefined}>
                <i className={'fa-solid ' + item.icon} aria-hidden="true" /><span>{t(item.labelKey)}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sh-side__spacer" />
        <div className="sh-cta">
          <b>{t('shell.newBot')}</b>
          <small>{t('shell.newBotHint')}</small>
          <Link to="/create" className="mf-btn mf-btn--primary mf-btn--sm" aria-label={t('shell.newBotShort')}><i className="fa-solid fa-plus" aria-hidden="true" /><span>{t('shell.start')}</span></Link>
        </div>
        <NavLink to="/sozlamalar" title={compact ? t('nav.settings') : undefined} className={({ isActive }) => 'sh-nav__item' + (isActive ? ' is-active' : '')}>
          <i className="fa-solid fa-gear" aria-hidden="true" /><span>{t('nav.settings')}</span>
        </NavLink>
      </aside>

      <div className="sh-col">
        <TopBar />
        <main className="sh-main" id="main" tabIndex={-1}>
          <BotTabs />
          <ErrorBoundary inline key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <BottomNav />
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
