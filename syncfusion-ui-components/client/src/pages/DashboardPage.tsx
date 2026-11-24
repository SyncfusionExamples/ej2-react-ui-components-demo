import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Icons, MODULES } from '../components/modules';
import { getSummary, type Summary } from '../services/scmService';

const fmtNum = new Intl.NumberFormat('en-IN');
const fmtMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });

export default function DashboardPage() {
  const { session } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    getSummary().then(setSummary).catch(() => setSummary(null));
  }, []);

  const kpis = [
    { label: 'Total orders', value: summary ? fmtNum.format(summary.totalOrders) : '—' },
    { label: 'Order value', value: summary ? fmtMoney.format(summary.totalAmount) : '—' },
    { label: 'Delivered', value: summary ? fmtNum.format(summary.delivered) : '—' },
    { label: 'Delayed', value: summary ? fmtNum.format(summary.delayed) : '—', warn: true },
  ];

  return (
    <div className="dashboard">
      <div className="welcome">
        <h1>Welcome back, {session?.user.name}</h1>
        <p>Choose a component to explore the supply chain data.</p>
      </div>

      <div className="kpi-row">
        {kpis.map((k) => (
          <div key={k.label} className={`kpi ${k.warn ? 'warn' : ''}`}>
            <span className="kpi-label">{k.label}</span>
            <span className="kpi-value">{k.value}</span>
          </div>
        ))}
      </div>

      <div className="module-grid">
        {MODULES.map((m) => (
          <Link key={m.key} to={m.path} className="module-card" data-testid={`card-${m.key}`}>
            <span className="module-icon" style={{ background: `${m.color}14`, color: m.color }}>{Icons[m.key]}</span>
            <span className="module-body">
              <span className="module-title">{m.title}<span className="tag" style={{ color: m.color, borderColor: m.color }}>{m.tag}</span></span>
            </span>
            <span className="module-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}