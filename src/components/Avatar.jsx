import { AVATAR_COLORS, useAvatar } from '../lib/avatar';

// Foydalanuvchi avatari: tanlangan rang gradienti + emoji yoki ismning birinchi harfi.
export default function Avatar({ uid, name = '', size = 40, className = '' }) {
  const [av] = useAvatar(uid);
  const [a, b] = AVATAR_COLORS[av.c] || AVATAR_COLORS[0];
  const letter = (name || 'M').trim().slice(0, 1).toUpperCase();
  return (
    <span
      className={'pf-avatar ' + className}
      style={{ width: size, height: size, fontSize: Math.round(size * (av.e ? 0.5 : 0.42)), background: `linear-gradient(135deg, ${a}, ${b})` }}
      aria-hidden="true"
    >
      {av.e || letter}
    </span>
  );
}
