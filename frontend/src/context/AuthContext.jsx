import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API } from '../api';

const STORAGE_KEY = 'postink_auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY + '_token') || null);
  const [loading, setLoading] = useState(!!token);

  const persist = useCallback((newToken, newUser) => {
    if (newToken) {
      localStorage.setItem(STORAGE_KEY + '_token', newToken);
      if (newUser) localStorage.setItem(STORAGE_KEY + '_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem(STORAGE_KEY + '_token');
      localStorage.removeItem(STORAGE_KEY + '_user');
    }
    setToken(newToken);
    setUser(newUser);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setUser(data);
        localStorage.setItem(STORAGE_KEY + '_user', JSON.stringify(data));
      })
      .catch(() => {
        persist(null, null);
      })
      .finally(() => setLoading(false));
  }, [token, persist]);

  const login = useCallback((newToken, newUser) => {
    persist(newToken, newUser);
  }, [persist]);

  const logout = useCallback(() => {
    persist(null, null);
  }, [persist]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getStoredToken() {
  return localStorage.getItem(STORAGE_KEY + '_token');
}
