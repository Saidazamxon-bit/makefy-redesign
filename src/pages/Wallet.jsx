import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/format';
import '../styles/home.css';

const ROWS = [
  ['/deposit', 'fa-circle-plus', 'Hisobni to‘ldirish', 'Karta orqali — to‘lov avtomatik tasdiqlanadi'],
  ['/vazifalar', 'fa-bolt', 'Vazifalar', 'Topshiriqlarni bajaring, bonus oling'],
  ['/referal', 'fa-user-group', 'Referal', 'Do‘stlarni taklif qiling, bonus oling'],
  ['/tariflar', 'fa-crown', 'Tariflar', 'Ko‘proq bot va imkoniyatlar'],
];

export default function Wallet() {
  const { user } = useAuth();
  const plan = user?.tarif && user.tarif !== 'oddiy' ? user.tarif : 'Oddiy';
  return (
    <div className="mf-page hm hm--narrow">
      <header className="hm-head">
        <div><h1>Hamyon</h1><p>Balans, bonuslar va tarif — bir joyda.</p></div>
        <Link to="/deposit" className="mf-button mf-button--primary"><i className="fa-solid fa-plus" /> To‘ldirish</Link>
      </header>
      <section className="hm-kpi hm-kpi--2">
        <div><small>Joriy balans</small><strong>{formatMoney(user?.pul ?? 0)}</strong><em>Hisobingizda mavjud</em></div>
        <div><small>Tarif</small><strong style={{ textTransform: 'capitalize' }}>{plan}</strong><em><Link to="/tariflar" className="text-accent">Ko‘rish →</Link></em></div>
      </section>
      <nav className="hm-links" aria-label="Hamyon bo‘limlari">
        {ROWS.map(([to, icon, title, note]) => (
          <Link key={to} to={to}><i className={'fa-solid ' + icon} /><span><b>{title}</b><small>{note}</small></span><i className="fa-solid fa-chevron-right" /></Link>
        ))}
      </nav>
    </div>
  );
}
