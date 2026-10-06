import { useState } from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const ok = await login(username, password);
    setSubmitting(false);
    if (!ok) setError(t.loginError);
  }

  return (
    <div className="login-page">
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      <div className="login-card">
        <div className="logo" style={{ justifyContent: 'center', display: 'flex', marginBottom: 8 }}>
          🛡️ {t.appName}
        </div>
        <div className="muted" style={{ textAlign: 'center', marginBottom: 24, fontSize: 14 }}>
          {t.loginSubtitle}
        </div>

        {error && <div className="form-error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>{t.loginUsername}</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="field" style={{ marginBottom: 20 }}>
            <label>{t.loginPassword}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? t.loggingIn : t.loginButton}
          </button>
        </form>

        <div className="muted" style={{ textAlign: 'center', marginTop: 18, fontSize: 14 }}>
          {t.loginNoAccount} <Link to="/register" className="auth-link">{t.loginGoRegister}</Link>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
