import { useState } from 'react';
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
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 20,
    }}>
      <div className="panel" style={{ width: '100%', maxWidth: 380 }}>
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
      </div>
    </div>
  );
}
