// i18n tekshiruvi: (1) uz/ru/en kalitlari bir xil, (2) bo'sh qiymat yo'q, (3) {o'rinbosar}lar mos,
// (4) kodda t('kalit') bilan ishlatilgan har bir kalit mavjud. Chiqish kodi 0 = yetishmovchilik yo'q.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const dir = new URL('../src/i18n/', import.meta.url).pathname;
const langs = ['uz', 'ru', 'en'];
const d = Object.fromEntries(langs.map((l) => [l, JSON.parse(readFileSync(join(dir, `${l}.json`), 'utf8'))]));
const problems = [];
const all = new Set(langs.flatMap((l) => Object.keys(d[l])));
for (const k of all) {
  for (const l of langs) {
    if (!(k in d[l])) problems.push(`[${l}] kalit yetishmaydi: ${k}`);
    else if (String(d[l][k]).trim() === '') problems.push(`[${l}] bo'sh qiymat: ${k}`);
  }
  const ph = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(',');
  const ref = ph(d.uz[k] ?? '');
  for (const l of ['ru', 'en']) if (k in d[l] && ph(d[l][k]) !== ref) problems.push(`[${l}] o'rinbosarlar mos emas: ${k} (${ph(d[l][k])} ≠ ${ref})`);
}
function walk(p, out = []) {
  for (const f of readdirSync(p)) {
    const fp = join(p, f);
    if (statSync(fp).isDirectory()) walk(fp, out);
    else if (['.jsx', '.js'].includes(extname(fp))) out.push(fp);
  }
  return out;
}
const src = new URL('../src/', import.meta.url).pathname;
let used = 0;
// Dinamik kalitlar (t(`prefix.${x}`)): har bir mumkin bo'lgan qiymat uchun kalit bo'lishi shart.
const DYNAMIC = {
  'market.sort.': ['name', 'rating', 'price'],
  'team.role.': ['owner', 'admin', 'moderator', 'viewer'],
  'team.help.': ['admin', 'moderator', 'viewer'],
  'team.action.': ['member.add', 'member.role', 'member.remove', 'member.leave', 'invite.create', 'invite.accept', 'broadcast.send', 'bot.create'],
  'mybots.filter.': ['all', 'active', 'inactive'],
  'home.filter.': ['all', 'anime', 'starska', 'on', 'off'],
  'home.quick.': ['newBot', 'newBotNote', 'balance', 'balanceNote', 'tasks', 'tasksNote', 'help', 'helpNote'],
  'palette.group.': ['pages', 'bots', 'actions'],
  'status.overall.': ['operational', 'degraded', 'unknown'],
  'status.state.': ['operational', 'degraded', 'unknown'],
  'status.component.': ['api', 'db', 'queue', 'telegram', 'webhooks'],
  'docs.': ['start.title', 'start.body', 'templates.title', 'templates.body', 'api.title', 'api.body', 'faq.q1', 'faq.a1', 'faq.q2', 'faq.a2', 'faq.q3', 'faq.a3', 'faq.q4', 'faq.a4'],
  'docs.faq.q': ['1', '2', '3', '4'],
  'docs.faq.a': ['1', '2', '3', '4'],
  'onb.step': ['1.title', '1.body', '1.cta', '2.title', '2.body', '2.cta', '3.title', '3.body', '3.cta'],
};
for (const f of walk(src)) {
  const code = readFileSync(f, 'utf8');
  for (const m of code.matchAll(/\bt\(\s*(['"`])([a-zA-Z0-9_.]*)(\$\{|\1)/g)) {
    used++;
    const [, , key, end] = m;
    const where = f.replace(src, 'src/');
    if (end === '${' || (key.endsWith('.') && key in DYNAMIC)) {
      const vals = DYNAMIC[key];
      if (!vals) problems.push(`${where}: dinamik kalit prefiksi DYNAMIC ro'yxatida yo'q: ${key}`);
      else for (const v of vals) if (!((key + v) in d.uz)) problems.push(`${where}: dinamik kalit yetishmaydi: ${key}${v}`);
    } else if (!(key in d.uz)) problems.push(`${where}: ishlatilgan, lekin lug'atda yo'q: ${key}`);
  }
}
console.log(`Kalitlar: ${all.size} × ${langs.length} til; kodda t('…') chaqiruvlari: ${used}`);
if (problems.length) { console.error(problems.join('\n')); console.error(`\nMUAMMO: ${problems.length}`); process.exit(1); }
console.log('Kalit yetishmovchiligi: 0');
