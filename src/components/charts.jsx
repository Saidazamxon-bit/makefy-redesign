import { useId } from 'react';

// Rang-ko'rlik uchun xavfsiz 6 rangli to'plam (Okabe–Ito asosida). Bitta rang = bitta ma'no.
export const CHART_COLORS = {
  users: '#4C9AFF',   // foydalanuvchilar
  active: '#20E992',  // faollik
  revenue: '#F2B84B', // daromad
  orders: '#B28DFF',  // buyurtmalar
  error: '#F0546A',
  muted: '#7F93A8',
};

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

export function fmtNum(n) {
  return Number(n || 0).toLocaleString('ru-RU').replace(/,/g, ' ');
}

// Chiziqli grafik (bir yoki bir nechta qator). series: [{key, label, color}], data: [{day, ...}]
export function LineChart({ data, series, height = 180, valueFmt = fmtNum }) {
  const id = useId();
  const W = 640;
  const pad = { l: 44, r: 12, t: 12, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const max = niceMax(Math.max(0, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0))));
  const x = (i) => pad.l + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v) => pad.t + ih - (v / max) * ih;
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const step = Math.max(1, Math.ceil(data.length / 6));
  const summary = series.map((s) => `${s.label}: ${data.map((d) => d[s.key]).join(', ')}`).join('. ');
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full h-auto" role="img" aria-labelledby={id}>
      <title id={id}>{summary}</title>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity="0.1" />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="currentColor" fillOpacity="0.6" className="tabular-nums">{valueFmt(t)}</text>
        </g>
      ))}
      {data.map((d, i) => (i % step === 0 ? (
        <text key={d.day} x={x(i)} y={height - 6} textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.6">{d.day.slice(5)}</text>
      ) : null))}
      {series.map((s) => {
        const pts = data.map((d, i) => `${x(i)},${y(Number(d[s.key]) || 0)}`);
        return (
          <g key={s.key}>
            <polyline points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {data.length <= 31 && data.map((d, i) => <circle key={d.day} cx={x(i)} cy={y(Number(d[s.key]) || 0)} r="2.5" fill={s.color}><title>{`${d.day}: ${valueFmt(d[s.key])}`}</title></circle>)}
          </g>
        );
      })}
    </svg>
  );
}

// Ustunli grafik (bir qator)
export function BarChart({ data, valueKey, color, height = 180, valueFmt = fmtNum }) {
  const W = 640;
  const pad = { l: 44, r: 12, t: 12, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const max = niceMax(Math.max(0, ...data.map((d) => Number(d[valueKey]) || 0)));
  const bw = Math.max(2, iw / Math.max(1, data.length) - 3);
  const step = Math.max(1, Math.ceil(data.length / 6));
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full h-auto" role="img" aria-label="Ustunli grafik">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih - t * ih} y2={pad.t + ih - t * ih} stroke="currentColor" strokeOpacity="0.1" />
          <text x={pad.l - 6} y={pad.t + ih - t * ih + 4} textAnchor="end" fontSize="11" fill="currentColor" fillOpacity="0.6" className="tabular-nums">{valueFmt(t * max)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const v = Number(d[valueKey]) || 0;
        const h = (v / max) * ih;
        const bx = pad.l + (i / Math.max(1, data.length)) * iw + 1.5;
        return (
          <g key={d.day}>
            <rect x={bx} y={pad.t + ih - h} width={bw} height={h} rx="2" fill={color}><title>{`${d.day}: ${valueFmt(v)}`}</title></rect>
            {i % step === 0 && <text x={bx + bw / 2} y={height - 6} textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.6">{d.day.slice(5)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// Voronka: har bosqich oldingisiga nisbatan % bilan
export function Funnel({ steps }) {
  const top = Math.max(1, steps[0]?.value || 1);
  return (
    <ol className="space-y-2" aria-label="Konversiya voronkasi">
      {steps.map((s, i) => {
        const pct = Math.round((s.value / top) * 100);
        const prev = i > 0 ? steps[i - 1].value : null;
        const conv = prev ? Math.round((s.value / prev) * 100) : null;
        return (
          <li key={s.key}>
            <div className="flex justify-between text-[13px] mb-1">
              <span className="font-semibold">{s.label}</span>
              <span className="tabular-nums text-text-muted"><b className="text-text">{fmtNum(s.value)}</b>{conv !== null && <> · {conv}%</>}</span>
            </div>
            <div className="h-6 rounded-[var(--radius-sm)] bg-surface-2 overflow-hidden">
              <div className="h-full rounded-[var(--radius-sm)]" style={{ width: Math.max(pct, s.value > 0 ? 2 : 0) + '%', background: [CHART_COLORS.users, CHART_COLORS.active, CHART_COLORS.revenue][i % 3] }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const DOW = ['Du', 'Se', 'Chor', 'Pay', 'Ju', 'Sha', 'Ya'];

// Issiqlik xaritasi: hafta kuni × soat (Toshkent vaqti)
export function Heatmap({ grid }) {
  const max = Math.max(1, ...grid.flat());
  return (
    <div className="overflow-x-auto">
      <table className="text-[10px] border-separate border-spacing-[2px] min-w-[560px]" role="img" aria-label="Faollik issiqlik xaritasi: hafta kuni va soat">
        <thead>
          <tr><th />{Array.from({ length: 24 }, (_, h) => <th key={h} className="font-normal text-text-muted tabular-nums">{h % 3 === 0 ? h : ''}</th>)}</tr>
        </thead>
        <tbody>
          {grid.map((row, d) => (
            <tr key={d}>
              <th className="font-normal text-text-muted pr-1 text-left">{DOW[d]}</th>
              {row.map((v, h) => (
                <td key={h} title={`${DOW[d]} ${h}:00 — ${fmtNum(v)}`} className="w-4 h-4 rounded-[3px]"
                  style={{ background: v ? CHART_COLORS.active : 'currentColor', opacity: v ? 0.15 + 0.85 * (v / max) : 0.06 }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
