import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setCsrfToken, ApiError } from '../lib/api';

const AuthContext = createContext(null);

// Telegram Web (brauzer versiyasi: web.telegram.org) shu platform
// qiymatlarini beradi — bularga ruxsat berilmaydi, faqat native
// ilova (Android/iOS/macOS/Desktop) orqali ochilganda ishlaydi.
const WEB_PLATFORMS = ['web', 'weba', 'webk'];

function getTelegramWebApp() {
  return window.Telegram?.WebApp || null;
}

export function AuthProvider({ children }) {
  // loading | guest | user | admin | no_telegram | web_client | not_registered
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');

  const refresh = useCallback(async ({ boot = false } = {}) => {
    const data = await api.get('/auth/me.php');
    setCsrfToken(data.csrfToken);
    if (!data.authenticated) {
      // Boshlang'ich yuklashda 'guest'ga o'tmaymiz: Telegram avto-kirish
      // tugaguncha 'loading' turadi (aks holda tanishuv sahifasi chaqnab ketadi).
      if (!boot) setStatus('guest');
      setUser(null);
    } else if (data.role === 'admin') {
      setStatus('admin');
      setUser(null);
    } else {
      setStatus('user');
      setUser(data.user);
    }
    return data;
  }, []);

  // Ilova faqat Telegram'ning NATIVE ilovasi ichida ishlaydi — login/parol
  // o'rniga Telegram.WebApp.initData avtomatik yuboriladi va serverda
  // tekshiriladi. Telegram Web (brauzer versiyasi) ataylab bloklanadi.
  const loginWithTelegram = useCallback(async () => {
    const tg = getTelegramWebApp();
    const initData = tg?.initData || '';
    const platform = tg?.platform || '';

    if (WEB_PLATFORMS.includes(platform)) {
      setStatus('web_client');
      return;
    }
    if (!initData) {
      setStatus('no_telegram');
      return;
    }
    try {
      await api.post('/auth/telegram.php', { initData });
      await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NOT_REGISTERED') {
        setStatus('not_registered');
      } else {
        setAuthError(err instanceof ApiError ? err.message : 'Kirishda xatolik yuz berdi.');
        setStatus('no_telegram');
      }
    }
  }, [refresh]);

  // Saytga brauzerdan (Telegram tashqarisida) kirgan foydalanuvchi uchun —
  // Google Identity Services'dan olingan ID tokenni (`credential`) backendga
  // yuboradi. Hisob mavjud bo'lmasa, backend uni AVTOMATIK yaratadi — alohida
  // "ro'yxatdan o'tish" qadami shart emas.
  const loginWithGoogle = useCallback(async (credential) => {
    setAuthError('');
    try {
      await api.post('/auth/google.php', { credential });
      await refresh();
      return true;
    } catch (err) {
      setAuthError(err instanceof ApiError ? err.message : 'Google orqali kirishda xatolik yuz berdi.');
      return false;
    }
  }, [refresh]);

  // Brauzerdan email + parol bilan kirish. Xatolikni o'zi `authError`ga
  // yozadi va false qaytaradi — chaqiruvchi komponent shu holatni ko'rsatadi.
  const loginWithPassword = useCallback(async (login, pass) => {
    setAuthError('');
    try {
      await api.post('/auth/login.php', { login, pass });
      await refresh();
      return true;
    } catch (err) {
      setAuthError(err instanceof ApiError ? err.message : 'Kirishda xatolik yuz berdi.');
      return false;
    }
  }, [refresh]);

  // Brauzerdan email + parol bilan YANGI hisob ochish. Muvaffaqiyatli bo'lsa
  // foydalanuvchi avtomatik tizimga kiritiladi (alohida "kirish" qadami shart emas).
  const registerWithPassword = useCallback(async (email, password, ism) => {
    setAuthError('');
    try {
      await api.post('/auth/register.php', { email, password, ism });
      await refresh();
      return true;
    } catch (err) {
      setAuthError(err instanceof ApiError ? err.message : 'Ro\'yxatdan o\'tishda xatolik yuz berdi.');
      return false;
    }
  }, [refresh]);

  // Google/Email orqali kirgan hisobga Telegram akkauntini ulash uchun
  // bir martalik kod so'raydi (10 daqiqa amal qiladi).
  const linkTelegramStart = useCallback(async () => {
    try {
      const data = await api.post('/auth/link_start.php', {});
      return data;
    } catch (err) {
      return { ok: false, error: err instanceof ApiError ? err.message : 'Xatolik yuz berdi.' };
    }
  }, []);

  // Ismni saqlash (birinchi kirishda majburiy, keyin Profil → Sozlamalar'dan o'zgartiriladi)
  const saveName = useCallback(async (ism) => {
    try {
      await api.post('/profile/name.php', { ism });
      await refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof ApiError ? err.message : 'Ismni saqlab bo‘lmadi.' };
    }
  }, [refresh]);

  // Foydalanish shartlariga rozilik («Roziman» tugmasi). Server sana, IP va qurilmani qayd etadi.
  const acceptTerms = useCallback(async (version) => {
    try {
      await api.post('/profile/terms.php', { accept: true, version });
      await refresh();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof ApiError ? err.message : 'Rozilikni saqlab bo‘lmadi.' };
    }
  }, [refresh]);

  useEffect(() => {
    (async () => {
      try {
        const data = await refresh({ boot: true });
        if (!data.authenticated) {
          await loginWithTelegram();
        }
      } catch {
        await loginWithTelegram();
      }
    })();
    // Faqat ilk yuklanishda ishga tushadi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout.php').catch(() => {});
    setStatus('guest');
    setUser(null);
  }, []);

  const updateBalance = useCallback((newBalance) => {
    setUser((u) => (u ? { ...u, pul: newBalance } : u));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        isDemo: false,
        authError,
        logout,
        refresh,
        updateBalance,
        loginWithTelegram,
        loginWithGoogle,
        loginWithPassword,
        registerWithPassword,
        linkTelegramStart,
        saveName,
        acceptTerms,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider ichida ishlatilishi kerak');
  return ctx;
}
