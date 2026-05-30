import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[ICU Class] Supabase belum dikonfigurasi. Set VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY di file .env'
  );
}

// Tetap buat client agar import tidak error; query akan gagal terkontrol jika belum dikonfigurasi.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-anon-key'
);

export const STORAGE_BUCKET = 'activity-images';

// Untuk MVP tanpa Supabase Auth penuh: simpan user id di localStorage,
// filtering data dilakukan di level query (where user_id = ...).
export function setUserContext(userId) {
  localStorage.setItem('icu_user_id', userId);
}

export function clearUserContext() {
  localStorage.removeItem('icu_user_id');
}
