import { useDemoTime } from '../contexts/DemoTimeContext';
import { IS_DEMO } from '../lib/appMode';

// Mengembalikan key waktu yang memicu reload data saat waktu demo berubah.
// Live mode: tidak ada DemoTimeProvider → kembalikan 0 (stabil).
function useDemoNowKey() {
  const { now } = useDemoTime();
  return now.getTime();
}
function useStaticKey() {
  return 0;
}

// Pilih implementasi saat modul dimuat (mode tidak berubah saat runtime),
// sehingga aturan hooks tetap konsisten.
export const useNowKey = IS_DEMO ? useDemoNowKey : useStaticKey;
