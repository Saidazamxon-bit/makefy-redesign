import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/format';

const TABS = [
  ['balance', 'Balans'],
  ['referral', 'Referal'],
  ['bots', 'Botlar'],
];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('balance');

  useEffect(() => {
    api.get('/admin/dashboard.php').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-danger text-sm">{error}</p>;
  if (!data) return <div className="h-64 rounded-[var(--radius-md)] bg-surface-2 animate-pulse" />;

  const { stats, recentUsers, auditLog, leaderboards } = data;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <StatCard value={stats.totalUsers} label="Jami foydalanuvchilar" />
        <StatCard value={stats.activeBots} label="Faol botlar" />
        <StatCard value={stats.todayUsers} label="Bugungi kirganlar" color="info" />
        <StatCard value={formatMoney(stats.totalBalance)} label="Jami balans" color="warn" small />
      </div>

      <Link to="/admin/kartalar" className="flex items-center gap-2 bg-surface border border-border rounded-[var(--radius-md)] px-4 py-3 text-sm font-bold">
        <i className="fa-solid fa-credit-card" /> Karta avto-to‘lov: kartalar va ko‘rib chiqish →
      </Link>

      <Link to="/admin/platforma" className="flex items-center gap-2 bg-surface border border-border rounded-[var(--radius-md)] px-4 py-3 text-sm font-bold">
        <i className="fa-solid fa-gauge-high" /> Platforma paneli: foydalanuvchilar, e‘lon, limitlar →
      </Link>

      {stats.pendingRequests > 0 && (
        <Link
          to="/admin/sorovlar"
          className="flex items-center gap-2 bg-warn-soft text-warn rounded-[var(--radius-md)] px-4 py-3 text-sm font-bold"
        >
          <i className="fa-solid fa-bell" /> {stats.pendingRequests} ta kutilayotgan so'rov bor! Ko'rish →
        </Link>
      )}

      <div className="rounded-[var(--radius-md)] bg-surface border border-border p-4">
        <div className="font-extrabold text-sm mb-3">
          <i className="fa-solid fa-trophy mr-1.5 text-accent" /> Foydalanuvchilar reytingi
        </div>
        <div className="flex gap-1.5 mb-3 bg-surface-2 rounded-full p-1">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-1.5 rounded-full text-[12px] font-bold ${tab === key ? 'bg-accent text-accent-text' : 'text-text-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {leaderboards[tab].map((e) => (
            <div key={e.user_id} className="flex items-center gap-2 text-[12.5px] py-1.5 border-b border-border last:border-0">
              <span className="w-6 text-text-muted font-bold">#{e.rank}</span>
              <span className="flex-1 truncate">
                {e.ism} <span className="text-text-dim">(ID: {e.user_id})</span>
              </span>
              <span className="font-bold">{tab === 'balance' ? formatMoney(e.value) : `${e.value} ta`}</span>
            </div>
          ))}
          {leaderboards[tab].length === 0 && <p className="text-center text-text-muted text-sm py-4">Ma'lumot yo'q</p>}
        </div>
      </div>

      <div className="rounded-[var(--radius-md)] bg-surface border border-border p-4">
        <div className="font-extrabold text-sm mb-3">
          <i className="fa-solid fa-users mr-1.5 text-accent" /> So'nggi foydalanuvchilar
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-text-muted border-b border-border">
                <th className="py-2 pr-2 font-bold">ID</th>
                <th className="py-2 pr-2 font-bold">Login</th>
                <th className="py-2 pr-2 font-bold">Balans</th>
                <th className="py-2 pr-2 font-bold">Tarif</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u) => (
                <tr key={u.user_id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-2">{u.user_id}</td>
                  <td className="py-2 pr-2 font-bold">{u.login}</td>
                  <td className="py-2 pr-2">{formatMoney(u.pul)}</td>
                  <td className="py-2 pr-2">
                    <span className="px-2 py-0.5 rounded-full bg-accent-soft text-accent text-[11px] font-bold">{u.tarif || 'oddiy'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {auditLog.length > 0 && (
        <div className="rounded-[var(--radius-md)] bg-surface border border-border p-4">
          <div className="font-extrabold text-sm mb-3">
            <i className="fa-solid fa-shield-halved mr-1.5 text-accent" /> Xavfsizlik loglari
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {auditLog.map((log, i) => (
              <div key={i} className="text-[12px] border-b border-border last:border-0 pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold px-1.5 py-0.5 rounded bg-surface-3">{log.event}</span>
                  <span className="text-text-dim">{log.created_at}</span>
                </div>
                <div className="text-text-muted truncate mt-1">{log.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label, color, small }) {
  const colorCls = color === 'info' ? 'text-info' : color === 'warn' ? 'text-warn' : 'text-accent';
  return (
    <div className="rounded-[var(--radius-md)] bg-surface-2 border border-border p-4 text-center">
      <div className={`font-extrabold ${small ? 'text-lg' : 'text-2xl'} ${colorCls}`}>{value}</div>
      <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}
