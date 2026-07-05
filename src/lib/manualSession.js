const SESSION_KEY = 'manual_session';
const MAX_SESSION_HOURS = 8;

export function setManualSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    ...user,
    timestamp: Date.now(),
  }));
}

export function getManualSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    const sessionAge = Date.now() - session.timestamp;
    if (sessionAge > MAX_SESSION_HOURS * 3600 * 1000) {
      clearManualSession();
      return null;
    }
    return session;
  } catch {
    clearManualSession();
    return null;
  }
}

export function clearManualSession() {
  localStorage.removeItem(SESSION_KEY);
}
