// WCAG kontrast tekshiruvi: tokenlar CSS'dan o'qiladi (index.css + a11y-tokens.css), kun va tun uchun juftliklar ≥ 4.5.
import { readFileSync } from 'node:fs';
const css = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
const base = css('index.css'), over = css('styles/a11y-tokens.css');

function block(src, selectorRe) {
  const m = src.match(selectorRe); if (!m) return {};
  const out = {};
  for (const d of m[1].matchAll(/--([\w-]+)\s*:\s*([^;}]+)/g)) out[d[1]] = d[2].trim();
  return out;
}
const lightBase = block(base, /(?:^|\n):root\{color-scheme:light;([^}]*)\}/);
const lightOver = block(over, /:root\s*\{([^}]*)\}/);
const darkBase = block(base, /html\[data-theme="dark"\]\{color-scheme:dark;([^}]*)\}/);
const light = { ...lightBase, ...lightOver };
const dark = { ...lightBase, ...darkBase, 'accent-ink': darkBase.accent };

const hex = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((x) => x + x).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
function parse(v, bg) {
  v = v.trim();
  const rgba = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgba) { const a = rgba[4] === undefined ? 1 : parseFloat(rgba[4]); const f = [+rgba[1], +rgba[2], +rgba[3]]; return f.map((c, i) => Math.round(a * c + (1 - a) * bg[i])); }
  return hex(v);
}
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const PAIRS = [
  ['text', 'surface'], ['text', 'bg'], ['text-muted', 'surface'], ['text-muted', 'surface-2'], ['text-dim', 'surface'], ['text-dim', 'surface-2'],
  ['accent-text', 'accent'], ['accent-ink', 'surface'], ['success', 'surface'], ['warn', 'surface'], ['danger', 'surface'], ['info', 'surface'],
];
let bad = 0;
for (const [name, T] of [['KUN', light], ['TUN', dark]]) {
  console.log(`--- ${name}`);
  const surf = parse(T.surface, [255, 255, 255]);
  for (const [f, b] of PAIRS) {
    if (!T[f] || !T[b]) { console.log(`  (o'tkazildi: ${f}/${b} token yo'q)`); continue; }
    const bgc = parse(T[b], surf);
    const r = ratio(parse(T[f], bgc), bgc);
    const ok = r >= 4.5; if (!ok) bad++;
    console.log(`  ${ok ? '✅' : '❌'} ${f.padEnd(12)} / ${b.padEnd(10)} ${r.toFixed(2)}`);
  }
}
if (bad) { console.error(`\nKontrast muammolari: ${bad}`); process.exit(1); }
console.log('\nBarcha juftliklar ≥ 4.5:1');
