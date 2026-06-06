const SESSION_KEY = 'rh_session';
const MAX_SESSION_HOURS = 8;

export function setRHSession(rhUser) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    id: rhUser.id,
    name: rhUser.name,
    branch: rhUser.branch,
    timestamp: Date.now(),
  }));
}

export function getRHSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    // Check expiry
    const sessionAge = Date.now() - session.timestamp;
    if (sessionAge > MAX_SESSION_HOURS * 3600 * 1000) {
      clearRHSession();
      return null;
    }
    return session;
  } catch {
    clearRHSession();
    return null;
  }
}

export function clearRHSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function isRHLoggedIn() {
  return Boolean(getRHSession());
}
