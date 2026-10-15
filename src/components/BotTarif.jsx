import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/format';
import '../styles/home.css';

const SPEED = ['', 'Oddiy tezlik', 'Tez', 'Eng tez'];
const num = (n) => (Number(n) === 0 ? 'cheksiz' : new Intl.NumberFormat('uz-UZ').format(n));

export default function BotTarif({ username, onChanged }) {
  const [d, setD] = useState(null);
  const [kalit, setKalit] = useState('');
  const [addon, setAddon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api.get(`/mybots/tarif.php?useri=${encodeURIComponent(username)}`)
      .then((r) => { setD(r); setKalit(r.kalit); setAddon(!!r.webappAddon); })
      .catch((e) => setMsg({ ok: false, text: e.message }));
  }, [username]);

  if (!d) return msg ? <p className="text-danger text-sm mb-4">{msg.text}</p> : null;
  if (!d.tariflar.length) return <p className="text-sm text-text-muted mb-4">Bu bot turi uchun tarif mavjud emas.</p>;

  const cur = d.tariflar.find((t) => t.kalit === kalit) || d.tariflar[0];
  const pk = d.perks || {};
  const waNarx = pk.webappBepul ? 0 : cur.webappNarx;
  const oylikAsl = cur.narx + (cur.webapp === 'pullik' && addon ? cur.webappNarx : 0);
  const oylik = Math.round(((cur.narx + (cur.webapp === 'pullik' && addon ? waNarx : 0)) * (100 - (pk.chegirma || 0))) / 100);
  const changed = kalit !== d.kalit || (cur.webapp === 'pullik' && addon !== d.webappAddon);

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const r = await api.post('/mybots/tarif.php', { useri: username, kalit: cur.kalit, webappAddon: addon });
      setD((x) => ({ ...x, kalit: r.kalit, webappAddon: r.webappAddon, narxi: r.narxi }));
      onChanged?.(r.narxi); setMsg({ ok: true, text: r.message });
    } catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Xatolik' }); } finally { setBusy(false); }
  }

  return (
    <section className="hm-sec bt-tarif">
      <div className="hm-sec__head"><div><h2>Tarif</h2><p>Narx oyiga; to‘lov kunlik hisoblanadi (oylik ÷ 30).</p></div></div>
      {(pk.chegirma > 0 || pk.webappBepul || pk.tezlikBonus > 0) && (
        <p className="bt-tarif__perk"><i className="fa-solid fa-crown" /> {pk.nomi} tarifingiz imtiyozlari: {[pk.chegirma > 0 && `−${pk.chegirma}% chegirma`, pk.webappBepul && 'Web App bepul', pk.tezlikBonus > 0 && `+${pk.tezlikBonus} tezlik`].filter(Boolean).join(' · ')}</p>
      )}
      <div className="hm-table">
        {d.tariflar.map((t) => (
          <label key={t.kalit} className={'hm-row bt-tarif__row' + (t.kalit === kalit ? ' is-on' : '')}>
            <input type="radio" name="tarif" checked={t.kalit === kalit} onChange={() => { setKalit(t.kalit); if (t.webapp !== 'pullik') setAddon(false); }} />
            <span className="bt-tarif__main"><b>{t.nomi}</b>
              <small>{num(t.maxUsers)} foydalanuvchi · {num(t.monthlyMessages)} xabar · {SPEED[t.tezlik] || ''}
                {t.webapp === 'bor' ? ' · Web App bor' : t.webapp === 'pullik' ? ` · Web App +${formatMoney(t.webappNarx)}` : ' · Web App yo‘q'}
                {t.features?.max_kontent !== undefined ? ` · Kontent: ${num(t.features.max_kontent)}` : ''}{t.features?.majburiy_obuna ? ' · Majburiy obuna' : ''}</small></span>
            <b className="bt-tarif__price">{t.narx === 0 ? 'Bepul' : formatMoney(t.narx)}</b>
          </label>
        ))}
      </div>
      {cur.webapp === 'pullik' && (
        <label className="bt-tarif__addon"><input type="checkbox" checked={addon} onChange={(e) => setAddon(e.target.checked)} />
          Web App’ni yoqish ({pk.webappBepul ? 'sizning tarifingizda bepul' : `+${formatMoney(cur.webappNarx)}/oy`})</label>
      )}
      <div className="bt-tarif__foot">
        <span>Jami: {oylik !== oylikAsl && <s className="text-text-dim">{formatMoney(oylikAsl)}</s>} <b>{formatMoney(oylik)}</b>/oy · kuniga {formatMoney(Math.ceil(oylik / 30))}</span>
        <button type="button" onClick={save} disabled={busy || !changed} className="mf-button mf-button--primary">{busy ? 'Saqlanmoqda…' : 'Tarifni saqlash'}</button>
      </div>
      {msg && <div className={'mf-notice ' + (msg.ok ? 'mf-notice--ok' : 'mf-notice--err')}>{msg.text}</div>}
    </section>
  );
}
