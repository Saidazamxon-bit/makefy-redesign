import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/format';
import { useToast } from '../components/ui';
import { useI18n } from '../i18n';

const PROGRESS_STAGES = [
  { p: 15, t: 'Token tekshirilmoqda...' },
  { p: 35, t: 'Bot Telegram serverida aniqlanmoqda...' },
  { p: 55, t: 'Bot shabloni tayyorlanmoqda...' },
  { p: 75, t: 'Ichki fayllar va webhook o‘rnatilmoqda...' },
  { p: 90, t: 'Ma’lumotlar bazasiga yozilmoqda...' },
  { p: 100, t: 'Muvaffaqiyatli yakunlandi!' },
];

function readableError(error, fallback = 'Xatolik yuz berdi. Qayta urinib ko‘ring.') {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code === 'UNAUTHENTICATED') return 'Sessiya tugagan. Qayta kiring.';
  if (error.code === 'FETCH_FAILED' || error.status >= 500) {
    return 'Serverda vaqtinchalik muammo. Bir ozdan keyin qayta urinib ko‘ring.';
  }
  if (error.code === 'BAD_RESPONSE') {
    return 'Server noto‘g‘ri javob qaytardi. Qayta urinib ko‘ring.';
  }
  return error.message || fallback;
}

export default function Create() {
  const { t } = useI18n();
  const [tab, setTab] = useState('shablon'); // shablon | maxsus
  const [selected, setSelected] = useState(null); // tanlangan shablon slug

  return (
    <div className="pro-market" style={{ paddingBottom: 60 }}>
      {/* 1. Yuqori Hero Banner */}
      <section className="pro-market-hero">
        <div>
          <div className="pro-market-hero__badge">
            <i className="fa-solid fa-wand-magic-sparkles" />
            {t('create.badge')}
          </div>
          <h1 className="pro-market-hero__title">
            {t('create.title')}
          </h1>
          <p className="pro-market-hero__desc">
            {t('create.subtitle')}
          </p>
          <div className="pro-market-hero__stats">
            <div className="pro-market-hero__stat-item">
              <span className="pro-market-hero__stat-num">{t('create.stat1.val')}</span>
              <span className="pro-market-hero__stat-label">{t('create.stat1.lbl')}</span>
            </div>
            <div className="pro-market-hero__stat-item">
              <span className="pro-market-hero__stat-num">{t('create.stat2.val')}</span>
              <span className="pro-market-hero__stat-label">{t('create.stat2.lbl')}</span>
            </div>
            <div className="pro-market-hero__stat-item">
              <span className="pro-market-hero__stat-num">{t('create.stat3.val')}</span>
              <span className="pro-market-hero__stat-label">{t('create.stat3.lbl')}</span>
            </div>
          </div>
        </div>

        <div className="pro-market-hero__actions">
          <Link
            to="/ai"
            className="pro-btn-install"
            style={{ padding: '0 20px', height: 44, textDecoration: 'none' }}
          >
            <i className="fa-solid fa-wand-magic-sparkles" />
            <span>{t('mybots.emptyCreateAi')}</span>
          </Link>
        </div>
      </section>

      {/* 2. Rejim Tanlash Tablari */}
      {!selected && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setTab('shablon')}
            className={`pro-market-cat-btn ${tab === 'shablon' ? 'is-active' : ''}`}
            style={{ padding: '10px 18px', fontSize: 13.5 }}
          >
            <i className="fa-solid fa-clone" />
            <span>{t('create.tab.templates')}</span>
          </button>
          <Link
            to="/ai"
            className="pro-market-cat-btn"
            style={{ padding: '10px 18px', fontSize: 13.5, textDecoration: 'none' }}
          >
            <i className="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--accent)' }} />
            <span>{t('create.tab.ai')}</span>
          </Link>
          <button
            type="button"
            onClick={() => setTab('maxsus')}
            className={`pro-market-cat-btn ${tab === 'maxsus' ? 'is-active' : ''}`}
            style={{ padding: '10px 18px', fontSize: 13.5 }}
          >
            <i className="fa-solid fa-paper-plane" />
            <span>{t('create.tab.custom')}</span>
          </button>
        </div>
      )}

      {/* 3. Asosiy Tanlangan Bo'lim */}
      {tab === 'shablon' ? (
        selected ? (
          <TemplateFlow slug={selected} onBack={() => setSelected(null)} />
        ) : (
          <TemplatePicker onSelect={setSelected} />
        )
      ) : (
        <CustomRequestForm onBack={() => setTab('shablon')} />
      )}
    </div>
  );
}

