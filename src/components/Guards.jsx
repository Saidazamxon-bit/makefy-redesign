import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function FullScreenLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-bg text-text-muted">
      <span className="w-9 h-9 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      <span className="text-sm font-medium">Yuklanmoqda...</span>
    </div>
  );
}

/** Faqat login qilingan foydalanuvchi (role=user) uchun sahifalar */
export function RequireUser({ children }) {
  const { status } = useAuth();
  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'admin') return <Navigate to="/admin" replace />;
  if (status === 'user') return children;
  return <Navigate to="/login" replace />;
}

/** Faqat mehmon (login qilinmagan) uchun sahifalar, masalan Login */
export function RequireGuest({ children }) {
  const { status } = useAuth();
  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'user') return <Navigate to="/dashboard" replace />;
  if (status === 'admin') return <Navigate to="/admin" replace />;
  return children;
}

/** Faqat admin sessiyasi uchun sahifalar */
export function RequireAdmin({ children }) {
  const { status } = useAuth();
  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'admin') return children;
  if (status === 'user') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/login" replace />;
}
