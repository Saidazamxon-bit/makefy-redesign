import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import uz from './uz.json';
import ru from './ru.json';
import en from './en.json';

export const LANGS = ['uz', 'ru', 'en'];
const DICTS = { uz, ru, en };
const KEY = 'mf_lang';

// Saqlangan tanlov → brauzer tili → uz. 'auto' = brauzer tili.
export function detectLang(pref, navigatorLangs = (typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [])) {
  if (LANGS.includes(pref)) return pref;
  for (const l of navigatorLangs || []) {
    const short = String(l || '').slice(0, 2).toLowerCase();
    if (LANGS.includes(short)) return short;
  }
  return 'uz';
}

export function translate(lang, key, vars) {
  let s = DICTS[lang]?.[key] ?? DICTS.uz[key] ?? key; // kalit topilmasa uz, u ham bo'lmasa kalitning o'zi (check-i18n buni ushlaydi)
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

const Ctx = createContext({ lang: 'uz', pref: 'auto', setPref: () => {}, t: (k) => k });

export function I18nProvider({ children }) {
  const [pref, setPrefState] = useState(() => { try { return localStorage.getItem(KEY) || 'auto'; } catch { return 'auto'; } });
  const lang = useMemo(() => detectLang(pref), [pref]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setPref = useCallback((p) => {
    setPrefState(p);
    try { if (p === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, p); } catch { /* maxfiy rejim */ }
  }, []);
  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);
  const value = useMemo(() => ({ lang, pref, setPref, t }), [lang, pref, setPref, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