// ============================================================
// 1) Shablonlar tanlagich: Qidiruv + Kategoriya + Kartalar
// ============================================================
function TemplatePicker({ onSelect }) {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('__hammasi__');

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.get('/create/templates.php');
      setData({
        categories: Array.isArray(result.categories) ? result.categories : [],
        templates: Array.isArray(result.templates) ? result.templates : [],
      });
    } catch (err) {
      setError(readableError(err, 'Shablonlarni yuklab bo‘lmadi.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const filtered = useMemo(() => {
    if (!data?.templates) return [];
    const q = query.trim().toLowerCase();
    return data.templates.filter((item) => {
      if (!item) return false;
      const title = String(item.title || item.name || item.nomi || '').toLowerCase();
      const desc = String(item.description || item.izoh || '').toLowerCase();
      const cat = String(item.category || item.turi || '');
      const matchQuery = !q || title.includes(q) || desc.includes(q);
      const matchCat = category === '__hammasi__' || cat === category;
      return matchQuery && matchCat;
    });
  }, [data, query, category]);

  if (loading) {
    return (
      <div className="pro-market-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="pro-market-card" style={{ height: 240, opacity: 0.5 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: 'var(--surface-2)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 18, width: '60%', background: 'var(--surface-2)', borderRadius: 6, marginBottom: 8 }} />
                <div style={{ height: 12, width: '40%', background: 'var(--surface-2)', borderRadius: 6 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--border)' }}>
        <i className="fa-solid fa-circle-exclamation" style={{ fontSize: 36, color: '#f87171', marginBottom: 12 }} />
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{t('common.error') || 'Xatolik'}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{error}</p>
        <button type="button" onClick={loadTemplates} className="pro-btn-install" style={{ padding: '0 20px', height: 38 }}>
          {t('home.refresh') || 'Qayta urinish'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Qidiruv Toolbar */}
      <div className="pro-market-toolbar">
        <div className="pro-market-search-wrap">
          <i className="fa-solid fa-magnifying-glass pro-market-search-icon" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('home.search') || 'Botni qidirish…'}
            className="pro-market-search-input"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="pro-market-search-clear">
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>
      </div>

      {/* Kategoriya pills */}
      {data?.categories && data.categories.length > 0 && (
        <div className="pro-market-categories">
          <button
            type="button"
            onClick={() => setCategory('__hammasi__')}
            className={`pro-market-cat-btn ${category === '__hammasi__' ? 'is-active' : ''}`}
          >
            <i className="fa-solid fa-shapes" />
            <span>{t('home.filter.all')} ({data.templates.length})</span>
          </button>
          {data.categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`pro-market-cat-btn ${category === c ? 'is-active' : ''}`}
            >
              <span>{c}</span>
            </button>
          ))}
        </div>
      )}

      {/* Shablonlar Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--border)' }}>
          <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 32, color: 'var(--text-dim)', marginBottom: 10 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{t('home.noMatch')}</h3>
        </div>
      ) : (
        <div className="pro-market-grid">
          {filtered.map((item) => {
            const isFree = Number(item.price) === 0;
            return (
              <div key={item.slug} className="pro-market-card">
                <div className="pro-market-card__top">
                  <span className="pro-market-card__icon" aria-hidden="true">
                    {item.icon || '🤖'}
                  </span>
                  <div className="pro-market-card__info">
                    <h2 className="pro-market-card__title">{item.title}</h2>
                    <div className="pro-market-card__category">{item.category || 'Telegram Bot'}</div>
                    <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginTop: 4 }}>
                      <i className="fa-solid fa-gift" style={{ marginRight: 4 }} />
                      {t('create.freeTrial')}
                    </div>
                  </div>
                </div>

                <p className="pro-market-card__desc">
                  {item.description}
                </p>

                <div className="pro-market-card__meta-bar">
                  <div className={'pro-market-price-badge' + (isFree ? '' : ' is-paid')}>
                    {isFree ? 'BEPUL' : `${formatMoney(item.price)}`}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    Makefy Kafolati
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onSelect(item.slug)}
                  className="pro-btn-install"
                  style={{ width: '100%', height: 42 }}
                >
                  <i className="fa-solid fa-bolt" />
                  <span>{t('create.installBtn')}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 2) Tanlangan shablonni ishga tushirish (Template Flow)
// ============================================================
function TemplateFlow({ slug, onBack }) {
  const { t } = useI18n();
  const [step, setStep] = useState('token'); // token | progress | result
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [progress, setProgress] = useState({ pct: 0, label: 'Boshlanmoqda...' });
  const [result, setResult] = useState(null);
  const nav = useNavigate();

  const loadDetail = useCallback(async () => {
    setDetail(null);
    setError('');
    try {
      setDetail(await api.get(`/create/template_detail.php?nomi=${encodeURIComponent(slug)}`));
    } catch (err) {
      setError(readableError(err, 'Shablon ma’lumotlarini yuklab bo‘lmadi.'));
    }
  }, [slug]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  function startCreation() {
    if (!token.trim()) {
      alert('Iltimos, @BotFather dan olingan tokenni kiriting!');
      return;
    }
    setStep('progress');
    setProgress({ pct: 0, label: 'Boshlanmoqda...' });

    let i = 0;
    let done = false;
    const tick = () => {
      if (done || i >= PROGRESS_STAGES.length) return;
      const s = PROGRESS_STAGES[i++];
      setProgress({ pct: s.p, label: s.t });
      setTimeout(tick, 450);
    };
    tick();

    api
      .post('/create/bot_create.php', { nomi: slug, token: token.trim() })
      .then((data) => {
        done = true;
        setProgress({ pct: 100, label: 'Tayyor!' });
        setTimeout(() => {
          setResult({
            ok: true,
            botUsername: data.botUsername,
            panels: data.panels,
            adminLogin: data.adminLogin,
            adminPassword: data.adminPassword,
          });
          setStep('result');
        }, 350);
      })
      .catch((err) => {
        done = true;
        setProgress({ pct: 100, label: 'Xatolik yuz berdi' });
        setTimeout(() => {
          setResult({ ok: false, error: readableError(err) });
          setStep('result');
        }, 350);
      });
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
      {/* Orqaga tugmasi */}
      <button
        type="button"
        onClick={onBack}
        className="pro-btn-preview"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, marginBottom: 18 }}
      >
        <i className="fa-solid fa-arrow-left" />
        <span>{t('create.tab.templates')}</span>
      </button>

      {/* Shablon ma'lumoti kartasi */}
      {detail && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 22, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span className="pro-market-card__icon" style={{ width: 56, height: 56, fontSize: 28 }}>
              {detail.icon || '🤖'}
            </span>
            <div>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{detail.title}</h2>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                {t('mybots.category')} <b>{detail.category}</b> · Narxi: <b>{Number(detail.price) > 0 ? formatMoney(detail.price) : 'Bepul'}</b>
              </div>
            </div>
          </div>
          {detail.description && (
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 14, marginBottom: 0 }}>
              {detail.description}
            </p>
          )}
        </div>
      )}

      {/* Bosqich: 1. Token kiritish */}
      {step === 'token' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 22 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fa-solid fa-key" style={{ color: 'var(--accent)' }} />
            {t('create.wizard.title')}
          </h3>

          {/* BotFather yo'riqnomasi */}
          <div className="pro-botfather-box" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div className="pro-botfather-title" style={{ fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <i className="fa-brands fa-telegram" style={{ color: '#24A1DE' }} />
              {t('create.wizard.step1')}
            </div>
            <div className="pro-botfather-instruction" style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <ol style={{ paddingLeft: 18, margin: '6px 0' }}>
                <li>Telegramda rasmiy <b>@BotFather</b> ga kiring va <code>/newbot</code> buyrug‘ini bering.</li>
                <li>Botingizga istalgan nom va <b>«bot»</b> bilan tugaydigan username tanlang.</li>
                <li>BotFather bergan API tokenni nusxalab, pastdagi maydonga joylang.</li>
              </ol>
            </div>
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontSize: 13, fontWeight: 600, textDecoration: 'none', alignSelf: 'flex-start', marginTop: 6 }}
            >
              <span>Telegramda @BotFather ni ochish</span>
              <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 11 }} />
            </a>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label htmlFor="bot-token" style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              {t('create.wizard.step2')} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="bot-token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t('create.wizard.tokenPlaceholder')}
              spellCheck={false}
              autoComplete="off"
              style={{
                width: '100%',
                height: 46,
                padding: '0 14px',
                borderRadius: 12,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontFamily: 'monospace',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          <button
            type="button"
            onClick={startCreation}
            disabled={!token.trim()}
            className="pro-btn-install"
            style={{ width: '100%', height: 46, fontSize: 15 }}
          >
            <i className="fa-solid fa-rocket" />
            <span>{t('create.wizard.startInstall')}</span>
          </button>
        </div>
      )}

      {/* Bosqich: 2. O'rnatish jarayoni (Progress) */}
      {step === 'progress' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 40, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-soft, rgba(16, 185, 129, 0.15))', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 18px' }}>
            <i className="fa-solid fa-circle-notch fa-spin" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            {progress.label}
          </h3>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 20 }}>
            {t('kunlik.paying')}
          </p>

          <div style={{ width: '100%', maxWidth: 400, height: 8, background: 'var(--surface-2)', borderRadius: 9999, overflow: 'hidden', margin: '0 auto' }}>
            <div
              style={{
                height: '100%',
                width: `${progress.pct}%`,
                background: 'var(--accent)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
            {progress.pct}%
          </div>
        </div>
      )}

      {/* Bosqich: 3. Natija (Result) */}
      {step === 'result' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 30, textAlign: 'center' }}>
          {result?.ok ? (
            <div>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-soft, rgba(16, 185, 129, 0.15))', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>
                <i className="fa-solid fa-circle-check" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
                Botingiz muvaffaqiyatli ishga tushdi! 🎉
              </h2>
              <a
                href={`https://t.me/${result.botUsername}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}
              >
                @{result.botUsername}
              </a>

              {/* Admin ma'lumotlari */}
              {result.adminLogin && (
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, maxWidth: 360, margin: '0 auto 20px', textAlign: 'left' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Admin Panel Ma’lumotlari:
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>
                    Login: <b>{result.adminLogin}</b>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>
                    Parol: <b>{result.adminPassword}</b>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <a
                  href={`https://t.me/${result.botUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="pro-btn-install"
                  style={{ padding: '0 24px', height: 42, textDecoration: 'none' }}
                >
                  <i className="fa-brands fa-telegram" />
                  <span>{t('mybots.action.openTelegram')}</span>
                </a>
                <button
                  type="button"
                  onClick={() => nav(`/bots/${result.botUsername}`)}
                  className="pro-btn-preview"
                  style={{ height: 42, padding: '0 20px' }}
                >
                  <i className="fa-solid fa-sliders" />
                  <span>{t('mybots.action.manage')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
                Botni ishga tushirishda xatolik
              </h2>
              <p style={{ fontSize: 14, color: '#f87171', maxWidth: 440, margin: '0 auto 20px' }}>
                {result?.error || 'Token noto‘g‘ri yoki allaqachon boshqa botga ulangan.'}
              </p>
              <button
                type="button"
                onClick={() => setStep('token')}
                className="pro-btn-install"
                style={{ padding: '0 24px', height: 40 }}
              >
                {t('home.refresh') || 'Qayta urinish'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 3) Maxsus Buyurtma Formasi (Custom Request)
// ============================================================
function CustomRequestForm({ onBack }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [nomi, setNomi] = useState('');
  const [soha, setSoha] = useState('');
  const [talablar, setTalablar] = useState('');
  const [aloqa, setAloqa] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!nomi.trim() || !talablar.trim()) return;
    setBusy(true);
    try {
      await api.post('/create/custom_request.php', { nomi, soha, talablar, aloqa });
      setSent(true);
      toast(t('create.custom.sent'));
    } catch (err) {
      toast(readableError(err, 'Yuborib bo‘lmadi.'), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 540, margin: '0 auto' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-soft, rgba(16, 185, 129, 0.15))', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>
          <i className="fa-solid fa-check" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
          {t('create.custom.sent')}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
          {t('create.custom.desc')}
        </p>
        <button type="button" onClick={onBack} className="pro-btn-install" style={{ padding: '0 24px', height: 40 }}>
          {t('common.back') || 'Ortga'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 26, maxWidth: 650, margin: '0 auto', width: '100%' }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
        {t('create.custom.title')}
      </h2>
      <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 20 }}>
        {t('create.custom.desc')}
      </p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor="custom-nomi" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            {t('create.custom.name')} <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            id="custom-nomi"
            value={nomi}
            onChange={(e) => setNomi(e.target.value)}
            placeholder="Masalan: Avtosalon yoki Klinika boti"
            required
            className="pro-market-search-input"
          />
        </div>

        <div>
          <label htmlFor="custom-soha" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            Faoliyat sohasi
          </label>
          <input
            id="custom-soha"
            value={soha}
            onChange={(e) => setSoha(e.target.value)}
            placeholder="Tibbiyot, Savdo, Xizmatlar, Ta’lim…"
            className="pro-market-search-input"
          />
        </div>

        <div>
          <label htmlFor="custom-talablar" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            {t('create.custom.details')} <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            id="custom-talablar"
            value={talablar}
            onChange={(e) => setTalablar(e.target.value)}
            rows={4}
            placeholder="Qanday tugmalar bo‘lishi, nimalarni hisoblashi, qanday xizmatlar bilan ulanishi kerakligi haqida batafsil yozing…"
            required
            style={{
              width: '100%',
              borderRadius: 12,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              padding: '12px 14px',
              color: 'var(--text)',
              fontSize: 14,
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label htmlFor="custom-aloqa" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            {t('create.custom.contact')}
          </label>
          <input
            id="custom-aloqa"
            value={aloqa}
            onChange={(e) => setAloqa(e.target.value)}
            placeholder="@username yoki +998 90 123 45 67"
            className="pro-market-search-input"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={onBack} className="pro-btn-preview">
            {t('common.cancel') || 'Bekor qilish'}
          </button>
          <button
            type="submit"
            disabled={busy || !nomi.trim() || !talablar.trim()}
            className="pro-btn-install"
            style={{ padding: '0 24px', height: 42 }}
          >
            {busy ? 'Yuborilmoqda…' : t('create.custom.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
