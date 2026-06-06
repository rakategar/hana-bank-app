# Setup RH Credentials di Supabase

## ⚡ Quick Setup (2 Menit)

### Step 1: Copy SQL Script
Salin SQL di bawah ini

### Step 2: Jalankan di Supabase SQL Editor
1. Buka Supabase Dashboard
2. Pilih Project → SQL Editor
3. Buat query baru
4. Paste SQL di bawah
5. Klik "Run"

### Step 3: Selesai
App akan otomatis initialize credentials saat login page RH

---

## 📋 SQL Script

**Copy-paste ini ke Supabase SQL Editor:**

```sql
-- Create rh_credentials table
CREATE TABLE IF NOT EXISTS public.rh_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes untuk faster lookup
CREATE INDEX IF NOT EXISTS idx_rh_credentials_username ON public.rh_credentials(username);
CREATE INDEX IF NOT EXISTS idx_rh_credentials_user_id ON public.rh_credentials(user_id);

-- Enable RLS
ALTER TABLE public.rh_credentials ENABLE ROW LEVEL SECURITY;

-- Policy untuk allow READ (login validation)
CREATE POLICY "Allow RH credential validation"
  ON public.rh_credentials
  FOR SELECT
  USING (true);

-- Insert default RH credentials
-- Replace 'Budi Hartono' dengan nama RH user Anda jika berbeda
INSERT INTO public.rh_credentials (username, password, user_id)
SELECT 'primera', 'hanabanksinergia', id 
FROM public.users 
WHERE role = 'RH' AND name = 'Budi Hartono'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.rh_credentials (username, password, user_id)
SELECT 'hana', 'headofregion', id 
FROM public.users 
WHERE role = 'RH' AND name = 'Budi Hartono'
LIMIT 1
ON CONFLICT DO NOTHING;
```

---

## ✅ Verifikasi

Setelah jalankan SQL, cek tabel:

```sql
-- Lihat data yang sudah insert
SELECT username, password, user_id, created_at 
FROM public.rh_credentials 
ORDER BY created_at DESC;
```

Harusnya ada 2 rows:
- `primera` / `hanabanksinergia`
- `hana` / `headofregion`

---

## 🔑 Default Credentials

Setelah setup selesai, RH bisa login dengan:

| Username | Password |
|----------|----------|
| primera | hanabanksinergia |
| hana | headofregion |

Login di: `http://localhost:5173/rh` (atau `/rh` di production)

---

## ⚙️ Verifikasi Setup

1. ✅ Tabel `rh_credentials` ada di Supabase
2. ✅ 2 credentials sudah insert
3. ✅ Refresh browser
4. ✅ Go to `/rh`
5. ✅ Login dengan `primera` / `hanabanksinergia`
6. ✅ Should redirect to `/dashboard/rh`

---

## 🆘 Troubleshooting

### Error: "does not exist"
→ Jalankan SQL script di atas terlebih dahulu

### Error: "RH user tidak ditemukan"
→ Pastikan user RH sudah ada di tabel `users` (role = 'RH')

### Credentials tidak work
→ Check apakah sudah insert dengan query di atas

### Tabel ada tapi insert failed
→ Pastikan user_id sesuai dengan RH user id di `users` table

---

## 🚀 Production Security

⚠️ **IMPORTANT:** Passwords saat ini plain text (untuk MVP)

Untuk production:
1. Hash passwords dengan bcrypt:
   ```sql
   UPDATE rh_credentials 
   SET password = crypt(password, gen_salt('bf', 4))
   WHERE password NOT LIKE '$2%';
   ```

2. Update validasi di `src/lib/db.js`:
   ```javascript
   // Ganti simple comparison dengan bcrypt
   const isValid = await bcrypt.compare(password, data.password);
   ```

---

## 📞 Quick Commands

Jika perlu reset credentials:

```sql
-- Hapus semua credentials
DELETE FROM public.rh_credentials;

-- Atau hapus user tertentu
DELETE FROM public.rh_credentials WHERE username = 'primera';
```

---

**Updated:** 2026-06-06
