import { useState, useEffect } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/format';

export default function PulIshlash() {
  const { updateBalance } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState(null);

  function load() {
    api.get('/pulishlash/list.php').then(setData).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  async function check(kanal) {
    setBusyId(kanal.id);
    setError('');
    setMessage('');
    try {
      const res = await api.post('/pulishlash/claim.php', { kanal_id: kanal.id });
      setMessage(res.message);
      updateBalance(res.newBalance);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setBusyId(null);
    }
  }

  if (error && !data) return <p className="text-danger text-sm">{error}</p>;
  if (!data) return <div className="h-64 rounded-[var(--radius-md)] bg-surface-2 animate-pulse" />;

  const total = data.pending.length + data.completed.length;
  const progressPct = total > 0 ? Math.round((data.completed.length / total) * 100) : 0;

  return (
    <div className="mf-page mf-page--tasks mf-page--standard">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[12px] font-bold text-accent uppercase tracking-wide">
            <i className="fa-solid fa-list-check mr-1" /> Vazifalar
          </div>
          <h2 className="font-extrabold text-lg">Faol vazifalar</h2>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-text-muted bg-surface-2 border border-border px-3 py-1.5 rounded-full">
          <i className="fa-solid fa-wallet text-accent" /> {formatMoney(data.balance)}
        </div>
      </div>

      {message && (
        <div className="text-[13px] font-semibold text-accent bg-accent-soft rounded-[var(--radius-sm)] px-3 py-2 mb-3">
          {message}
        </div>
      )}
      {error && (
        <div className="text-[13px] font-semibold text-danger bg-danger-soft rounded-[var(--radius-sm)] px-3 py-2 mb-3">
          {error}
        </div>
      )}

      {total === 0 ? (
        <div className="rounded-[var(--radius-md)] bg-surface border border-dashed border-border-light p-8 text-center">
          <i className="fa-solid fa-clipboard-list text-2xl text-text-dim" />
          <p className="text-sm text-text-muted mt-2">Hozircha vazifalar yo'q</p>
          <p className="text-[12px] text-text-dim mt-1">Yangi vazifalar tez orada qo'shiladi. Keyinroq tekshiring!</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2.5 mb-4 text-[12px] font-semibold text-text-dim">
            <span>{data.completed.length}/{total} bajarildi</span>
            <div className="flex-1 h-1 rounded-full bg-surface-3 overflow-hidden">
              <div className="h-full bg-accent transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <span>{progressPct}%</span>
          </div>

          <div className="space-y-2.5">
            {data.pending.map((k) => (
              <div key={k.id} className="flex items-center gap-3 bg-surface-2 border border-border rounded-[var(--radius-md)] p-4">
                <div className="w-11 h-11 rounded-xl bg-accent-soft text-accent flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-bullhorn" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm truncate">{k.nomi}</div>
                  <div className="font-extrabold text-accent text-sm">+{formatMoney(k.mukofot)}</div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <a
                    href={`https://t.me/${String(k.username).replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-center px-3 py-1.5 rounded-[var(--radius-sm)] bg-[#229ED9] text-white text-[12px] font-bold"
                  >
                    <i className="fa-brands fa-telegram mr-1" /> Bajarish
                  </a>
                  <button
                    onClick={() => check(k)}
                    disabled={busyId === k.id}
                    className="px-3 py-1.5 rounded-[var(--radius-sm)] bg-surface-3 border border-border text-[12px] font-bold disabled:opacity-50"
                  >
                    <i className="fa-solid fa-rotate mr-1" /> Tekshirish
                  </button>
                </div>
              </div>
            ))}
          </div>

          {data.completed.length > 0 && (
            <>
              <div className="text-[12.5px] font-bold text-text-dim mt-5 mb-2.5">
                <i className="fa-solid fa-check-double mr-1.5" /> Bajarilgan vazifalar ({data.completed.length})
              </div>
              <div className="space-y-2.5 opacity-55">
                {data.completed.map((k) => (
                  <div key={k.id} className="flex items-center gap-3 bg-surface-2 border border-border rounded-[var(--radius-md)] p-4">
                    <div className="w-11 h-11 rounded-xl bg-surface text-text-dim flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-bullhorn" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-sm truncate text-text-muted">{k.nomi}</div>
                      <div className="font-extrabold text-text-dim text-sm">+{formatMoney(k.mukofot)}</div>
                    </div>
                    <span className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-bold text-text-dim">
                      <i className="fa-solid fa-check-double mr-1" /> Olingan
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
