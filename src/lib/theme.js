const THEME_KEY = 'mf_tema';
const TELEGRAM_VARS = ['--bg','--surface','--surface-2','--surface-3','--surface-4','--border','--border-light','--accent','--accent-dim','--accent-strong','--accent-soft','--accent-text','--text','--text-muted','--text-dim','--info','--info-soft','--danger','--danger-soft'];

export function readThemePreference() {
  try { const value = localStorage.getItem(THEME_KEY); return ['system', 'light', 'dark'].includes(value) ? value : 'system'; } catch { return 'system'; }
}

export function getTelegramWebApp() { return typeof window !== 'undefined' ? window.Telegram?.WebApp || null : null; }

function validColor(value) { return typeof value === 'string' && /^#[0-9a-f]{6,8}$/i.test(value) ? value : null; }
function systemScheme() {
  const telegram = getTelegramWebApp();
  if (telegram?.colorScheme === 'dark' || telegram?.colorScheme === 'light') return telegram.colorScheme;

  // Brauzerda (Telegram tashqarisida): tizim mavzusini prefers-color-scheme
  // orqali aniqlaymiz. Agar brauzer buni umuman qo'llab-quvvatlamasa yoki
  // aniqlab bo'lmasa — standart holat sifatida TUN (dark) rejimini tanlaymiz.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    // Ikkalasi ham mos kelmadi — brauzer tizim mavzusini bildirmadi.
    return 'dark';
  } catch {
    return 'dark';
  }
}

export function resolveTheme(preference) { return preference === 'dark' || preference === 'light' ? preference : systemScheme(); }

function clearTelegramColors(root) { TELEGRAM_VARS.forEach((name) => root.style.removeProperty(name)); }

function luminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * "Tizim" rejimida Telegram fon/matn ranglarini olamiz, LEKIN:
 *  - brend ranglari (accent, info, danger) Telegram tugma rangiga almashtirilmaydi;
 *  - matn/fon kontrasti yetarli bo'lmasa (<4.5) Telegram ranglari umuman qo'llanmaydi —
 *    aks holda matn o'qilmay qoladi;
 *  - Telegram ranglari aniqlangan sxemaga (kun/tun) mos kelmasa ham qo'llanmaydi.
 */
function applyTelegramColors(root, telegram, scheme) {
  const p = telegram?.themeParams || {};
  const bg = validColor(p.bg_color);
  const text = validColor(p.text_color);
  if (!bg || !text || contrast(bg, text) < 4.5) return;
  const bgIsDark = luminance(bg) < 0.4;
  if ((scheme === 'dark') !== bgIsDark) return;
  const surface = validColor(p.secondary_bg_color) || bg;
  const surface2 = validColor(p.section_bg_color) || surface;
  const surface3 = validColor(p.header_bg_color) || surface2;
  const muted = validColor(p.hint_color);
  const border = validColor(p.section_separator_color) || muted;
  const values = { '--bg': bg, '--surface': surface, '--surface-2': surface2, '--surface-3': surface3, '--text': text };
  if (muted && contrast(bg, muted) >= 3) { values['--text-muted'] = muted; values['--text-dim'] = muted; }
  if (border) { values['--border'] = border; values['--border-light'] = border; }
  Object.entries(values).forEach(([name, value]) => root.style.setProperty(name, value));
}

/** Brauzer paneli (theme-color) va Telegram sarlavha/fon ranglarini joriy fonga moslaydi */
function syncChrome(scheme) {
  const root = document.documentElement;
  root.style.colorScheme = scheme;
  const run = () => {
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim() || (scheme === 'dark' ? '#071421' : '#f3f8f5');
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    meta.content = bg;
    const tg = getTelegramWebApp();
    if (tg && /^#[0-9a-f]{6}$/i.test(bg)) {
      try { tg.setHeaderColor?.(bg); } catch { /* eski versiya */ }
      try { tg.setBackgroundColor?.(bg); } catch { /* eski versiya */ }
      try { tg.setBottomBarColor?.(bg); } catch { /* eski versiya */ }
    }
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run); else run();
}

export function applyThemePreference(preference = readThemePreference()) {
  const root = document.documentElement;
  const scheme = resolveTheme(preference);
  root.setAttribute('data-theme', scheme);
  root.setAttribute('data-theme-preference', preference);
  clearTelegramColors(root);
  if (preference === 'system') applyTelegramColors(root, getTelegramWebApp(), scheme);
  syncChrome(scheme);
  return scheme;
}

function fadeThemeSwitch() {
  const root = document.documentElement;
  if (root.classList.contains('mf-reduced-motion')) return;
  root.classList.add('mf-theme-fade');
  setTimeout(() => root.classList.remove('mf-theme-fade'), 320);
}

export function saveThemePreference(preference) {
  fadeThemeSwitch();
  try { localStorage.setItem(THEME_KEY, preference); } catch { /* sessiya ichida ishlaydi */ }
  applyThemePreference(preference);
  window.dispatchEvent(new CustomEvent('mf:theme-preference-changed', { detail: { preference } }));
}

export function watchSystemTheme(callback) {
  const telegram = getTelegramWebApp();
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const handler = () => callback();
  media?.addEventListener?.('change', handler);
  telegram?.onEvent?.('themeChanged', handler);
  return () => { media?.removeEventListener?.('change', handler); telegram?.offEvent?.('themeChanged', handler); };
}

export function getThemeSourceLabel() {
  const telegram = getTelegramWebApp();
  return telegram?.themeParams ? 'Telegram mavzusi faol' : 'Qurilma mavzusi faol';
}

/** Boshqa oynada/tabda mavzu o'zgarsa — shu yerda ham yangilanadi */
export function watchStoredTheme(callback) {
  const handler = (e) => { if (e.key === THEME_KEY || e.key === null) callback(); };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

const MOTION_KEY = 'mf_reduced_motion';
/** Saqlangan qiymat bo'lmasa — qurilmaning "harakatlarni kamaytirish" sozlamasi */
export function readReducedMotion() {
  try {
    const v = localStorage.getItem(MOTION_KEY);
    if (v === '1' || v === '0') return v === '1';
  } catch { /* sessiya ichida ishlaydi */ }
  try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}
export function applyReducedMotion(value = readReducedMotion()) {
  document.documentElement.classList.toggle('mf-reduced-motion', !!value);
  return !!value;
}
