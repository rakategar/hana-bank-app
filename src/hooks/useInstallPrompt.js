import { useEffect, useState } from 'react';

export function useInstallPrompt() {
  // Baca dari global variable yang di-set di index.html sebelum React mount
  const [prompt, setPrompt] = useState(() => window.__pwaInstallPrompt || null);
  const [installed, setInstalled] = useState(false);
  const [isIos] = useState(() => /iphone|ipad|ipod/i.test(navigator.userAgent));
  const [isStandalone] = useState(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
  );

  useEffect(() => {
    // Tangkap jika event belum terjadi saat komponen mount
    function handler(e) {
      e.preventDefault();
      window.__pwaInstallPrompt = e;
      setPrompt(e);
    }
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setPrompt(null);
      window.__pwaInstallPrompt = null;
    });
    // Sync jika global sudah ada sebelum hook mount
    if (window.__pwaInstallPrompt) {
      setPrompt(window.__pwaInstallPrompt);
    }
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function triggerInstall() {
    const p = prompt || window.__pwaInstallPrompt;
    if (!p) return false;
    p.prompt();
    const { outcome } = await p.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setPrompt(null);
    window.__pwaInstallPrompt = null;
    return outcome === 'accepted';
  }

  const activePrompt = prompt || window.__pwaInstallPrompt || null;
  const canInstall = !isStandalone && !installed && (Boolean(activePrompt) || isIos);

  return { canInstall, isIos, prompt: activePrompt, isStandalone, triggerInstall };
}
