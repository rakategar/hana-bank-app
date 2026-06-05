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
| AI Scoring & Summary | Claude (Anthropic) — Haiku 4.5 (scoring) + Sonnet 4.6 (summary) via proxy `/api/ai` |
| Deploy | Vercel |

---

## Menjalankan Secara Lokal

```bash
# 1. Install dependency
npm install

# 2. Salin env & isi nilainya
cp .env.example .env
#   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_CLERK_PUBLISHABLE_KEY,
#   VITE_AI_ENABLED, dan ANTHROPIC_API_KEY (server-side)

# 3. Jalankan dev server
npm run dev      # http://localhost:5173  (UI saja; /api/ai butuh `vercel dev`)

# Untuk menguji penilaian AI secara lokal (menjalankan serverless /api/ai):
#   npx vercel dev

# Build produksi
npm run build && npm run preview
```

> Aplikasi membutuhkan **Clerk** (login) dan **Supabase** (data) agar berfungsi.
> Penilaian/ringkasan AI memakai **Claude** lewat proxy serverless `/api/ai`; set
> `ANTHROPIC_API_KEY` (server-side, **tanpa** prefix `VITE_`) di Vercel. Tanpa key tsb,
> aktivitas tetap bisa disimpan namun skor AI gagal (ErrorBox), dan set
> `VITE_AI_ENABLED=false` untuk menyembunyikan fitur AI.

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

## Setup AI (Claude / Anthropic)

1. Buat API key di [Anthropic Console](https://console.anthropic.com/) → API Keys.
2. Set **`ANTHROPIC_API_KEY`** (server-side, **tanpa** prefix `VITE_`) di Vercel → Project
   Settings → Environment Variables (dan di `.env` lokal bila memakai `vercel dev`).
3. Set `VITE_AI_ENABLED=true` agar fitur AI aktif di UI.

> Arsitektur: client memanggil proxy serverless **`/api/ai`** (`api/ai.js`) yang meneruskan ke
> Anthropic — key tidak pernah masuk bundle browser. Model: **Haiku 4.5** untuk scoring harian,
> **Sonnet 4.6** untuk summary (FWSS/BM/RH). Allowlist model ada di `api/ai.js`; pemetaan
> per-fungsi di `src/lib/ai.js`. Pertimbangkan set spend limit di Console Anthropic.

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
api/             ai.js (proxy serverless → Anthropic/Claude)
src/
├── main.jsx · App.jsx · index.css
├── lib/         supabase, ai, db, storage, reports, utils
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

1. Import repo di Vercel (framework: **Vite**). Fungsi di `api/` otomatis dideploy sebagai serverless.
2. Set Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_AI_ENABLED`, dan **`ANTHROPIC_API_KEY`** (server-side).
3. Deploy. `vercel.json` sudah mengatur SPA rewrite & cache headers.

---

*Versi 4.0 · Bank Hana © 2026*
