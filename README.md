# ICU Class — Bank Hana v4.0

**Intensive Control & Upgrading | Field Execution System**

Aplikasi web untuk program intensif 2 minggu perbankan Bank Hana. Digunakan tim
sales lapangan (FA, FWSS, BM, RH) untuk tracking aktivitas harian, scoring
otomatis berbasis AI (Google Gemini), dan monitoring performa tim secara
berjenjang. Autentikasi memakai **Clerk (login Google)**.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS (dark mode, mobile-first) |
| Icons | lucide-react |
| Charts / Heatmap | Recharts + komponen kustom |
| Database & Storage | Supabase (PostgreSQL + Storage) |
| Autentikasi | Clerk (Google OAuth) — `@clerk/react` |
| AI Scoring & Summary | Google Gemini (`gemini-3.5-flash`) |
| Deploy | Vercel |

---

## Menjalankan Secara Lokal

```bash
# 1. Install dependency
npm install

# 2. Salin env & isi nilainya
cp .env.example .env
#   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
#   VITE_GEMINI_API_KEY, VITE_CLERK_PUBLISHABLE_KEY

# 3. Jalankan dev server
npm run dev      # http://localhost:5173

# Build produksi
npm run build && npm run preview
```

> Aplikasi membutuhkan **Clerk** (login) dan **Supabase** (data) agar berfungsi.
> Tanpa `VITE_GEMINI_API_KEY`, aktivitas tetap bisa disimpan namun skor AI tidak
> tersedia.

---

## Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor** → jalankan isi [`docs/SUPABASE_SCHEMA.sql`](docs/SUPABASE_SCHEMA.sql)
   (membuat semua tabel, index, RLS). Tabel `users` dibiarkan kosong — profil dibuat
   saat user mendaftar lewat onboarding.
3. Buat **Storage bucket** bernama `activity-images` (private).
4. Jalankan [`docs/STORAGE_POLICIES.sql`](docs/STORAGE_POLICIES.sql) untuk
   policy upload/baca bucket (MVP: izinkan anon).
5. Ambil **Project URL** dan **anon public key** dari Settings → API,
   masukkan ke `.env`.

## Mode Aplikasi (`VITE_APP_MODE`)

Aplikasi punya dua mode yang dipilih lewat env (bisa diganti di Vercel tanpa ubah kode):

| Mode | Login | Penjadwalan | Data |
|---|---|---|---|
| `live` (default) | Google via Clerk + onboarding | durasi maks **30 menit**, slot terkunci di luar jam (jam + durasi + 30m), setelah tutup hanya boleh alasan+foto (tetap *not done*) | murni input user |
| `demo` | one-click kartu user + login manual (`icu2026`) | durasi longgar, **demo clock** untuk uji waktu, semua slot bebas diisi | tombol **Tambah/Hapus Dummy** |

Set `VITE_APP_MODE=demo` di Environment Variables Vercel untuk mengaktifkan mode demo,
atau `live` (atau kosong) untuk mode produksi. Di mode `demo`, `VITE_CLERK_PUBLISHABLE_KEY`
tidak wajib.

## Setup Gemini

1. Buat API key di [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Masukkan ke `VITE_GEMINI_API_KEY` di `.env`.

> Model yang dipakai: `gemini-3.5-flash`. Jika model ini belum tersedia di akun/region
> Anda, panggilan scoring/summary bisa gagal (404) — sesuaikan `MODEL` di
> `src/lib/gemini.js` bila perlu.

## Setup Clerk (login Google)

1. Buat aplikasi di [dashboard.clerk.com](https://dashboard.clerk.com).
2. **User & Authentication → Social Connections**: aktifkan **Google**.
   Nonaktifkan metode email/password & connection lain agar hanya Google.
3. Salin **Publishable Key** (API Keys → React) ke `VITE_CLERK_PUBLISHABLE_KEY`
   di `.env` (dan di Vercel untuk produksi).

---

## Login & Onboarding (Google)

Pengguna masuk/daftar via tombol **Continue with Google**. Saat pertama kali masuk,
user diarahkan ke halaman **Onboarding** untuk melengkapi: nama, **role**
(FA/FWSS/BM/RH), cabang, dan **atasan**.

Pendaftaran mengikuti alur **top-down** (diatur manual oleh admin): role teratas
mendaftar lebih dulu agar bisa dipilih sebagai atasan oleh role di bawahnya —
RH → BM → FWSS → FA. Semua role selalu tersedia di form; bila atasan belum
terdaftar, relasi dapat dikaitkan kemudian.

---

## Fitur per Role

- **FA** — Dashboard (skor, heatmap 10 hari, banner peringatan, notes FWSS),
  Weekly Plan (12 slot), Daily Input (timeline + upload foto + auto-save +
  Tambah/Hapus Dummy), Score Result (animated reveal hasil Gemini).
- **FWSS** — Semua fitur FA + panel monitoring 2 FA + Generate Summary FA
  (AI + notes + action plan untuk FA).
- **BM** — Semua fitur FA + monitoring 2 FWSS & FA-nya + Generate Summary Tim.
- **RH** — Tabel monitoring seluruh user (skor, trend, status), heatmap tim,
  Generate Summary Keseluruhan (executive brief + ranking + risk flags), dan
  Kirim Surat Peringatan + log peringatan.

---

## Struktur Proyek

```
src/
├── main.jsx · App.jsx · index.css
├── lib/         supabase, gemini, db, storage, dummyData, utils
├── contexts/    AuthContext
├── hooks/       useSalesDashboard
├── constants/   timeSlots, scoringRubric
├── components/  Layout, ScoreBadge, Heatmap, TeamHeatmap, WarningBanner,
│                ActivitySlot, ActivityDetailModal, MonitorCard, UserCard,
│                dashboard, summary, ui
└── pages/       Login, WeeklyPlan, DailyInput, ScoreResult,
                 fa/, fwss/, bm/, rh/
docs/            ARCHITECTURE.md, USERS.md, BRAND_GUIDELINES.md,
                 SUPABASE_SCHEMA.sql, STORAGE_POLICIES.sql
```

---

## Deploy ke Vercel

1. Import repo di Vercel (framework: **Vite**).
2. Set Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `VITE_GEMINI_API_KEY`.
3. Deploy. `vercel.json` sudah mengatur SPA rewrite.

---

*Versi 4.0 · Bank Hana © 2026*
