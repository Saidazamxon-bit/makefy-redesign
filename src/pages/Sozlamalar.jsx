import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api, ApiError } from '../lib/api';
import { applyReducedMotion, readReducedMotion } from '../lib/theme';
import { useI18n } from '../i18n';
import Avatar from '../components/Avatar';
import { formatMoney } from '../lib/format';
import { useToast } from '../components/ui';

const THEME_OPTIONS = [
  { value: 'system', icon: 'fa-circle-half-stroke', label: 'Tizim', sub: 'Qurilma sozlamasi' },
  { value: 'light', icon: 'fa-sun', label: 'Kunduzgi', sub: 'Yorug‘ mavzu' },
  { value: 'dark', icon: 'fa-moon', label: 'Tungi', sub: 'To‘q qora mavzu' },
];

const LANG_OPTIONS = [
  { code: 'auto', label: 'Avtomatik', flag: '🌐', sub: 'Brauzer tili' },
  { code: 'uz', label: 'O‘zbekcha', flag: '🇺🇿', sub: 'Lotin alifbosi' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺', sub: 'Русский язык' },
  { code: 'en', label: 'English', flag: '🇬🇧', sub: 'International' },
];

export default function Sozlamalar() {
  const { user, logout } = useAuth();
  const { preference, setPreference, resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const { t, pref: langPref, setPref: setLangPref } = useI18n();
  const { toast } = useToast();

  const [notifBots, setNotifBots] = useState(() => readLocal('mf_bildirishnoma', '1') !== '0');
  const [notifSound, setNotifSound] = useState(() => readLocal('mf_sound_alerts', '1') !== '0');
  const [reducedMotion, setReducedMotion] = useState(() => readReducedMotion());
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    applyReducedMotion(reducedMotion);
    try {
      localStorage.setItem('mf_bildirishnoma', notifBots ? '1' : '0');
      localStorage.setItem('mf_sound_alerts', notifSound ? '1' : '0');
      localStorage.setItem('mf_reduced_motion', reducedMotion ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [notifBots, notifSound, reducedMotion]);

  async function handleLogout() {
    if (!window.confirm('Haqiqatan ham hisobingizdan chiqmoqchimisiz?')) return;
    await logout();
    navigate('/login');
  }

  // Telegram <-> Google ulanish holati
  const [link, setLink] = useState(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkMsg, setLinkMsg] = useState('');

  const loadLink = () =>
    api.get('/auth/link_status.php')
      .then(setLink)
      .catch(() => setLink(null));

  useEffect(() => {
    loadLink();
  }, []);

  function openExternal(url) {
    const tg = window.Telegram?.WebApp;
    if (tg?.openLink) tg.openLink(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function startLink() {
    setLinkBusy(true);
    setLinkMsg('');
    try {
      const data = await api.post(
        link?.mode === 'telegram' ? '/auth/link_google_start.php' : '/auth/link_start.php',
        {}
      );
      const url = data?.url || data?.botLink;
      if (url) openExternal(url);
      else setLinkMsg('Havola olinmadi.');
    } catch (err) {
      setLinkMsg(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setLinkBusy(false);
    }
  }

  async function unlink() {
    if (!window.confirm('Hisobni uzmoqchimisiz?')) return;
    setLinkBusy(true);
    setLinkMsg('');
    try {
      await api.post('/auth/link_unlink.php', {});
      await loadLink();
      toast('Hisob ulanishi bekor qilindi');
    } catch (err) {
      setLinkMsg(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setLinkBusy(false);
    }
  }

  function copyUserId() {
    if (!user?.user_id) return;
    navigator.clipboard?.writeText(String(user.user_id));
    setCopiedId(true);
    toast('ID raqam nusxalandi: ' + user.user_id);
    setTimeout(() => setCopiedId(false), 2000);
  }

  function handleClearCache() {
    if (!window.confirm('Kesh va vaqtinchalik ma’lumotlarni tozalashni xohlaysizmi?')) return;
    try {
      sessionStorage.clear();
      toast('Kesh tozalandi. Sahifa yangilanmoqda…');
      setTimeout(() => window.location.reload(), 600);
    } catch {
      toast('Kesh tozalanmadi.');
    }
  }

  return (
    <div className="pro-settings-page">
      {/* 1. Foydalanuvchi Katta Profil Kartasi */}
      <div className="pro-profile-card">
        <div className="pro-profile-card__user">
          <div className="pro-profile-avatar-wrap">
            <Avatar uid={user?.user_id} name={user?.ism} size={64} className="pro-profile-avatar" />
            <span
              style={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid var(--surface)',
              }}
              title="Hisob faol"
            />
          </div>
          <div>
            <div className="pro-profile-name">{user?.ism || 'Makefy Foydalanuvchisi'}</div>
            <div className="pro-profile-meta">
              <span>ID:</span>
              <button
                type="button"
                onClick={copyUserId}
                className="pro-profile-id-badge"
                title="ID nusxalash"
                style={{ cursor: 'pointer', border: 'none' }}
              >
                {user?.user_id || '—'}
                <i
                  className={`fa-solid ${copiedId ? 'fa-check' : 'fa-copy'}`}
                  style={{ marginLeft: 6, fontSize: 11, color: copiedId ? '#10b981' : 'inherit' }}
                />
              </button>
              <span>·</span>
              <span>Balans: <b style={{ color: '#10b981' }}>{formatMoney(user?.pul ?? 0)}</b></span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
            <i className="fa-solid fa-shield-halved" />
            Faol & Himoyalangan
          </span>
        </div>
      </div>

      {/* 2. Sozlamalar Bo'limlari Grid */}
      <div className="pro-settings-grid">
        {/* Bo'lim 1: Ko'rinish & Mavzu */}
        <div className="pro-settings-card">
          <div className="pro-settings-card__head">
            <div className="pro-settings-card__icon">
              <i className="fa-solid fa-palette" />
            </div>
            <div>
              <h2 className="pro-settings-card__title">Ko‘rinish va Mavzu</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Interfeys ranglarini moslashtiring</div>
            </div>
          </div>

          <div className="pro-theme-grid">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPreference(opt.value)}
                className={'pro-theme-card' + (preference === opt.value ? ' is-active' : '')}
              >
                <i className={`fa-solid ${opt.icon} pro-theme-card__icon`} />
                <span className="pro-theme-card__label">{opt.label}</span>
                <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{opt.sub}</span>
              </button>
            ))}
          </div>

          <div style={{ height: 1, background: 'var(--pro-card-border)', margin: '4px 0' }} />

          {/* Smooth motion switch */}
          <ToggleRow
            icon="fa-wand-magic-sparkles"
            title="Animatsiyalarni yengillashtirish"
            desc="Kuchsizroq qurilmalar uchun harakatlarni qisqartiradi"
            checked={reducedMotion}
            onChange={setReducedMotion}
          />
        </div>

        {/* Bo'lim 2: Til va Hudud */}
        <div className="pro-settings-card">
          <div className="pro-settings-card__head">
            <div className="pro-settings-card__icon">
              <i className="fa-solid fa-language" />
            </div>
            <div>
              <h2 className="pro-settings-card__title">{t('settings.language')}</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ilova interfeysi tili</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {LANG_OPTIONS.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setLangPref(item.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  background: langPref === item.code ? 'rgba(99, 102, 241, 0.12)' : 'var(--surface-2)',
                  border: `2px solid ${langPref === item.code ? 'var(--pro-accent)' : 'var(--pro-card-border)'}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: 20 }}>{item.flag}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bo'lim 3: Bildirishnomalar va Xabarlar */}
        <div className="pro-settings-card">
          <div className="pro-settings-card__head">
            <div className="pro-settings-card__icon">
              <i className="fa-solid fa-bell" />
            </div>
            <div>
              <h2 className="pro-settings-card__title">Bildirishnomalar</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Xabarnomalar va signal parametrlari</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ToggleRow
              icon="fa-robot"
              title="Bot holati xabarnomalari"
              desc="Bot to‘xtaganda yoki faollashganda ogohlantirish"
              checked={notifBots}
              onChange={setNotifBots}
            />
            <ToggleRow
              icon="fa-volume-high"
              title="Tovushli signallar"
              desc="Yangi buyurtma yoki bot xabarlarida tovush chiqarish"
              checked={notifSound}
              onChange={setNotifSound}
            />
          </div>
        </div>

        {/* Bo'lim 4: Akkaunt va Ulanishlar */}
        <div className="pro-settings-card">
          <div className="pro-settings-card__head">
            <div className="pro-settings-card__icon">
              <i className="fa-solid fa-link" />
            </div>
            <div>
              <h2 className="pro-settings-card__title">Integratsiya va Ulanishlar</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tashqi tizimlar bilan bog‘liqlik</div>
            </div>
          </div>

          {link ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--pro-card-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <i className={`fa-brands ${link.mode === 'telegram' ? 'fa-google' : 'fa-telegram'}`} style={{ fontSize: 22, color: link.mode === 'telegram' ? '#ea4335' : '#24A1DE' }} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>
                      {link.mode === 'telegram' ? 'Google Akkaunt' : 'Telegram Akkaunt'}
                    </div>
                    <div style={{ fontSize: 12, color: link.linked ? '#10b981' : 'var(--text-muted)' }}>
                      {link.linked ? (link.label || 'Muvaffaqiyatli ulangan') : 'Hali ulanmagan'}
                    </div>
                  </div>
                </div>

                {link.linked ? (
                  <button
                    type="button"
                    disabled={linkBusy}
                    onClick={unlink}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#f87171',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Uzish
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={linkBusy}
                    onClick={startLink}
                    className="pro-btn-install"
                    style={{ height: 34, padding: '0 12px', fontSize: 12 }}
                  >
                    Ulash ↗
                  </button>
                )}
              </div>
              {linkMsg && <div style={{ fontSize: 12, color: '#f87171' }}>{linkMsg}</div>}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ulanishlar ma’lumoti yuklanmoqda…</div>
          )}
        </div>

        {/* Bo'lim 5: Xotira va Tizim */}
        <div className="pro-settings-card">
          <div className="pro-settings-card__head">
            <div className="pro-settings-card__icon">
              <i className="fa-solid fa-server" />
            </div>
            <div>
              <h2 className="pro-settings-card__title">Tizim va Xotira</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Makefy Platformasi holati</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Platforma versiyasi:</span>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>Makefy Pro v2.4.0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Server holati:</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>● Barcha xizmatlar faol</span>
            </div>

            <button
              type="button"
              onClick={handleClearCache}
              className="pro-btn-preview"
              style={{ width: '100%', height: 38, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <i className="fa-solid fa-broom" />
              <span>Kesh va ma’lumotlarni tozalash</span>
            </button>
          </div>
        </div>

        {/* Bo'lim 6: Qo'llanma & Chiqish */}
        <div className="pro-settings-card">
          <div className="pro-settings-card__head">
            <div className="pro-settings-card__icon">
              <i className="fa-solid fa-circle-question" />
            </div>
            <div>
              <h2 className="pro-settings-card__title">Yordam va Chiqish</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Qo‘llanma va akkaunt amallari</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a
              href="/Manual/"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--surface-2)',
                border: '1px solid var(--pro-card-border)',
                borderRadius: 12,
                color: 'var(--text)',
                textDecoration: 'none',
                fontSize: 13.5,
                fontWeight: 600,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fa-solid fa-book-open" style={{ color: '#818cf8' }} />
                <span>To‘liq qo‘llanmani ochish</span>
              </span>
              <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 12, color: 'var(--text-dim)' }} />
            </a>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 14px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 12,
                color: '#f87171',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <i className="fa-solid fa-right-from-bracket" />
              <span>Hisobdan chiqish</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ icon, title, desc, checked, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pro-accent)', fontSize: 14 }}>
          <i className={`fa-solid ${icon}`} />
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{desc}</div>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={'mf-switch ' + (checked ? 'is-on' : '')}
      >
        <span />
      </button>
    </div>
  );
}

function readLocal(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}
