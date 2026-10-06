import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Sidebar() {
  const { username, logout } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="logo">🛡️ {t.appName}</div>
      <nav className="nav" style={{ flex: 1 }}>
        <NavLink to="/" end>📊 {t.nav_dashboard}</NavLink>
      </nav>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, fontSize: 13 }}>
        <div className="muted" style={{ marginBottom: 8, paddingLeft: 4 }}>👤 {username}</div>
        <button className="btn-secondary" style={{ width: '100%' }} onClick={logout}>{t.logout}</button>
      </div>
    </div>
  );
}
