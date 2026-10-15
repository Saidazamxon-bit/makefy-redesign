import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import './Login.css';

const statusCopy = {
  not_registered: {
    tone: 'warning',
    title: 'Botda hisobingiz hali faollashmagan',
    text: 'Telegram’da Makefy botini ochib, /start tugmasini bosing. Keyin bu sahifadan davom eting.',
  },
  web_client: {
    tone: 'warning',
    title: 'Telegram Web sessiyasi qabul qilinmaydi',
    text: 'Telefon yoki desktop Telegram ilovasida oching — yoki Google hisobingiz bilan davom eting.',
  },
  no_telegram: {
    tone: 'neutral',
    title: 'Telegram ichida yoki Google bilan kiring',
    text: 'Telegram botini ochib, keyin bu sahifani ishlatishingiz mumkin. Alternativ — Google orqali kirish.',
  },
};

const GOOGLE_VISIBLE_STATUSES = ['no_telegram', 'web_client', 'not_registered'];

export default function Login() {
  const { status, authError, loginWithGoogle, loginWithPassword } = useAuth();
  const navigate = useNavigate();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [emailPass, setEmailPass] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    if (status === 'user') navigate('/dashboard', { replace: true });
    if (status === 'admin') navigate('/admin', { replace: true });
  }, [status, navigate]);

  async function handleGoogleCredential(credential) {
    if (!credential) return;
    setGoogleBusy(true);
    const ok = await loginWithGoogle(credential);
    setGoogleBusy(false);
    if (ok) navigate('/dashboard', { replace: true });
  }

  async function handleEmailSubmit(event) {
    event.preventDefault();
    setEmailError('');
    const email = emailValue.trim();
    if (!email || !emailPass) {
      setEmailError('Email va parolni kiriting.');
      return;
    }
    setEmailLoading(true);
    try {
      const ok = await loginWithPassword(email, emailPass);
      if (ok) navigate('/dashboard', { replace: true });
    } finally {
      setEmailLoading(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="makefy-auth-loader">
        <div className="makefy-loader" />
        <span>Makefy tayyorlanmoqda...</span>
      </div>
    );
  }

  const notice = statusCopy[status] || statusCopy.no_telegram;

  return (
    <main className="makefy-auth-page">
      <div className="makefy-auth-shell">
        <Link to="/" className="makefy-brand makefy-auth-brand" aria-label="Home">
          <img
            src="/makefy-logo.png"
            alt=""
            className="makefy-brand__mark"
            onError={(event) => {
              if (event.currentTarget.src.endsWith('/makefy-logo.png')) {
                event.currentTarget.src = '/makerbot-logo.png';
              }
            }}
          />
          <span className="makefy-brand__name">makefy<span>.</span></span>
        </Link>

        <section className="makefy-auth-card makefy-auth__container" aria-label="Kirish sahifasi">
          <div className="makefy-auth-card__header">
            <h1 className="makefy-auth__title">Kirish</h1>
            <p className="makefy-auth__subtitle">Makefy hisobingizga kiring va botlaringizni boshqaring.</p>
          </div>

          {authError && <div className="makefy-auth-error">{authError}</div>}

          <form className="makefy-auth-form" onSubmit={handleEmailSubmit} autoComplete="on">
            <label className="makefy-auth-field">
              <span className="makefy-auth-field__label">Email</span>
              <input
                className="makefy-auth__input"
                type="email"
                value={emailValue}
                onChange={(event) => setEmailValue(event.target.value)}
                placeholder="email@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="makefy-auth-field">
              <span className="makefy-auth-field__label">Parol</span>
              <input
                className="makefy-auth__input"
                type="password"
                value={emailPass}
                onChange={(event) => setEmailPass(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </label>

            <div className="makefy-auth-form__meta">
              <Link to="/forgot-password" className="makefy-auth-link">Parolni unutdingizmi?</Link>
            </div>

            {emailError && <div className="makefy-auth-form__error">{emailError}</div>}

            <button type="submit" className="makefy-auth__button" disabled={emailLoading}>
              {emailLoading ? 'Yuborilmoqda...' : 'Kirish'}
            </button>
          </form>

          <div className="makefy-auth-switch makefy-auth__footer">
            <span>Makefy hisobingiz yo‘qmi?</span>
            <Link to="/register">Ro‘yxatdan o‘tish</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
