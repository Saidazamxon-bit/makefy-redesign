import { Component } from 'react';
import { translate, detectLang } from '../i18n';

// Bo'sh oq ekran o'rniga tushunarli xabar + avtomatik tiklash amallari
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { failed: true, error };
  }

  componentDidCatch(error, errorInfo) {
    try {
      if (typeof window !== 'undefined') {
        window.__last_error = { error, errorInfo };
        console.error('[Makefy ErrorBoundary Caught]:', error, errorInfo);
      }
      fetch('/api/client_error.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          message: String(error?.message || error),
          stack: String(error?.stack || '').slice(0, 800),
          page: typeof window !== 'undefined' ? window.location.pathname : '',
        }),
      }).catch(() => {});
    } catch {
      /* hisobot yuborilmasa ham ilova ishlashda davom etadi */
    }
  }

  handleReset = () => {
    this.setState({ failed: false, error: null });
  };

  handleHardReset = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (!this.state.failed) return this.props.children;
    let pref = 'auto';
    try {
      pref = localStorage.getItem('mf_lang') || 'auto';
    } catch {
      /* ignore */
    }
    const lang = detectLang(pref);
    const err = this.state.error;

    return (
      <div
        role="alert"
        style={{
          minHeight: this.props.inline ? '320px' : 'var(--app-vh, 100dvh)',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          textAlign: 'center',
          background: this.props.inline ? 'transparent' : 'var(--bg, #0b0f17)',
          color: 'var(--text, #f8fafc)',
          fontFamily: 'inherit',
          width: '100%',
        }}
      >
        <div style={{ maxWidth: 480, width: '100%', margin: '0 auto' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              margin: '0 auto 16px',
            }}
          >
            <i className="fa-solid fa-triangle-exclamation" />
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'var(--text, #fff)' }}>
            {translate(lang, 'common.error.title')}
          </h2>
          <p style={{ opacity: 0.75, fontSize: 13.5, marginBottom: 20, lineHeight: 1.5 }}>
            {translate(lang, 'common.error.body')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  minHeight: 42,
                  padding: '0 20px',
                  borderRadius: 12,
                  fontWeight: 700,
                  background: '#20E992',
                  color: '#04130C',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13.5,
                }}
              >
                <i className="fa-solid fa-rotate-right" />
                <span>Qayta urinish</span>
              </button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  minHeight: 42,
                  padding: '0 18px',
                  borderRadius: 12,
                  fontWeight: 600,
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'inherit',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer',
                  fontSize: 13.5,
                }}
              >
                {translate(lang, 'common.reload')}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
              <a
                href="/dashboard"
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  color: '#38bdf8',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                ← Bosh sahifa
              </a>
              <button
                type="button"
                onClick={this.handleHardReset}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#f59e0b',
                  fontSize: 13,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontWeight: 600,
                }}
                title="Kesh va vaqtinchalik ma'lumotlarni tozalab yangilaydi"
              >
                Ma’lumotlarni tiklash & Qayta yuklash 🔄
              </button>
            </div>
          </div>

          {err && (
            <details
              style={{
                marginTop: 14,
                textAlign: 'left',
                background: 'rgba(0,0,0,0.3)',
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 12,
                opacity: 0.85,
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--text-muted, #94a3b8)' }}>
                Texnik xatolik tafsiloti
              </summary>
              <pre
                style={{
                  marginTop: 8,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                  color: '#f87171',
                  maxHeight: 180,
                  overflowY: 'auto',
                }}
              >
                {String(err?.message || err)}
                {err?.stack ? '\n' + String(err.stack).slice(0, 500) : ''}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
