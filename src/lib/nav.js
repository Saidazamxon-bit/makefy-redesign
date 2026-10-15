// Navigatsiya manbai: yon panel, pastki panel, profil menyusi va sarlavha shu ro'yxatdan oladi.
export const NAV_ITEMS = [
  { to: '/dashboard', end: true, icon: 'fa-house', labelKey: 'nav.home' },
  { to: '/bots', icon: 'fa-robot', labelKey: 'nav.bots' },
  { to: '/ai', icon: 'fa-wand-magic-sparkles', labelKey: 'nav.ai' },
  { to: '/analytics', icon: 'fa-chart-line', labelKey: 'nav.analytics' },
  { to: '/hamyon', icon: 'fa-wallet', labelKey: 'nav.wallet', also: ['/deposit', '/vazifalar', '/referal', '/tariflar'] },
  { to: '/market', icon: 'fa-store', labelKey: 'nav.market' },
  { to: '/chat', icon: 'fa-comments', labelKey: 'nav.help' },
];

export const EXTRA_TITLES = { '/sozlamalar': 'nav.settings' };

export function isItemActive(item, pathname) {
  if (item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + '/')) return true;
  return (item.also || []).some((p) => pathname.startsWith(p));
}

// Breadcrumb: [{ label, to? }] — oxirgisi joriy sahifa
export function buildCrumbs(pathname, t) {
  const item = NAV_ITEMS.find((i) => isItemActive(i, pathname));
  const extra = Object.keys(EXTRA_TITLES).find((p) => pathname.startsWith(p));
  const first = item ? { label: t(item.labelKey), to: item.to } : extra ? { label: t(EXTRA_TITLES[extra]), to: extra } : null;
  if (!first) return [];
  const bot = /^\/bots\/([^/]+)/.exec(pathname);
  if (bot) return [{ label: first.label, to: first.to }, { label: '@' + decodeURIComponent(bot[1]) }];
  return [{ label: first.label }];
}
