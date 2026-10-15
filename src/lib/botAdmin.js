import { api } from './api';

// Bot admin paneli: backend bir martalik/60 daqiqalik TOKEN yaratadi, havola shu (frontend) domenida ochiladi:
//   https://<frontend>/api/bot/<bot>/admin?t=<token>   — brauzerda ham, Telegram ichida ham ishlaydi.
export async function openBotAdmin(bot) {
  const tg = window.Telegram?.WebApp;
  const inTelegram = Boolean(tg?.initData);
  // Popup bloklanmasligi uchun oyna so'rov tugashidan OLDIN ochiladi (Telegram ichida kerak emas)
  const w = inTelegram ? null : window.open('about:blank', '_blank');
  try {
    const data = await api.post('/bots/admin_link.php', { bot });
    const url = window.location.origin + data.path;
    if (inTelegram && typeof tg.openLink === 'function') tg.openLink(url);
    else if (w) w.location.href = url;
    else window.location.href = url;
  } catch (err) {
    if (w) w.close();
    window.alert(err?.message || 'Admin havolasini olib bo‘lmadi.');
  }
}
