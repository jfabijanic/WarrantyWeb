import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Sidebar() {
  const { username, logout } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="sidebar">
      <div className="logo">🛡️ {t.appName}</div>
      <nav className="nav">
        <NavLink to="/" end>📊 {t.nav_dashboard}</NavLink>
      </nav>
      <div className="sidebar-user">
        <div className="muted sidebar-name">👤 {username}</div>
        <button className="btn-secondary sidebar-logout" onClick={logout}>{t.logout}</button>
      </div>
    </div>
  );
}
