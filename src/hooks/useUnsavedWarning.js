import { useEffect } from 'react';

/**
 * Menampilkan dialog konfirmasi browser sebelum user meninggalkan halaman
 * (refresh, tutup tab, navigasi eksternal) ketika ada perubahan yang belum disimpan.
 */
export function useUnsavedWarning(isDirty) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}
