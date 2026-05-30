import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { setUserContext, clearUserContext } from '../lib/supabase';

const AuthContext = createContext(null);

const SESSION_KEY = 'icu_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id) {
          setUser(parsed);
          setUserContext(parsed.id);
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
    setReady(true);
  }, []);

  const login = useCallback((userObj) => {
    setUser(userObj);
    localStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
    setUserContext(userObj.id);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    clearUserContext();
  }, []);

  const dashboardPath = useCallback((role = user?.role) => {
    switch (role) {
      case 'FA':
        return '/dashboard/fa';
      case 'FWSS':
        return '/dashboard/fwss';
      case 'BM':
        return '/dashboard/bm';
      case 'RH':
        return '/dashboard/rh';
      default:
        return '/';
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, dashboardPath }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
