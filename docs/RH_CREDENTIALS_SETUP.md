# RH Credentials Setup

## Database Table

Buat tabel `rh_credentials` di Supabase dengan struktur berikut:

```sql
-- Tabel untuk menyimpan username dan password RH
CREATE TABLE rh_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Index untuk faster lookup
CREATE INDEX idx_rh_credentials_username ON rh_credentials(username);
```

## Insert Demo Data

Setelah membuat tabel, insert 2 akun RH:

```sql
-- Pastikan user RH sudah ada di tabel users
-- User pertama: primera
INSERT INTO rh_credentials (username, password, user_id)
VALUES ('primera', 'hanabanksinergia', (SELECT id FROM users WHERE name = 'Budi Hartono' AND role = 'RH' LIMIT 1));

-- User kedua: hana
INSERT INTO rh_credentials (username, password, user_id)
VALUES ('hana', 'headofregion', (SELECT id FROM users WHERE name = 'Budi Hartono' AND role = 'RH' LIMIT 1));
```

## Security Notes

⚠️ **IMPORTANT: Password Hashing**

Kode saat ini menyimpan password dalam plain text untuk MVP. **Ini TIDAK AMAN untuk production.**

Untuk production, lakukan:
1. Hash password menggunakan bcrypt atau argon2 sebelum menyimpan di database
2. Ubah validasi di `src/lib/db.js` fungsi `validateRHLogin` untuk compare hashed password
3. Gunakan HTTPS dan secure cookies/session management

### Hash Password dengan bcrypt (Node.js)

```javascript
const bcrypt = require('bcrypt');

// Hash password sebelum insert
const hashedPassword = await bcrypt.hash('hanabanksinergia', 10);

// Verify password saat login
const isValid = await bcrypt.compare('hanabanksinergia', hashedPassword);
```

## Session Expiry

Session RH berlaku selama 8 jam. Atur di `src/lib/rhSession.js` constant `MAX_SESSION_HOURS`.

## Logout

Klik "Keluar" di sidebar untuk logout. Session akan dihapus dari localStorage dan user diredirect ke `/rh`.
