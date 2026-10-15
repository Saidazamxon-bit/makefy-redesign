import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, MessageCircle, Send } from 'lucide-react';
import BrandLogo from './BrandLogo';

const platformLinks = [
  { label: 'Boshlash', targetId: 'home', route: '/' },
  { label: 'Bot turlari', targetId: 'bot-types', route: '/' },
  { label: 'Narxlar', targetId: 'pricing', route: '/' },
  { label: 'Qanday ishlaydi', targetId: 'how-it-works', route: '/' },
];

const helpLinks = [
  { label: 'Savol-javob', targetId: 'faq', route: '/' },
  { label: 'Yordam markazi', targetId: 'support', route: '/' },
  { label: 'Support', targetId: 'support', route: '/' },
];

const companyLinks = [
  { label: 'Biz haqimizda', targetId: 'about', route: '/' },
  { label: 'Maxfiylik siyosati', route: '/sozlamalar' },
  { label: 'Foydalanish shartlari', route: '/tariflar' },
];

function scrollToFooterTarget(targetId) {
  if (!targetId) return false;
  const element = document.getElementById(targetId);

  if (!element) return false;

  const top = element.getBoundingClientRect().top + window.scrollY - 82;
  window.scrollTo({ top, behavior: 'smooth' });
  const hash = `#${targetId}`;
  if (window.location.hash !== hash) {
    window.history.pushState(null, '', hash);
  }

  return true;
}

function FooterColumn({ title, links, navigateTo, locationPathname }) {
  return (
    <div className="makefy-footer__column">
      <h3>{title}</h3>
      <ul>
        {links.map((link) => {
          const isInternalTarget = Boolean(link.targetId);

          const handleClick = (event) => {
            if (!isInternalTarget) return;
            event.preventDefault();

            const samePage = link.route === locationPathname || (!link.route || link.route === '/');
            if (samePage) {
              scrollToFooterTarget(link.targetId);
              return;
            }

            navigateTo(link.route || '/');
            setTimeout(() => scrollToFooterTarget(link.targetId), 180);
          };

          if (link.route && !isInternalTarget) {
            return (
              <li key={link.label}>
                <Link to={link.route}>{link.label}</Link>
              </li>
            );
          }

          return (
            <li key={link.label}>
              <a href={link.targetId ? `#${link.targetId}` : link.route} onClick={handleClick}>
                {link.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SocialButton({ href, label, Icon, external = false, targetId = null, navigateTo, locationPathname }) {
  const commonProps = {
    className: 'makefy-footer__social',
    'aria-label': label,
    title: label,
  };

  if (external) {
    return (
      <a {...commonProps} href={href} target="_blank" rel="noreferrer">
        <Icon size={18} />
      </a>
    );
  }

  const handleClick = (event) => {
    if (!targetId) return;
    event.preventDefault();
    const samePage = locationPathname === '/' || locationPathname === '';
    if (samePage) {
      scrollToFooterTarget(targetId);
      return;
    }
    navigateTo('/');
    setTimeout(() => scrollToFooterTarget(targetId), 180);
  };

  return (
    <a {...commonProps} href={targetId ? `#${targetId}` : href} onClick={handleClick}>
      <Icon size={18} />
    </a>
  );
}

export default function Footer() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <footer className="makefy-footer" aria-label="Makefy footer">
      <div className="makefy-footer__inner">
        <div className="makefy-footer__grid">
          <div className="makefy-footer__brand-block">
            <Link to="/" className="makefy-footer__brand-link" aria-label="Makefy bosh sahifa">
              <BrandLogo className="makefy-footer__brand-logo" />
            </Link>

            <p className="makefy-footer__description">
              Telegram botlarni kod yozmasdan yaratish, boshqarish va rivojlantirish uchun zamonaviy platforma.
            </p>

            <div className="makefy-footer__socials">
              <SocialButton href="https://t.me/Makefybot/app" label="Makefy Telegram" Icon={Send} external />
              <SocialButton href="mailto:hello@makefy.uz" label="Makefy email" Icon={Mail} external />
              <SocialButton href="#support" label="Makefy support" Icon={MessageCircle} targetId="support" navigateTo={navigate} locationPathname={pathname} />
            </div>
          </div>

          <FooterColumn title="PLATFORMA" links={platformLinks} navigateTo={navigate} locationPathname={pathname} />
          <FooterColumn title="YORDAM" links={helpLinks} navigateTo={navigate} locationPathname={pathname} />
          <FooterColumn title="KOMPANIYA" links={companyLinks} navigateTo={navigate} locationPathname={pathname} />
        </div>
      </div>

      <div className="makefy-footer__bottom">
        <div className="makefy-footer__divider" />
        <p>© 2026 Makefy. Barcha huquqlar himoyalangan.</p>
      </div>
    </footer>
  );
}
