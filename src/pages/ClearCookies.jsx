import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export default function ClearCookies() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Clear localStorage
    localStorage.clear();

    // Clear sessionStorage
    sessionStorage.clear();

    // Clear all cookies
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    });

    setDone(true);

    // Redirect ke login setelah 1.5 detik
    const t = setTimeout(() => {
      window.location.replace('/');
    }, 1500);

    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center gap-4">
      <ShieldCheck size={40} className="text-hana-teal-500" />
      <p className="text-ink font-semibold text-lg">
        {done ? 'Semua data lokal telah dihapus.' : 'Menghapus data...'}
      </p>
      <p className="text-text-muted text-sm">Mengalihkan ke halaman login...</p>
    </div>
  );
}
