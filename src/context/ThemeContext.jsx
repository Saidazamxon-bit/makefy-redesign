import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  readThemePreference,
  applyThemePreference,
  saveThemePreference,
  watchSystemTheme,
  watchStoredTheme,
  applyReducedMotion,
  getThemeSourceLabel,
} from '../lib/theme';

const ThemeContext = createContext(null);

/**
 * ESKI TIZIM TIKLANDI: bu context endi src/lib/theme.js'ga tayanadi —
 * u "system" (Telegram/qurilma mavzusiga qarab) / "light" / "dark" uch
 * xil tanlovni qo'llab-quvvatlaydi. Avvalgi versiyada bu context faqat
 * ikkita holat (light/dark) bilan cheklangan edi va Sozlamalar
 * sahifasidagi tanlov butunlay yo'qolgan edi.
 *
 *  - `preference`     -> foydalanuvchi tanlagan qiymat: 'system' | 'light' | 'dark'
 *  - `theme`          -> HAQIQATDA qo'llanilayotgan rang sxemasi: 'light' | 'dark'
 *                        (agar preference='system' bo'lsa, bu Telegram/qurilma
 *                        mavzusidan kelib chiqib hisoblanadi)
 *  - `setPreference()`-> Sozlamalar sahifasidagi Tizim/Kun/Tun tugmalari uchun
 *  - `toggleTheme()`  -> TopBar'dagi tezkor tugma uchun (light<->dark, "tizim"
 *                        holatidan chiqib, aniq qiymatga o'rnatadi)
 */
export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() => readThemePreference());
  const [theme, setTheme] = useState(() => applyThemePreference(preference));

  // Ilova ochilganda joriy tanlovni qo'llaymiz (Telegram ranglarini o'qish ham shu yerda)
  useEffect(() => {
    setTheme(applyThemePreference(preference));
    applyReducedMotion();   // saqlangan "harakatlarni kamaytirish" butun ilovada darrov qo'llanadi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Boshqa tab/oynada tanlov o'zgarsa — shu yerda ham yangilanadi
  useEffect(() => watchStoredTheme(() => {
    const next = readThemePreference();
    setPreferenceState(next);
    setTheme(applyThemePreference(next));
  }), []);

  // "Tizim" tanlangan bo'lsa — Telegram/qurilma mavzusi o'zgarganda kuzatib boramiz
  useEffect(() => {
    if (preference !== 'system') return undefined;
    return watchSystemTheme(() => setTheme(applyThemePreference('system')));
  }, [preference]);

  function setPreference(nextPreference) {
    if (!['system', 'light', 'dark'].includes(nextPreference)) return;
    setPreferenceState(nextPreference);
    saveThemePreference(nextPreference);
    setTheme(applyThemePreference(nextPreference));
  }

  const value = useMemo(
    () => ({
      preference,
      theme,
      resolvedTheme: theme,
      setPreference,
      setTheme: setPreference,
      toggleTheme: () => setPreference(theme === 'dark' ? 'light' : 'dark'),
      themeSourceLabel: getThemeSourceLabel(),
      isTelegram: !!window.Telegram?.WebApp?.themeParams,
    }),
    [preference, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
