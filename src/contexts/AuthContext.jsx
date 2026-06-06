import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser, useClerk } from '@clerk/react';
import { setUserContext, clearUserContext } from '../lib/supabase';
import { fetchUserMaybe } from '../lib/db';

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
    dashboardPath: dashboardPathFor,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }) {
  return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
