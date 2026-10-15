import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/format';
import { useI18n } from '../i18n';
import { Modal } from '../components/ui';

function StarRating({ value, count, interactive = false, onRate = null }) {
  const [hoverVal, setHoverVal] = useState(0);
  const rating = hoverVal || Math.round(value);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i
          key={i}
          className={(i <= rating ? 'fa-solid' : 'fa-regular') + ' fa-star'}
          style={{
            color: i <= rating ? '#f59e0b' : 'var(--text-dim, #64748b)',
            fontSize: interactive ? 20 : 13,
            cursor: interactive ? 'pointer' : 'default',
            transition: 'color 0.15s ease, transform 0.15s ease',
            transform: interactive && hoverVal === i ? 'scale(1.2)' : 'none',
          }}
          onMouseEnter={() => interactive && setHoverVal(i)}
          onMouseLeave={() => interactive && setHoverVal(0)}
          onClick={() => interactive && onRate && onRate(i)}
          aria-hidden="true"
        />
      ))}
      {count !== undefined && (
        <span style={{ fontSize: 12.5, color: 'var(--text-muted, #94a3b8)', marginLeft: 4, fontWeight: 500 }}>
          {value ? `${Number(value).toFixed(1)}` : '5.0'} {count ? `(${count})` : ''}
        </span>
      )}
    </div>
  );
}

