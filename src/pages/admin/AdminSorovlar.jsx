import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import { formatMoney } from '../../lib/format';

const STATUS_STYLE = {
  pending: ["Kutilmoqda", 'bg-warn-soft text-warn'],
  approved: ['Qabul qilindi', 'bg-info-soft text-info'],
  rejected: ['Rad etildi', 'bg-danger-soft text-danger'],
  paid: ["To'landi", 'bg-accent-soft text-accent'],
  delivered: ['Yetkazildi', 'bg-accent-soft text-accent'],
  cancelled: ['Bekor qilindi', 'bg-danger-soft text-danger'],
};

export default function AdminSorovlar() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('requests');
  const [acting, setActing] = useState(null); // { id, mode: 'approve'|'reject'|'deliver' }

  function load() {
    api.get('/admin/sorovlar.php').then(setData).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  if (error && !data) return <p className="text-danger text-sm">{error}</p>;
  if (!data) return <div className="h-64 rounded-[var(--radius-md)] bg-surface-2 animate-pulse" />;

  return (
    <div>
      <h2 className="font-extrabold text-lg mb-4">So'rovlar</h2>

      <div className="flex gap-1.5 mb-4 bg-surface-2 rounded-full p-1 max-w-xs">
        <button onClick={() => setTab('requests')} className={`flex-1 py-1.5 rounded-full text-[12.5px] font-bold ${tab === 'requests' ? 'bg-accent text-accent-text' : 'text-text-muted'}`}>
          Bot so'rovlari
        </button>
        <button onClick={() => setTab('transfers')} className={`flex-1 py-1.5 rounded-full text-[12.5px] font-bold ${tab === 'transfers' ? 'bg-accent text-accent-text' : 'text-text-muted'}`}>
          Egalik o'tkazish
        </button>
      </div>

      {tab === 'requests' ? (
        data.requests.length === 0 ? (
          <p className="text-center text-sm text-text-muted py-6">Hozircha so'rov yo'q</p>
        ) : (
          <div className="space-y-3">
            {data.requests.map((r) => (
              <RequestCard key={r.id} r={r} onAct={(mode) => setActing({ id: r.id, mode })} onDeliver={() => setActing({ id: r.id, mode: 'deliver' })} />
            ))}
          </div>
        )
      ) : data.transfers.length === 0 ? (
        <p className="text-center text-sm text-text-muted py-6">Hozircha so'rov yo'q</p>
      ) : (
        <div className="space-y-2">
          {data.transfers.map((t) => (
            <div key={t.id} className="bg-surface border border-border rounded-[var(--radius-md)] px-3.5 py-3 text-[12.5px]">
              <div className="font-bold">@{t.bot_user}</div>
              <div className="text-text-muted mt-0.5">
                {t.user_id} → {t.yangi_egasi_id} · {t.status} · {t.sana}
              </div>
            </div>
          ))}
        </div>
      )}

      {acting && (
        <ActionModal
          acting={acting}
          onClose={() => setActing(null)}
          onDone={() => {
            setActing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function RequestCard({ r, onAct, onDeliver }) {
  const [label, styleCls] = STATUS_STYLE[r.status] || [r.status_nomi, 'bg-surface-3 text-text-muted'];
  return (
    <div className="bg-surface border border-border rounded-[var(--radius-md)] px-3.5 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-bold text-sm">{r.nomi}</span>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${styleCls}`}>{label}</span>
      </div>
      <p className="text-[12.5px] text-text-muted mb-2">{r.tavsif}</p>
      <div className="text-[11.5px] text-text-dim mb-2">
        User ID: {r.user_id} ({r.login}) · {r.sana}
        {r.pul_miqdori && ` · ${formatMoney(r.pul_miqdori)}`}
      </div>
      {r.status === 'pending' && (
        <div className="flex gap-2">
          <button onClick={() => onAct('approve')} className="flex-1 py-2 rounded-[var(--radius-sm)] bg-accent text-accent-text text-[12.5px] font-bold">
            Qabul qilish
          </button>
          <button onClick={() => onAct('reject')} className="flex-1 py-2 rounded-[var(--radius-sm)] bg-danger-soft text-danger text-[12.5px] font-bold">
            Rad etish
          </button>
        </div>
      )}
      {r.status === 'paid' && (
        <button onClick={onDeliver} className="w-full py-2 rounded-[var(--radius-sm)] bg-accent text-accent-text text-[12.5px] font-bold">
          Yetkazildi deb belgilash
        </button>
      )}
    </div>
  );
}

function ActionModal({ acting, onClose, onDone }) {
  const [javob, setJavob] = useState('');
  const [pul, setPul] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (acting.mode === 'deliver') {
        await api.post('/admin/sorovlar.php', { amal: 'yetkazildi', id: acting.id, izoh: javob });
      } else {
        await api.post('/admin/sorovlar.php', {
          amal: 'javob',
          id: acting.id,
          status: acting.mode === 'approve' ? 'approved' : 'rejected',
          javob,
          pul,
        });
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setBusy(false);
    }
  }

  const title = acting.mode === 'approve' ? 'Qabul qilish' : acting.mode === 'reject' ? 'Rad etish' : 'Yetkazildi deb belgilash';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full sm:max-w-sm bg-surface border border-border rounded-t-[var(--radius-lg)] sm:rounded-[var(--radius-lg)] p-5 space-y-3">
        <div className="font-extrabold">{title}</div>
        {error && <div className="text-[12.5px] text-danger bg-danger-soft rounded-[var(--radius-sm)] px-3 py-2">{error}</div>}
        {acting.mode === 'approve' && (
          <input
            value={pul}
            onChange={(e) => setPul(e.target.value)}
            placeholder="Bot narxi (so'm)"
            required
            className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] bg-surface-2 border border-border text-sm outline-none focus:border-accent"
          />
        )}
        <textarea
          value={javob}
          onChange={(e) => setJavob(e.target.value)}
          rows={3}
          placeholder={acting.mode === 'reject' ? 'Rad etish sababi (ixtiyoriy)' : 'Foydalanuvchiga xabar'}
          required={acting.mode === 'approve'}
          className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] bg-surface-2 border border-border text-sm outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-[var(--radius-sm)] bg-surface-2 border border-border font-bold text-sm">
            Bekor qilish
          </button>
          <button disabled={busy} className="flex-1 py-2.5 rounded-[var(--radius-sm)] bg-[var(--mf-brand)] text-[var(--mf-on-brand)] font-bold text-sm disabled:opacity-60">
            {busy ? '...' : 'Yuborish'}
          </button>
        </div>
      </form>
    </div>
  );
}
