import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/react';
import { setUserContext, clearUserContext } from '../lib/supabase';
import { fetchUserMaybe } from '../lib/db';
import { IS_DEMO } from '../lib/appMode';

const AuthContext = createContext(null);
const VALID_ROLES = new Set(['FA', 'FWSS', 'BM', 'RH']);

function dashboardPathFor(role) {
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
}

// ── LIVE: identitas dari Clerk + profil di tabel users ────
function ClerkAuthProvider({ children }) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const clerk = useClerk();

  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!isLoaded) return;
    if (!isSignedIn || !clerkUser) {
      setProfile(null);
      clearUserContext();
      setReady(true);
      return;
    }
    setReady(false);
    try {
      const row = await fetchUserMaybe(clerkUser.id);
      if (row) {
        setProfile(row);
        setUserContext(row.id);
      } else {
        setProfile(null);
        clearUserContext();
      }
    } catch {
      setProfile(null);
    } finally {
      setReady(true);
    }
  }, [isLoaded, isSignedIn, clerkUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const logout = useCallback(() => {
    clearUserContext();
    setProfile(null);
    clerk.signOut();
  }, [clerk]);

  const clerkIdentity = clerkUser
    ? {
        id: clerkUser.id,
        fullName: clerkUser.fullName || '',
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        imageUrl: clerkUser.imageUrl || '',
      }
    : null;

  const value = {
    mode: 'live',
    user: profile,
    clerkIdentity,
    isSignedIn: Boolean(isSignedIn),
    ready: isLoaded && ready,
    needsOnboarding: Boolean(isLoaded && isSignedIn && ready && !profile),
    refreshProfile: loadProfile,
    login: null, // tidak dipakai di mode live
    logout,
    dashboardPath: (role) => dashboardPathFor(role || profile?.role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── DEMO: sesi disimpan di localStorage (one-click login) ─
const SESSION_KEY = 'icu_session';

function isValidDemoUser(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    value.id.trim() &&
    typeof value.name === 'string' &&
    value.name.trim() &&
    typeof value.role === 'string' &&
    VALID_ROLES.has(value.role)
  );
}

function DemoAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidDemoUser(parsed)) {
          setUser(parsed);
          setUserContext(parsed.id);
        } else {
          localStorage.removeItem(SESSION_KEY);
          clearUserContext();
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
      clearUserContext();
    }
    setReady(true);
  }, []);

  const login = useCallback((userObj) => {
    if (!isValidDemoUser(userObj)) {
      localStorage.removeItem(SESSION_KEY);
      clearUserContext();
      setUser(null);
      return;
    }
    setUser(userObj);
    localStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
    setUserContext(userObj.id);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    clearUserContext();
  }, []);

  const value = {
    mode: 'demo',
    user,
    clerkIdentity: null,
    isSignedIn: Boolean(user),
    ready,
    needsOnboarding: false,
    refreshProfile: () => {},
    login,
    logout,
    dashboardPath: (role) => dashboardPathFor(role || user?.role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }) {
  return IS_DEMO ? <DemoAuthProvider>{children}</DemoAuthProvider> : <ClerkAuthProvider>{children}</ClerkAuthProvider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
