import { Suspense, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';
import { Icons, MODULES } from '../components/modules';

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="page-loader" role="status">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export default function AppLayout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
      <header className="app-header">
        <button className="icon-btn" aria-label="Toggle navigation" onClick={() => setCollapsed((c) => !c)}>
          <span className="icon">{Icons.menu}</span>
        </button>
        <div className="brand">
          <span className="brand-name">SCM Insights</span>
          <span className="brand-sub">Syncfusion React POC</span>
        </div>
        <div className="header-right">
          <div className="user-chip" title={session?.user.role}>
            <span className="avatar">{session?.user.name?.[0] ?? 'A'}</span>
            <span>{session?.user.name}</span>
          </div>
          <button className="btn-ghost" onClick={handleLogout} id="logout-btn">
            <span className="icon">{Icons.logout}</span>
            <span>Logout</span>
          </button>
        </div>
      </header>

      <nav className="app-sidebar" aria-label="Main">
        <NavLink to="/dashboard" className="nav-item">
          <span className="icon">{Icons.dashboard}</span>
          <span className="label">Dashboard</span>
        </NavLink>
        <div className="nav-section">Components</div>
        {MODULES.map((m) => (
          <NavLink key={m.key} to={m.path} className="nav-item">
            <span className="icon" style={{ color: m.color }}>{Icons[m.key]}</span>
            <span className="label">{m.title}</span>
          </NavLink>
        ))}
      </nav>

      <main className="app-content">
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
