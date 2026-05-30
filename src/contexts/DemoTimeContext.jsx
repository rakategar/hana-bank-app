import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { setDemoNow, clearDemoNow, nowDate } from '../lib/utils';

const DemoTimeContext = createContext(null);
const KEY = 'icu_demo_now';

export function DemoTimeProvider({ children }) {
  // inisialisasi dari localStorage SEBELUM render anak
  const [now, setNowState] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        setDemoNow(raw);
        return new Date(raw);
      }
    } catch {
      /* noop */
    }
    return new Date();
  });
  const [overridden, setOverridden] = useState(() => Boolean(localStorage.getItem(KEY)));

  // pastikan modul utils tersinkron saat mount
  useEffect(() => {
    if (overridden) setDemoNow(now);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setNow = useCallback((date) => {
    const d = new Date(date);
    setDemoNow(d);
    localStorage.setItem(KEY, d.toISOString());
    setOverridden(true);
    setNowState(d);
  }, []);

  const resetNow = useCallback(() => {
    clearDemoNow();
    localStorage.removeItem(KEY);
    setOverridden(false);
    setNowState(nowDate());
  }, []);

  return (
    <DemoTimeContext.Provider value={{ now, setNow, resetNow, overridden }}>
      {children}
    </DemoTimeContext.Provider>
  );
}

export function useDemoTime() {
  const ctx = useContext(DemoTimeContext);
  if (!ctx) throw new Error('useDemoTime harus dipakai di dalam DemoTimeProvider');
  return ctx;
}
