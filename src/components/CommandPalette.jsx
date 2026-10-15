import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useI18n } from '../i18n';
import { useTheme } from '../context/ThemeContext';
import { Modal } from './ui';

const PAGES = [
  ['/dashboard', 'nav.home', 'fa-house'], ['/bots', 'nav.bots', 'fa-robot'], ['/ai', 'nav.ai', 'fa-wand-magic-sparkles'], ['/profil', 'nav.profile', 'fa-user'], ['/analytics', 'nav.analytics', 'fa-chart-line'], ['/market', 'nav.market', 'fa-store'],
  ['/tariflar', 'nav.plans', 'fa-crown'], ['/sozlamalar', 'nav.settings', 'fa-gear'],
];

// Ctrl/Cmd+K: sahifalar, botlar, amallar. Klaviatura: ↑↓ Enter Esc.
export default function CommandPalette({ open, onClose }) {
  const { t, lang, setPref } = useI18n();
  const { toggleTheme } = useTheme();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [bots, setBots] = useState([]);
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQ(''); setIdx(0);
    api.get('/mybots/list.php?filtr=all').then((r) => setBots(Array.isArray(r?.bots) ? r.bots : [])).catch(() => setBots([]));
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const items = useMemo(() => {
    const go = (to) => () => { nav(to); onClose(); };
    const nextLang = { uz: 'ru', ru: 'en', en: 'uz' }[lang];
    const all = [
      ...PAGES.map(([to, key, icon]) => ({ id: to, group: 'pages', label: t(key), icon, run: go(to) })),
      ...bots.map((b) => ({ id: 'bot-' + (b.useri || b.username), group: 'bots', label: '@' + (b.useri || b.username), icon: 'fa-robot', run: go(`/bots/${b.useri || b.username}`) })),
      { id: 'a-new', group: 'actions', label: t('palette.action.newBot'), icon: 'fa-plus', run: go('/market') },
      { id: 'a-dep', group: 'actions', label: t('palette.action.deposit'), icon: 'fa-wallet', run: go('/deposit') },
      { id: 'a-theme', group: 'actions', label: t('palette.action.theme'), icon: 'fa-circle-half-stroke', run: () => { toggleTheme(); onClose(); } },
      { id: 'a-lang', group: 'actions', label: `${t('palette.action.lang')} → ${nextLang.toUpperCase()}`, icon: 'fa-language', run: () => { setPref(nextLang); onClose(); } },
    ];
    const s = q.trim().toLowerCase();
    return s ? all.filter((i) => i.label.toLowerCase().includes(s)) : all;
  }, [q, bots, lang, t, nav, onClose, toggleTheme, setPref]);

  useEffect(() => { setIdx(0); }, [q]);

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' && items[idx]) { e.preventDefault(); items[idx].run(); }
  }

  let lastGroup = '';
  return (
    <Modal open={open} onClose={onClose} title={t('palette.title')} labelledBy="palette-title">
      <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} role="combobox" aria-expanded="true" aria-controls="palette-list"
        aria-activedescendant={items[idx] ? 'pal-' + items[idx].id : undefined} placeholder={t('palette.placeholder')} aria-label={t('palette.title')}
        className="w-full min-h-[44px] px-3.5 rounded-[12px] bg-surface-2 border border-border text-sm outline-none focus:border-accent" />
      <ul id="palette-list" role="listbox" className="mt-3 max-h-[50vh] overflow-y-auto">
        {items.length === 0 && <li className="py-6 text-center text-[13px] text-text-muted">{t('palette.empty')}</li>}
        {items.map((it, i) => {
          const head = it.group !== lastGroup ? (lastGroup = it.group, <li key={'h' + it.group} role="presentation" className="px-2 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-text-dim">{t('palette.group.' + it.group)}</li>) : null;
          return [head, (
            <li key={it.id} id={'pal-' + it.id} role="option" aria-selected={i === idx} onMouseEnter={() => setIdx(i)} onClick={it.run}
              className={'flex items-center gap-3 px-3 min-h-[44px] rounded-[12px] cursor-pointer text-sm ' + (i === idx ? 'bg-accent-soft' : '')}>
              <i className={'fa-solid w-5 text-center ' + it.icon} aria-hidden="true" /> {it.label}
            </li>)];
        })}
      </ul>
      <p className="mt-3 text-[12px] text-text-dim">{t('palette.hint')}</p>
    </Modal>
  );
}
