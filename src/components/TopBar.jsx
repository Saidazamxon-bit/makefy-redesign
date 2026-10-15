import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext.jsx';
import { formatMoney } from '../lib/format';
import { NAV_ITEMS, buildCrumbs } from '../lib/nav';
import BrandLogo from './BrandLogo';
import NotificationBell from './NotificationBell';
import Avatar from './Avatar';
import { useI18n } from '../i18n';

function Crumbs({ items }) {
  if (!items.length) return null;
  return (
    <nav aria-label="breadcrumb" className="sh-top__crumbs">
      <ol className="mf-crumbs">
        {items.map((c, i) => (
          <li key={i}>{c.to && i < items.length - 1 ? <NavLink to={c.to}>{c.label}</NavLink> : <span aria-current="page">{c.label}</span>}</li>
        ))}
      </ol>
    </nav>
  );
}

export default function TopBar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const tarif = user?.tarif && user.tarif !== 'oddiy' ? user.tarif : null;
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  async function handleLogout() { await logout(); navigate('/login'); }
  const close = () => setOpen(false);

  return (
    <header className="sh-top">
      <div className="sh-top__left">
        <Link to="/dashboard" className="sh-top__brand" aria-label={t('shell.home')}>
          <BrandLogo />
          <span className="sh-top__tagline" aria-hidden="true">Telegram automation</span>
        </Link>
        <Crumbs items={buildCrumbs(pathname, t)} />
      </div>

      <div className="sh-top__right">
        <button type="button" className="mf-iconbtn" onClick={() => window.dispatchEvent(new Event('mf:palette'))} aria-label={t('palette.open')} title={t('palette.open')}>
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
        </button>
        <button type="button" className="mf-iconbtn" onClick={toggleTheme} aria-label={isDark ? t('shell.themeLight') : t('shell.themeDark')} title={isDark ? t('shell.themeLight') : t('shell.themeDark')}>
          <i className={'fa-solid ' + (isDark ? 'fa-sun' : 'fa-moon')} aria-hidden="true" />
        </button>
        <NotificationBell />
        {user?.is_demo && (
          <span className="sh-pill" style={{ color: '#12d884', borderColor: 'rgba(18,216,132,0.35)', background: 'rgba(18,216,132,0.1)', padding: '0 8px', fontSize: 12 }} title="Demo hisobdasiz">
            <i className="fa-solid fa-flask" aria-hidden="true" /> Demo
          </span>
        )}
        {tarif && <Link to="/tariflar" className="sh-pill sh-pill--plan sh-top__plan"><i className="fa-solid fa-crown" aria-hidden="true" />{tarif}</Link>}
        <Link to="/deposit" className="sh-pill" aria-label={t('shell.topup')} style={{ whiteSpace: 'nowrap' }}>
          <i className="fa-solid fa-wallet" aria-hidden="true" />
          <span>{formatMoney(user?.pul ?? 0)}</span>
          <i className="fa-solid fa-chevron-down" style={{ fontSize: 10 }} aria-hidden="true" />
        </Link>

        <div className="sh-profile" ref={ref}>
          <button type="button" className="sh-profile__btn" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label={t('shell.profileMenu')}>
            <Avatar uid={user?.user_id} name={user?.ism} size={36} />
          </button>
          {open && (
            <div className="mf-menu" role="menu">
              <div className="sh-profile__head">
                <Avatar uid={user?.user_id} name={user?.ism} size={40} />
                <div>
                  <div className="sh-profile__name">{user?.ism}</div>
                  <div className="sh-profile__id">ID: {user?.foydalanuvchi_id || '—'}</div>
                </div>
              </div>
              <div className="mf-menu__sep" />
              <Link role="menuitem" to="/profil" onClick={close} className="mf-menu__item"><i className="fa-solid fa-user" aria-hidden="true" />{t('shell.account')}</Link>
              <div className="sh-profile__mobile">
                {NAV_ITEMS.filter((i) => !['/dashboard', '/bots', '/hamyon'].includes(i.to)).map((i) => (
                  <Link role="menuitem" key={i.to} to={i.to} onClick={close} className="mf-menu__item"><i className={'fa-solid ' + i.icon} aria-hidden="true" />{t(i.labelKey)}</Link>
                ))}
              </div>
              <Link role="menuitem" to="/tariflar" onClick={close} className="mf-menu__item"><i className="fa-solid fa-crown" aria-hidden="true" />{t('shell.plans')}</Link>
              <Link role="menuitem" to="/sozlamalar" onClick={close} className="mf-menu__item"><i className="fa-solid fa-gear" aria-hidden="true" />{t('nav.settings')}</Link>
              <div className="mf-menu__sep" />
              <button type="button" role="menuitem" onClick={handleLogout} className="mf-menu__item mf-menu__item--danger"><i className="fa-solid fa-right-from-bracket" aria-hidden="true" />{t('common.logout')}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
