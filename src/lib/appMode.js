// Mode aplikasi — diatur via env (Vercel: VITE_APP_MODE).
//   'demo' → versi lama: one-click dummy login, demo clock, tombol Tambah/Hapus Dummy,
//            durasi longgar (default 45m), tanpa Clerk.
//   'live' → (default) login Google via Clerk + onboarding, durasi maks 30m,
//            time-gating ketat, tanpa data dummy.
const RAW = (import.meta.env.VITE_APP_MODE || 'live').toLowerCase().trim();

export const APP_MODE = RAW === 'demo' ? 'demo' : 'live';
export const IS_DEMO = APP_MODE === 'demo';
export const IS_LIVE = APP_MODE === 'live';

// Durasi maksimal kegiatan (menit) di Weekly Plan — longgar saat demo.
export const MAX_DURATION = IS_DEMO ? 240 : 30;
// Durasi default slot baru.
export const DEFAULT_DURATION = IS_DEMO ? 45 : 30;
