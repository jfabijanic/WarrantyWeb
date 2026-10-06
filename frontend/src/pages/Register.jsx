import { useState } from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const { register } = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    if (!USERNAME_RE.test(username.trim())) return t.registerErrUsername;
    if (!EMAIL_RE.test(email.trim())) return t.registerErrEmail;
    if (password.length < 6) return t.registerErrPassword;
    if (password !== confirm) return t.registerErrMismatch;
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await register(username.trim(), email.trim(), password);
    } catch (err) {
      setError(
        err.code === 'username_taken' ? t.registerErrUsernameTaken
          : err.code === 'email_taken' ? t.registerErrEmailTaken
            : t.registerErrGeneric,
      );
      setSubmitting(false);
    }
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
          {t.registerSubtitle}
        </div>

        {error && <div className="form-error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>{t.loginUsername}</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>{t.registerEmail}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>{t.loginPassword}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="field" style={{ marginBottom: 20 }}>
            <label>{t.registerConfirmPassword}</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? t.registering : t.registerButton}
          </button>
        </form>

        <div className="muted" style={{ textAlign: 'center', marginTop: 18, fontSize: 14 }}>
          {t.registerHaveAccount} <Link to="/login" className="auth-link">{t.registerGoLogin}</Link>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