export default function Market() {
  const { t } = useI18n();
  const nav = useNavigate();

  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [sort, setSort] = useState('name');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  // Modallar
  const [installModal, setInstallModal] = useState(null); // tanlangan tpl
  const [previewModal, setPreviewModal] = useState(null); // tanlangan tpl
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [note, setNote] = useState('');
  const [priceFilter, setPriceFilter] = useState('all'); // all, free, paid

  useEffect(() => {
    setLoading(true);
    const id = setTimeout(() => {
      const p = new URLSearchParams({ q, category: cat, sort });
      api.get(`/market/list.php?${p}`)
        .then((r) => {
          setData(r);
          setErr('');
        })
        .catch((e) => setErr(e.message))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(id);
  }, [q, cat, sort]);

  const closeModals = () => {
    setInstallModal(null);
    setPreviewModal(null);
    setToken('');
    setNote('');
    setErr('');
  };

  async function handleInstall(e) {
    e?.preventDefault();
    if (!token.trim() || !installModal) return;
    setBusy(true);
    setErr('');
    try {
      const r = await api.post('/create/bot_create.php', {
        nomi: installModal.slug,
        token: token.trim(),
      });
      closeModals();
      nav(`/bots/${r.botUsername || ''}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Botni o‘rnatib bo‘lmadi. Token to‘g‘riligini tekshiring.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReview() {
    if (!installModal && !previewModal) return;
    const target = installModal || previewModal;
    setBusy(true);
    setErr('');
    setNote('');
    try {
      await api.post('/market/review.php', { template: target.slug, rating: userRating });
      setNote('Bahoyingiz uchun tashakkur! ⭐');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Toifalar ro'yxati
  const categories = useMemo(() => {
    if (!data?.categories) return [];
    return ['', ...data.categories];
  }, [data]);

  // Shablonlarni narx bo'yicha filtrlash
  const filteredTemplates = useMemo(() => {
    if (!data?.templates) return [];
    return data.templates.filter((tpl) => {
      if (priceFilter === 'free') return Number(tpl.price) === 0;
      if (priceFilter === 'paid') return Number(tpl.price) > 0;
      return true;
    });
  }, [data, priceFilter]);

  const getCategoryIcon = (category) => {
    const c = String(category || '').toLowerCase();
    if (c.includes('do‘kon') || c.includes('shop') || c.includes('savdo')) return 'fa-cart-shopping';
    if (c.includes('kafe') || c.includes('restoran') || c.includes('food')) return 'fa-utensils';
    if (c.includes('ta\'lim') || c.includes('kurs') || c.includes('edu')) return 'fa-graduation-cap';
    if (c.includes('xizmat') || c.includes('service')) return 'fa-briefcase';
    if (c.includes('media') || c.includes('kanal') || c.includes('news')) return 'fa-bullhorn';
    return 'fa-shapes';
  };

  return (
    <div className="pro-market">
      {/* 1. Zamonaviy Hero Banner */}
      <section className="pro-market-hero">
        <div>
          <div className="pro-market-hero__badge">
            <i className="fa-solid fa-sparkles" />
            Makefy Botlar Bozori
          </div>
          <h1 className="pro-market-hero__title">
            Tayyor va professional Telegram botlar
          </h1>
          <p className="pro-market-hero__desc">
            Kod yozmasdan, 1 daqiqada o‘z do‘koningiz, xizmatlaringiz yoki kanalingiz uchun mos botni tanlang va ishga tushiring.
          </p>
          <div className="pro-market-hero__stats">
            <div className="pro-market-hero__stat-item">
              <span className="pro-market-hero__stat-num">{data?.templates?.length || '40'}+</span>
              <span className="pro-market-hero__stat-label">Tayyor shablonlar</span>
            </div>
            <div className="pro-market-hero__stat-item">
              <span className="pro-market-hero__stat-num">10,000+</span>
              <span className="pro-market-hero__stat-label">Faol o‘rnatilgan</span>
            </div>
            <div className="pro-market-hero__stat-item">
              <span className="pro-market-hero__stat-num">99.9%</span>
              <span className="pro-market-hero__stat-label">Barqaror ishlash</span>
            </div>
          </div>
        </div>

        <div className="pro-market-hero__actions">
          <Link to="/ai" className="pro-btn-install" style={{ padding: '0 20px', height: 44, textDecoration: 'none' }}>
            <i className="fa-solid fa-wand-magic-sparkles" />
            <span>AI bilan yaratish</span>
          </Link>
        </div>
      </section>

      {/* 2. Toolbar: Qidiruv va Saralash */}
      <div className="pro-market-toolbar">
        <div className="pro-market-search-wrap">
          <i className="fa-solid fa-magnifying-glass pro-market-search-icon" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Bot nomi, soha yoki kalit so‘z bo‘yicha qidiring…"
            className="pro-market-search-input"
          />
          {q && (
            <button type="button" onClick={() => setQ('')} className="pro-market-search-clear">
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>

        <div className="pro-market-filter-group">
          {/* Narx filtri */}
          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="pro-market-select"
            aria-label="Narx bo‘yicha filtr"
          >
            <option value="all">Barcha narxlar</option>
            <option value="free">Faqat bepul</option>
            <option value="paid">Pullik shablonlar</option>
          </select>

          {/* Tartiblash */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="pro-market-select"
            aria-label="Tartiblash"
          >
            <option value="name">Nomi bo‘yicha (A-Z)</option>
            <option value="rating">Reyting bo‘yicha ⭐</option>
            <option value="price">Narxi bo‘yicha</option>
          </select>
        </div>
      </div>

      {/* 3. Toifalar filtri (Horizontal scrollable pills) */}
      {categories.length > 1 && (
        <div className="pro-market-categories">
          {categories.map((c) => (
            <button
              key={c || 'all'}
              type="button"
              onClick={() => setCat(c)}
              className={'pro-market-cat-btn' + (cat === c ? ' is-active' : '')}
            >
              <i className={`fa-solid ${getCategoryIcon(c)}`} />
              <span>{c || 'Barchasi'}</span>
            </button>
          ))}
        </div>
      )}

      {/* Xatolik xabarnomasi */}
      {err && !installModal && !previewModal && (
        <div style={{ padding: '14px 18px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 14, color: '#f87171', fontSize: 14 }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} />
          {err}
        </div>
      )}

      {/* 4. Yuklanish indikatori */}
      {loading && !data && (
        <div className="pro-market-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="pro-market-card" style={{ height: 260, opacity: 0.5 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 18, width: '60%', background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: 8 }} />
                  <div style={{ height: 12, width: '40%', background: 'rgba(255,255,255,0.04)', borderRadius: 6 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Bo'sh natija */}
      {!loading && filteredTemplates.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', border: '1px solid var(--pro-card-border)', borderRadius: 20 }}>
          <i className="fa-solid fa-store-slash" style={{ fontSize: 44, color: 'var(--text-dim)', marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Hech qanday bot topilmadi</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 18px' }}>
            Qidiruv so‘zini o‘zgartirib ko‘ring yoki AI yordamida o‘z botingizni noldan yarating.
          </p>
          <button type="button" onClick={() => { setQ(''); setCat(''); setPriceFilter('all'); }} className="pro-btn-preview">
            Filtrlarni tozalash
          </button>
        </div>
      )}

      {/* 6. Shablonlar kartalari seti */}
      <div className="pro-market-grid">
        {filteredTemplates.map((tpl) => {
          const isFree = Number(tpl.price) === 0;
          return (
            <div key={tpl.slug} className="pro-market-card">
              <div className="pro-market-card__top">
                <span className="pro-market-card__icon" aria-hidden="true">
                  {tpl.icon || '🤖'}
                </span>
                <div className="pro-market-card__info">
                  <div className="pro-market-card__title-row">
                    <h2 className="pro-market-card__title" title={tpl.title}>{tpl.title}</h2>
                    {tpl.version && <span className="pro-market-card__version">v{tpl.version}</span>}
                  </div>
                  <div className="pro-market-card__category">{tpl.category || 'Telegram Bot'}</div>
                  <div style={{ marginTop: 4 }}>
                    <StarRating value={tpl.rating} count={tpl.ratingCount} />
                  </div>
                </div>
              </div>

              <p className="pro-market-card__desc">{tpl.description}</p>

              {/* Bot tugmalari / imkoniyatlari */}
              {Array.isArray(tpl.buttons) && tpl.buttons.length > 0 && (
                <div className="pro-market-card__tags">
                  {tpl.buttons.slice(0, 4).map((b) => (
                    <span key={b} className="pro-market-tag">
                      <i className="fa-solid fa-check" style={{ fontSize: 9, marginRight: 4, color: '#10b981' }} />
                      {b}
                    </span>
                  ))}
                  {tpl.buttons.length > 4 && (
                    <span className="pro-market-tag">+{tpl.buttons.length - 4}</span>
                  )}
                </div>
              )}

              <div className="pro-market-card__meta-bar">
                <div className={'pro-market-price-badge' + (isFree ? '' : ' is-paid')}>
                  {isFree ? 'BEPUL' : formatMoney(tpl.price)}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  <i className="fa-solid fa-download" style={{ marginRight: 4 }} />
                  {Math.floor((tpl.ratingCount || 1) * 12 + 15)} marta o‘rnatildi
                </span>
              </div>

              <div className="pro-market-card__footer">
                <button
                  type="button"
                  className="pro-btn-preview"
                  onClick={() => {
                    setPreviewModal(tpl);
                    setUserRating(5);
                    setNote('');
                  }}
                  title="Batafsil ma'lumot va sinov"
                >
                  <i className="fa-solid fa-eye" style={{ marginRight: 6 }} />
                  Ko‘rish
                </button>
                <button
                  type="button"
                  className="pro-btn-install"
                  onClick={() => {
                    setInstallModal(tpl);
                    setErr('');
                    setToken('');
                  }}
                >
                  <i className="fa-solid fa-bolt" />
                  <span>O‘rnatish</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 7. O'rnatish Modali (Install Wizard) */}
      <Modal open={!!installModal} onClose={closeModals} title={`«${installModal?.title}» botini o‘rnatish`}>
        <div className="pro-wizard-steps">
          <div className="pro-wizard-step is-active">
            <span className="pro-wizard-num">1</span>
            <span>Bot tokeni</span>
          </div>
          <i className="fa-solid fa-chevron-right" style={{ fontSize: 11, color: 'var(--text-dim)' }} />
          <div className="pro-wizard-step">
            <span className="pro-wizard-num">2</span>
            <span>Ishga tushirish</span>
          </div>
        </div>

        {/* BotFather yo'riqnomasi */}
        <div className="pro-botfather-box">
          <div className="pro-botfather-title">
            <i className="fa-brands fa-telegram" />
            Tokenni qayerdan olish mumkin?
          </div>
          <div className="pro-botfather-instruction">
            <ol>
              <li>Telegramda <b>@BotFather</b> ga o‘ting va <code>/newbot</code> yozing.</li>
              <li>Botingizga nom va oxiri «bot» bilan tugaydigan username bering.</li>
              <li>Berilgan maxfiy <b>API Token</b> nusxasini olib, pastga qo‘ying.</li>
            </ol>
          </div>
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'flex-start',
              color: '#38bdf8',
              fontSize: 12.5,
              fontWeight: 600,
              textDecoration: 'none',
              marginTop: 4,
            }}
          >
            <span>@BotFather ni ochish</span>
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 11 }} />
          </a>
        </div>

        <form onSubmit={handleInstall} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label htmlFor="install-token" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              Telegram Bot Tokeni <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="install-token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ…"
              autoComplete="off"
              spellCheck={false}
              style={{
                width: '100%',
                height: 44,
                padding: '0 14px',
                borderRadius: 12,
                background: 'var(--surface-2)',
                border: '1px solid var(--pro-card-border)',
                color: 'var(--text)',
                fontFamily: 'ui-monospace, monospace',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {err && (
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 10, color: '#f87171', fontSize: 13 }}>
              {err}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" onClick={closeModals} className="pro-btn-preview">
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={busy || !token.trim()}
              className="pro-btn-install"
              style={{ padding: '0 24px', flex: 'none', height: 42 }}
            >
              {busy ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin" />
                  <span>O‘rnatilmoqda…</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-rocket" />
                  <span>Botni ishga tushirish</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* 8. Batafsil Ko'rish Modali (Preview Modal) */}
      <Modal open={!!previewModal} onClose={closeModals} title={previewModal?.title || 'Bot haqida'}>
        {previewModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span className="pro-market-card__icon" style={{ width: 64, height: 64, fontSize: 32 }}>
                {previewModal.icon || '🤖'}
              </span>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  {previewModal.title}
                </h3>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  Toifasi: <b>{previewModal.category}</b> · Versiya: <b>v{previewModal.version}</b>
                </div>
                <div style={{ marginTop: 6 }}>
                  <StarRating value={previewModal.rating} count={previewModal.ratingCount} />
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                Tavsif va imkoniyatlar
              </h4>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                {previewModal.description}
              </p>
            </div>

            {Array.isArray(previewModal.buttons) && previewModal.buttons.length > 0 && (
              <div>
                <h4 style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  Bot tugmalari va bo‘limlari:
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {previewModal.buttons.map((btn) => (
                    <span
                      key={btn}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 10,
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        color: '#c7d2fe',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {btn}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Fikr qoldirish / baholash */}
            <div style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--pro-card-border)' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                Shablonga baho bering:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <StarRating value={userRating} interactive onRate={setUserRating} />
                <button
                  type="button"
                  onClick={handleReview}
                  disabled={busy}
                  className="pro-btn-preview"
                  style={{ height: 34, fontSize: 12.5 }}
                >
                  Baholash
                </button>
              </div>
              {note && <div style={{ fontSize: 12.5, color: '#10b981', marginTop: 8 }}>{note}</div>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={closeModals} className="pro-btn-preview">
                Yopish
              </button>
              <button
                type="button"
                className="pro-btn-install"
                style={{ padding: '0 20px', flex: 'none', height: 40 }}
                onClick={() => {
                  const target = previewModal;
                  setPreviewModal(null);
                  setInstallModal(target);
                }}
              >
                <i className="fa-solid fa-bolt" />
                <span>Hoziroq o‘rnatish</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
