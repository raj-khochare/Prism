import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('prism_token'));
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchMe = async (t) => {
    try {
      const res = await fetch(`${BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (!res.ok) throw new Error('Session invalid');
      const data = await res.json();
      setUser(data); // { username, email, displayName, role }
    } catch {
      localStorage.removeItem('prism_token');
      setToken(null);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchMe(token);
    else setAuthLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Any API call that gets a 401 (expired token) dispatches this event.
  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem('prism_token');
      setToken(null);
      setUser(null);
    };
    window.addEventListener('prism:unauthorized', onUnauthorized);
    return () => window.removeEventListener('prism:unauthorized', onUnauthorized);
  }, []);

  const parseError = async (res, fallback) => {
    try {
      const body = await res.json();
      return body.message || body.error || fallback;
    } catch {
      return fallback;
    }
  };

  const login = async (identifier, password) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    if (!res.ok) throw new Error(await parseError(res, 'Invalid username/email or password.'));
    const data = await res.json(); // { token, username }
    localStorage.setItem('prism_token', data.token);
    setToken(data.token);
    await fetchMe(data.token); // AuthResponse has no email/displayName — fetch it from /me
  };

  const register = async ({ username, email, password, displayName, role }) => {
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, displayName, role })
    });
    if (!res.ok) throw new Error(await parseError(res, 'Registration failed. Please try again.'));
    const data = await res.json(); // { token, username }
    localStorage.setItem('prism_token', data.token);
    setToken(data.token);
    await fetchMe(data.token);
  };

  const logout = () => {
    localStorage.removeItem('prism_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, authLoading, login, register, logout, isDeveloper: user?.role !== 'REVIEWER' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
