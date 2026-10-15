import { Link } from 'react-router-dom';

// Xato xabari; tarif limiti bo'lsa "Tarifni oshirish" tugmasi bilan
export default function ErrorNotice({ error, className = '' }) {
  if (!error) return null;
  const msg = typeof error === 'string' ? error : error.message;
  const upgrade = typeof error === 'object' && error.upgrade;
  return (
    <div className={'text-[13px] font-semibold text-danger bg-danger-soft rounded-[var(--radius-sm)] px-3 py-2 ' + className} role="alert">
      {msg}
      {upgrade && (
        <div className="mt-2">
          <Link to="/tariflar" className="inline-block px-3 py-1.5 rounded-[var(--radius-sm)] bg-accent text-accent-text font-bold text-[13px]">
            <i className="fa-solid fa-arrow-up mr-1" aria-hidden="true" /> Tarifni oshirish
          </Link>
        </div>
      )}
    </div>
  );
}
