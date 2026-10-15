import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext.jsx';
import BrandLogo from './BrandLogo';
import { useI18n } from '../i18n';

const NAV_ITEMS = [
  { to: '/admin', end: true, icon: 'fa-gauge-high', label: 'Panel' },
  { to: '/admin/sorovlar', icon: 'fa-paper-plane', label: "So'rovlar" },
  { to: '/admin/chat', icon: 'fa-message', label: 'Chat' },
  { to: '/admin/rozilik', icon: 'fa-file-signature', label: 'Rozilik' },
  { to: '/admin/bot-tariflar', icon: 'fa-layer-group', label: 'Bot tariflari' },
  { to: '/admin/tariflar', icon: 'fa-crown', label: 'Umumiy tarif (chegirma)' },
  { to: '/admin/promokodlar', icon: 'fa-ticket', label: 'Promo' },
  { to: '/admin/kanallar', icon: 'fa-money-bill-trend-up', label: 'Kanallar' },
  { to: '/admin/turlar', icon: 'fa-shapes', label: 'Turlar' },
];

export default function AdminLayout() {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  async function handleLogout() { await logout(); navigate('/login'); }

  return (
    <div className="sh" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <div className="sh-col">
        <header className="sh-top">
          <div className="sh-top__left">
            <BrandLogo />
            <span className="sh-admin__badge">Admin</span>
          </div>
          <div className="sh-top__right">
            <button type="button" className="mf-iconbtn" onClick={toggleTheme} aria-label={isDark ? t('shell.themeLight') : t('shell.themeDark')}>
              <i className={'fa-solid ' + (isDark ? 'fa-sun' : 'fa-moon')} aria-hidden="true" />
            </button>
            <button type="button" className="mf-btn mf-btn--ghost mf-btn--sm" onClick={handleLogout}>
              <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />{t('common.logout')}
            </button>
          </div>
        </header>
        <main className="sh-main" id="main" tabIndex={-1} style={{ paddingBottom: 48 }}>
          <div className="sh-admin">
            <nav className="sh-admin__nav sh-nav" aria-label="Admin">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => 'sh-nav__item' + (isActive ? ' is-active' : '')}>
                  <i className={'fa-solid ' + item.icon} aria-hidden="true" />{item.label}
                </NavLink>
              ))}
            </nav>
            <div className="sh-admin__body"><Outlet /></div>
          </div>
        </main>
      </div>
    </div>
  );
}
