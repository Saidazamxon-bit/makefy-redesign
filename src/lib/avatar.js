// Avatar sozlamasi (rang + ixtiyoriy emoji). Faqat shu brauzerda, foydalanuvchi ID bo'yicha saqlanadi.
import { useCallback, useEffect, useState } from 'react';

export const AVATAR_COLORS = [
  ['#12d884', '#0aab63'], ['#4a67c7', '#2f4aa8'], ['#d94d57', '#b3333d'], ['#bf7b19', '#8f5a0e'],
  ['#8b5cf6', '#6d3fd8'], ['#0ea5e9', '#0678ab'], ['#ec4899', '#be2b78'], ['#334155', '#0f172a'],
];
export const AVATAR_EMOJI = ['', '🤖', '🚀', '⚡', '🦊', '🐼', '🎯', '🔥', '🌙', '💎', '🎮', '🧠'];

const keyOf = (uid) => 'mf_avatar:' + String(uid || 'guest');

export function readAvatar(uid) {
  try {
    const v = JSON.parse(localStorage.getItem(keyOf(uid)) || 'null');
    const c = Number.isInteger(v?.c) && v.c >= 0 && v.c < AVATAR_COLORS.length ? v.c : 0;
    const e = typeof v?.e === 'string' && AVATAR_EMOJI.includes(v.e) ? v.e : '';
    return { c, e };
  } catch { return { c: 0, e: '' }; }
}

export function useAvatar(uid) {
  const [av, setAv] = useState(() => readAvatar(uid));
  useEffect(() => {
    setAv(readAvatar(uid));
    const on = () => setAv(readAvatar(uid));
    window.addEventListener('mf:avatar', on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener('mf:avatar', on); window.removeEventListener('storage', on); };
  }, [uid]);
  const save = useCallback((next) => {
    const v = { c: next.c, e: next.e };
    try { localStorage.setItem(keyOf(uid), JSON.stringify(v)); } catch { /* xotira yopiq bo'lsa sessiyada qoladi */ }
    setAv(v);
    window.dispatchEvent(new Event('mf:avatar'));
  }, [uid]);
  return [av, save];
}
