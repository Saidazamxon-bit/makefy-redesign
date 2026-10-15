import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [stage, setStage] = useState('login'); // login | tasdiq | done
  const [loginName, setLoginName] = useState('');
  const [kod, setKod] = useState('');
  const [yangiParol, setYangiParol] = useState('');
  const [yangiParol2, setYangiParol2] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submitLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/forgot_password.php', { action: 'kod_yubor', login: loginName.trim() });
      setMessage(data.message);
      setStage(data.stage === 'tasdiq' ? 'tasdiq' : 'login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/forgot_password.php', { action: 'qayta_yubor' });
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  }

  async function submitVerify(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot_password.php', {
        action: 'tasdiqla',
        kod: kod.trim(),
        yangi_parol: yangiParol,
        yangi_parol2: yangiParol2,
      });
      setStage('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mf-auth-page min-h-screen flex items-center justify-center px-5 bg-bg">
      <div className="w-full max-w-sm bg-surface border border-border rounded-[var(--radius-xl)] p-6 shadow-[var(--shadow-card)]">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-accent-soft text-accent flex items-center justify-center text-2xl">
            <i className="fa-solid fa-key" />
          </div>
          <h2 className="text-lg font-extrabold">Parolni tiklash</h2>
          <p className="text-sm text-text-muted mt-1">
            {stage === 'login' && "Login kiriting — tasdiqlash kodi Telegram botga yuboriladi"}
            {stage === 'tasdiq' && 'Botga kelgan 6 xonali kodni va yangi parolni kiriting'}
            {stage === 'done' && 'Parolingiz muvaffaqiyatli yangilandi'}
          </p>
        </div>

        {error && (
          <div className="text-[13px] font-semibold text-danger bg-danger-soft rounded-[var(--radius-sm)] px-3 py-2 mb-4">
            {error}
          </div>
        )}
        {message && stage !== 'done' && (
          <div className="text-[13px] font-semibold text-accent bg-accent-soft rounded-[var(--radius-sm)] px-3 py-2 mb-4">
            {message}
          </div>
        )}

        {stage === 'login' && (
          <form onSubmit={submitLogin} className="space-y-4">
            <input
              type="text"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              placeholder="Login"
              autoFocus
              className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-surface-2 border border-border text-[15px] outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-[var(--radius-md)] bg-[var(--mf-brand)] text-[var(--mf-on-brand)] font-extrabold disabled:opacity-60"
            >
              {loading ? 'Yuborilmoqda...' : 'Kod yuborish'}
            </button>
          </form>
        )}

        {stage === 'tasdiq' && (
          <form onSubmit={submitVerify} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              value={kod}
              onChange={(e) => setKod(e.target.value)}
              placeholder="6 xonali kod"
              autoFocus
              className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-surface-2 border border-border text-[15px] outline-none focus:border-accent text-center tracking-[6px] font-bold"
            />
            <input
              type="password"
              value={yangiParol}
              onChange={(e) => setYangiParol(e.target.value)}
              placeholder="Yangi parol (kamida 8 belgi, harf+raqam)"
              className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-surface-2 border border-border text-[15px] outline-none focus:border-accent"
            />
            <input
              type="password"
              value={yangiParol2}
              onChange={(e) => setYangiParol2(e.target.value)}
              placeholder="Yangi parolni takrorlang"
              className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-surface-2 border border-border text-[15px] outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-[var(--radius-md)] bg-[var(--mf-brand)] text-[var(--mf-on-brand)] font-extrabold disabled:opacity-60"
            >
              {loading ? 'Tekshirilmoqda...' : 'Parolni yangilash'}
            </button>
            <button
              type="button"
              onClick={resend}
              disabled={loading}
              className="w-full text-[13px] font-bold text-accent-dim"
            >
              Kodni qayta yuborish
            </button>
          </form>
        )}

        {stage === 'done' && (
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 rounded-[var(--radius-md)] bg-[var(--mf-brand)] text-[var(--mf-on-brand)] font-extrabold"
          >
            Kirish sahifasiga o'tish
          </button>
        )}

        {stage !== 'done' && (
          <div className="text-center mt-4">
            <Link to="/login" className="text-[12.5px] font-bold text-text-muted">
              ← Kirish sahifasiga qaytish
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
