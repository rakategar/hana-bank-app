/**
 * RH Credentials Setup Helper
 * Run: node src/lib/setupRHCredentials.js
 * atau call initializeRHSchema() dari aplikasi
 */

import { supabase } from './supabase.js';

async function initializeRHSchema() {
  try {
    console.log('🔧 Checking RH credentials table...');

    // Cek apakah tabel sudah ada dengan try query
    const { error: checkError } = await supabase
      .from('rh_credentials')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Table rh_credentials sudah ada');
      return true;
    }

    // Jika error "table does not exist", create tabel
    if (checkError.message.includes('does not exist') || checkError.message.includes('could not find')) {
      console.log('📝 Creating rh_credentials table...');

      // Execute SQL untuk create table
      const { error: createError } = await supabase.rpc('create_rh_credentials_table');

      if (createError) {
        // Fallback: guide user untuk manual create
        console.warn('⚠️ Tidak bisa auto-create table (RPC tidak ada)');
        console.log('\n📋 Jalankan SQL ini di Supabase SQL Editor:\n');
        console.log(getRHCredentialsSQL());
        return false;
      }

      console.log('✅ Table rh_credentials berhasil dibuat');
    }

    return true;
  } catch (err) {
    console.error('❌ Error saat initialize schema:', err.message);
    return false;
  }
}

async function initializeRHCredentials() {
  try {
    // Pastikan schema exist dulu
    const schemaOk = await initializeRHSchema();
    if (!schemaOk) {
      throw new Error('Gagal membuat/verify table. Jalankan SQL manual terlebih dahulu.');
    }

    console.log('\n🔑 Initializing RH credentials...');

    // Cari RH user
    const { data: rhUsers, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'RH')
      .limit(1);

    if (fetchError) throw fetchError;
    if (!rhUsers || rhUsers.length === 0) {
      throw new Error('❌ RH user tidak ditemukan. Buat user RH di tabel users terlebih dahulu.');
    }

    const rhUserId = rhUsers[0].id;
    console.log(`📌 Found RH user: ${rhUserId}`);

    // Cek apakah credentials sudah ada
    const { data: existing, error: existError } = await supabase
      .from('rh_credentials')
      .select('username')
      .eq('user_id', rhUserId);

    if (existError) throw existError;

    if (existing && existing.length > 0) {
      console.log(`⏭️ Credentials sudah ada (${existing.length} account)`);
      return {
        success: true,
        message: 'RH credentials sudah ada',
        count: existing.length
      };
    }

    // Insert 2 akun RH
    const credentials = [
      { username: 'primera', password: 'hanabanksinergia', user_id: rhUserId },
      { username: 'hana', password: 'headofregion', user_id: rhUserId },
    ];

    const { data, error: insertError } = await supabase
      .from('rh_credentials')
      .insert(credentials)
      .select();

    if (insertError) throw insertError;

    console.log('✅ RH credentials berhasil dibuat:');
    console.log('   1. primera / hanabanksinergia');
    console.log('   2. hana / headofregion');

    return {
      success: true,
      message: 'RH credentials berhasil diinisialisasi',
      count: data?.length || 0
    };
  } catch (err) {
    console.error('❌ Error:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

function getRHCredentialsSQL() {
  return `
-- Create rh_credentials table
CREATE TABLE IF NOT EXISTS public.rh_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_rh_credentials_username ON public.rh_credentials(username);
CREATE INDEX IF NOT EXISTS idx_rh_credentials_user_id ON public.rh_credentials(user_id);

-- Enable RLS
ALTER TABLE public.rh_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Allow select (untuk login validation)
CREATE POLICY "Allow RH credential validation"
  ON public.rh_credentials
  FOR SELECT
  USING (true);

-- Insert default RH credentials (replace user_id dengan RH user ID Anda)
INSERT INTO public.rh_credentials (username, password, user_id)
SELECT 'primera', 'hanabanksinergia', id FROM public.users WHERE role = 'RH' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rh_credentials (username, password, user_id)
SELECT 'hana', 'headofregion', id FROM public.users WHERE role = 'RH' LIMIT 1
ON CONFLICT DO NOTHING;
  `;
}

// Export untuk usage di Node atau di browser
export { initializeRHCredentials, initializeRHSchema, getRHCredentialsSQL };

// Jika file dijalankan langsung (Node.js)
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const result = await initializeRHCredentials();
    console.log('\n📊 Result:', result);
    process.exit(result.success ? 0 : 1);
  })();
}
