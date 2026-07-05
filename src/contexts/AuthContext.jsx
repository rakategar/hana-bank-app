import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/react';
import { setUserContext, clearUserContext } from '../lib/supabase';
import { fetchUserMaybe } from '../lib/db';
import { getRHSession, setRHSession, clearRHSession } from '../lib/rhSession';
import { getManualSession, clearManualSession } from '../lib/manualSession';
import { IS_DEMO } from '../lib/appMode';

const AuthContext = createContext(null);

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
  const hasLoadedOnce = useRef(false);
  // Gunakan clerkUser.id sebagai dependency (bukan object) agar tidak re-run saat Clerk
  // memperbaharui referensi object user tanpa mengubah data (mis. token refresh).
  const clerkUserId = clerkUser?.id ?? null;

  const loadProfile = useCallback(async () => {
    if (!isLoaded) return;

    // Check manual session (non-RH users yang login manual, misal Yulianti)
    const manualSession = getManualSession();
    if (manualSession) {
      setProfile(manualSession);
      setReady(true);
      hasLoadedOnce.current = true;
      fetchUserMaybe(manualSession.id).then((fresh) => {
        if (fresh) setProfile(fresh);
      }).catch(() => {});
      return;
    }

    // Check RH session — refresh nama dari DB agar selalu up-to-date
    const rhSession = getRHSession();
    if (rhSession) {
      setProfile(rhSession);
      setReady(true);
      hasLoadedOnce.current = true;
      fetchUserMaybe(rhSession.id).then((fresh) => {
        if (fresh) {
          setRHSession(fresh);
          setProfile(fresh);
        }
      }).catch(() => {});
      return;
    }

    if (!isSignedIn || !clerkUserId) {
      setProfile(null);
      clearUserContext();
      setReady(true);
      hasLoadedOnce.current = true;
      return;
    }
    // Hanya set ready=false pada load pertama — re-load berikutnya tidak flash loading
    if (!hasLoadedOnce.current) setReady(false);
    try {
      const row = await fetchUserMaybe(clerkUserId);
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
      hasLoadedOnce.current = true;
      setReady(true);
    }
  }, [isLoaded, isSignedIn, clerkUserId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Check manual/RH session on mount
  useEffect(() => {
    const manualSession = getManualSession();
    if (manualSession) { setProfile(manualSession); setReady(true); return; }
    const rhSession = getRHSession();
    if (rhSession) { setProfile(rhSession); setReady(true); }
  }, []);

  const logout = useCallback(() => {
    const manualSession = getManualSession();
    if (manualSession) {
      clearManualSession();
      setProfile(null);
      window.location.href = '/';
      return;
    }
    const rhSession = getRHSession();
    if (rhSession) {
      clearRHSession();
      setProfile(null);
      window.location.href = '/rh';
      return;
    }
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

  // Manual/RH session users tidak punya Clerk isSignedIn, tapi profile sudah ada
  const effectiveIsSignedIn = Boolean(isSignedIn) || Boolean(profile);

  const value = {
    mode: 'live',
    user: profile,
    clerkIdentity,
    isSignedIn: effectiveIsSignedIn,
    ready: isLoaded && ready,
    needsOnboarding: Boolean(isLoaded && isSignedIn && ready && !profile),
    refreshProfile: loadProfile,
    login: null,
    logout,
    dashboardPath: () => dashboardPathFor(profile?.role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── DEMO: identitas dari localStorage, tanpa Clerk ────
const DEMO_SESSION_KEY = 'icu_session';

function DemoAuthProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    try {
      const raw = localStorage.getItem(DEMO_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const login = useCallback((user) => {
    setUserContext(user.id);
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user));
    setProfile(user);
  }, []);

  const logout = useCallback(() => {
    clearUserContext();
    localStorage.removeItem(DEMO_SESSION_KEY);
    setProfile(null);
  }, []);

  const value = {
    mode: 'demo',
    user: profile,
    clerkIdentity: null,
    isSignedIn: Boolean(profile),
    ready: true,
    needsOnboarding: false,
    refreshProfile: () => {},
    login,
    logout,
    dashboardPath: () => dashboardPathFor(profile?.role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }) {
  return IS_DEMO
    ? <DemoAuthProvider>{children}</DemoAuthProvider>
    : <ClerkAuthProvider>{children}</ClerkAuthProvider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
