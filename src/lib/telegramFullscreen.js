/**
 * Telegram Mini Apps 2.0 — to'liq ekran (Full Screen) va xavfsiz hudud (safe area).
 * - Faqat Telegram ichida va faqat telefonda (iOS/Android) to'liq ekranga o'tadi; brauzer va desktopda hech narsa o'zgarmaydi.
 * - Eski mijozlarda (Bot API < 8.0) xavfsiz tarzda expand() ga qaytadi.
 * - Foydalanuvchi o'zi to'liq ekrandan chiqsa (Telegram tugmasi), qayta majburlamaymiz.
 */
const MOBILE = ['ios', 'android', 'android_x'];

const px = (n) => `${Math.max(0, Number(n) || 0)}px`;

function syncInsets(tg) {
  const root = document.documentElement.style;
  const s = tg.safeAreaInset || {};          // qurilma: notch / Dynamic Island / home indicator
  const c = tg.contentSafeAreaInset || {};   // Telegram: yopish (✕) va ⋯ tugmalari paneli
  for (const side of ['top', 'right', 'bottom', 'left']) {
    root.setProperty(`--tg-safe-area-inset-${side}`, px(s[side]));
    root.setProperty(`--tg-content-safe-area-inset-${side}`, px(c[side]));
  }
  if (tg.viewportStableHeight) root.setProperty('--app-vh', px(tg.viewportStableHeight));
  document.documentElement.dataset.fullscreen = tg.isFullscreen ? 'true' : 'false';
}

export function initTelegramFullscreen() {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
  if (!tg || !tg.initData) return () => {};          // Telegramdan tashqarida — oddiy sayt

  try { tg.ready(); tg.expand(); } catch { /* e'tiborsiz */ }
  try { if (tg.isVersionAtLeast?.('7.7')) tg.disableVerticalSwipes?.(); } catch { /* e'tiborsiz */ }

  const canFullscreen = MOBILE.includes(tg.platform) && tg.isVersionAtLeast?.('8.0')
    && typeof tg.requestFullscreen === 'function';
  if (canFullscreen && !tg.isFullscreen) {
    try { tg.requestFullscreen(); } catch { try { tg.expand(); } catch { /* e'tiborsiz */ } }
  }

  const sync = () => syncInsets(tg);
  const onFailed = (e) => {
    // ALREADY_FULLSCREEN — xato emas; UNSUPPORTED — oddiy kengaytirilgan rejimda qolamiz
    if (e?.error !== 'ALREADY_FULLSCREEN') { try { tg.expand(); } catch { /* e'tiborsiz */ } }
    sync();
  };
  const events = ['fullscreenChanged', 'safeAreaChanged', 'contentSafeAreaChanged', 'viewportChanged'];
  events.forEach((ev) => tg.onEvent?.(ev, sync));
  tg.onEvent?.('fullscreenFailed', onFailed);
  sync();

  return () => {
    events.forEach((ev) => tg.offEvent?.(ev, sync));
    tg.offEvent?.('fullscreenFailed', onFailed);
  };
}

/** Kerak bo'lsa tugma orqali: to'liq ekran ↔ oddiy rejim */
export function toggleFullscreen() {
  const tg = window.Telegram?.WebApp;
  if (!tg?.isVersionAtLeast?.('8.0')) return;
  try { tg.isFullscreen ? tg.exitFullscreen() : tg.requestFullscreen(); } catch { /* e'tiborsiz */ }
}
