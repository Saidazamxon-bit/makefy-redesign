import { NavLink, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import { NAV_ITEMS, isItemActive } from '../lib/nav';

const cls = (active) => 'sh-bottom__item' + (active ? ' is-active' : '');
const byTo = (to) => NAV_ITEMS.find((i) => i.to === to);

export default function BottomNav() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const items = ['/dashboard', '/bots'].map(byTo);
  const wallet = byTo('/hamyon');
  return (
    <nav className="sh-bottom" aria-label={t('shell.mainNav')}>
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} className={cls(isItemActive(it, pathname))} aria-current={isItemActive(it, pathname) ? 'page' : undefined}>
          <i className={'fa-solid ' + it.icon} aria-hidden="true" /><span>{t(it.labelKey)}</span>
        </NavLink>
      ))}
      <NavLink to="/create" className="sh-bottom__create" aria-label={t('shell.newBotShort')}>
        <span><i className="fa-solid fa-plus" aria-hidden="true" /></span>
        <small>{t('shell.newBotShort')}</small>
      </NavLink>
      <NavLink to={wallet.to} className={cls(isItemActive(wallet, pathname))}>
        <i className={'fa-solid ' + wallet.icon} aria-hidden="true" /><span>{t(wallet.labelKey)}</span>
      </NavLink>
      <NavLink to="/profil" className={cls(pathname.startsWith('/profil'))}>
        <i className="fa-solid fa-user" aria-hidden="true" /><span>{t('shell.account')}</span>
      </NavLink>
    </nav>
  );
}
