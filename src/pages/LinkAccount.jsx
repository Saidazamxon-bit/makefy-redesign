import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { api, ApiError } from '../lib/api';
import './Login.css';

/**
 * /link?code=123456 — botdagi «Google bilan ulash» tugmasi shu sahifaga olib keladi.
 * Foydalanuvchi Google bilan kiradi, so'ng kod avtomatik tasdiqlanadi va
 * Telegram akkaunti shu Google hisobga ulanadi.
 */
export default function LinkAccount() {
  const [params] = useSearchParams();
  const code = (params.get('code') || '').replace(/\D/g, '');
  const { status, authError, loginWithGoogle, refresh } = useAuth();
  const navigate = useNavigate();
  const [phase, setPhase] = useState('idle'); // idle | working | done | error
  const [message, setMessage] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (status !== 'user' || code.length !== 6 || startedRef.current) return;
    startedRef.current = true;
    setPhase('working');
    api.post('/auth/link_confirm.php', { code })
      .then(async () => {
        await refresh();
        setPhase('done');
      })
      .catch((err) => {
        setMessage(err instanceof ApiError ? err.message : 'Ulashda xatolik yuz berdi.');
        setPhase('error');
      });
  }, [status, code, refresh]);

  async function handleGoogle(credential) {
    if (!credential) return;
    setGoogleBusy(true);
    await loginWithGoogle(credential);
    setGoogleBusy(false);
  }

  let body;
  if (code.length !== 6) {
    body = <p className="makefy-auth__subtitle">Havola noto‘g‘ri. Botda «Sozlamalar → Google hisob → Google bilan ulash» tugmasini qayta bosing.</p>;
  } else if (status === 'loading' || phase === 'working') {
    body = <p className="makefy-auth__subtitle">Telegram akkaunti ulanmoqda…</p>;
  } else if (phase === 'done') {
    body = (
      <>
        <p className="makefy-auth__subtitle">✅ Telegram akkauntingiz Google hisobga ulandi. Botga qaytishingiz mumkin.</p>
        <button type="button" className="makefy-auth__button" onClick={() => navigate('/dashboard', { replace: true })}>
          Dashboardga o‘tish
        </button>
      </>
    );
  } else if (phase === 'error') {
    body = (
      <>
        <div className="makefy-auth-error">{message}</div>
        <Link to="/dashboard" className="makefy-auth-link">Dashboardga o‘tish</Link>
      </>
    );
  } else {
    body = (
      <>
        <p className="makefy-auth__subtitle">Telegram akkauntingizni ulash uchun Google hisobingiz bilan kiring.</p>
        {authError && <div className="makefy-auth-error">{authError}</div>}
        <div className="makefy-auth-provider">
          <GoogleSignInButton onCredential={handleGoogle} disabled={googleBusy} />
        </div>
      </>
    );
  }

  return (
    <main className="makefy-auth-page">
      <div className="makefy-auth-shell">
        <section className="makefy-auth-card makefy-auth__container" aria-label="Telegram ulash">
          <div className="makefy-auth-card__header">
            <h1 className="makefy-auth__title">Telegram ulash</h1>
          </div>
          {body}
        </section>
      </div>
    </main>
  );
}
