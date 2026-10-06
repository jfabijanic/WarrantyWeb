import { createContext, useContext, useState, useCallback } from 'react';
import { login as loginRequest, register as registerRequest } from '../api/auth';
import { getToken, getUsername, saveSession, clearSession } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getToken());
  const [username, setUsername] = useState(getUsername());
  const [error, setError] = useState('');

  const login = useCallback(async (user, password) => {
    setError('');
    try {
      const data = await loginRequest(user, password);
      saveSession(data.token, data.username);
      setToken(data.token);
      setUsername(data.username);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  // Throws on failure so the form can show a specific message.
  const register = useCallback(async (user, email, password) => {
    const data = await registerRequest(user, email, password);
    saveSession(data.token, data.username);
    setToken(data.token);
    setUsername(data.username);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, username, isAuthenticated: !!token, login, register, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
