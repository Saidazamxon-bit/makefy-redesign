import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import './Login.css';

export default function Register() {
  const { status, authError, loginWithGoogle, registerWithPassword } = useAuth();
  const navigate = useNavigate();
  const [ismValue, setIsmValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [emailPass, setEmailPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (status === 'user') navigate('/dashboard', { replace: true });
    if (status === 'admin') navigate('/admin', { replace: true });
  }, [status, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const ism = ismValue.trim().replace(/\s+/g, ' ');
    if (ism.length < 2 || ism.length > 40) {
      setError('Ism 2 dan 40 gacha belgidan iborat bo‘lishi kerak.');
      return;
    }
    const email = emailValue.trim();
    if (!email || !emailPass) {
      setError('Email va parolni kiriting.');
      return;
    }
    if (emailPass !== confirmPass) {
      setError('Parollar mos kelmadi.');
      return;
    }

    setLoading(true);
    try {
      const ok = await registerWithPassword(email, emailPass, ism);
      if (ok) navigate('/dashboard', { replace: true });
    } catch (e) {
      setError(e?.message || 'Ro\'yxatdan o\'tishda xatolik yuz berdi.');
    } finally {
      setLoading(false);
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

        <section className="makefy-auth-card makefy-auth__container" aria-label="Ro‘yxatdan o‘tish sahifasi">
          <div className="makefy-auth-card__header">
            <h1 className="makefy-auth__title">Ro‘yxatdan o‘tish</h1>
            <p className="makefy-auth__subtitle">Makefy’da hisob yarating va Telegram botingizni ishga tushiring.</p>
          </div>

          {authError && <div className="makefy-auth-error">{authError}</div>}

          <div className="makefy-auth-provider">
            <GoogleSignInButton
              label="Google orqali ro‘yxatdan o‘tish"
              loadingLabel="Google orqali ro‘yxatdan o‘tilmoqda..."
              onCredential={async (credential) => {
                if (!credential) {
                  setGoogleBusy(false);
                  return;
                }
                setGoogleBusy(true);
                const ok = await loginWithGoogle(credential);
                setGoogleBusy(false);
                if (ok) navigate('/dashboard', { replace: true });
              }}
              disabled={loading || googleBusy}
            />
          </div>

          <div className="makefy-auth-divider"><span>yoki</span></div>

          <form className="makefy-auth-form" onSubmit={handleSubmit} autoComplete="on">
            <label className="makefy-auth-field">
              <span className="makefy-auth-field__label">Ism</span>
              <input
                className="makefy-auth__input"
                type="text"
                value={ismValue}
                onChange={(event) => setIsmValue(event.target.value)}
                placeholder="Ismingiz"
                autoComplete="given-name"
                minLength={2}
                maxLength={40}
                required
              />
            </label>

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
                autoComplete="new-password"
                required
              />
            </label>

            <label className="makefy-auth-field">
              <span className="makefy-auth-field__label">Parolni tasdiqlang</span>
              <input
                className="makefy-auth__input"
                type="password"
                value={confirmPass}
                onChange={(event) => setConfirmPass(event.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </label>

            {error && <div className="makefy-auth-form__error">{error}</div>}

            <button type="submit" className="makefy-auth__button" disabled={loading}>
              {loading ? 'Yuborilmoqda...' : 'Ro‘yxatdan o‘tish'}
            </button>
          </form>

          <div className="makefy-auth-switch makefy-auth__footer">
            <span>Hisobingiz bormi?</span>
            <Link to="/login">Kirish</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
