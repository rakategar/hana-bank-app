# ICU Class — Bank Hana v4.0

**Intensive Control & Upgrading | Field Execution System**

Aplikasi web untuk program intensif 2 minggu perbankan Bank Hana. Digunakan tim
sales lapangan (FA, FWSS, BM, RH) untuk tracking aktivitas harian, scoring
otomatis berbasis AI (Gemini Flash 2.5), dan monitoring performa tim secara
berjenjang.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS (dark mode, mobile-first) |
| Icons | lucide-react |
| Charts / Heatmap | Recharts + komponen kustom |
| Database & Storage | Supabase (PostgreSQL + Storage) |
| AI Scoring & Summary | Google Gemini Flash 2.5 |
| Deploy | Vercel |

---

## Menjalankan Secara Lokal

```bash
# 1. Install dependency
npm install

# 2. Salin env & isi nilainya
cp .env.example .env
#   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GEMINI_API_KEY

# 3. Jalankan dev server
npm run dev      # http://localhost:5173

# Build produksi
npm run build && npm run preview
```

> **Mode demo tanpa konfigurasi:** Halaman login tetap menampilkan 8 user
> bawaan walau Supabase belum diatur. Namun untuk menyimpan data
> (rencana, aktivitas, skor, surat peringatan) dan scoring AI, Supabase &
> Gemini harus dikonfigurasi.

---

## Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor** → jalankan isi [`docs/SUPABASE_SCHEMA.sql`](docs/SUPABASE_SCHEMA.sql)
   (membuat semua tabel, index, RLS, dan seed 8 user).
3. Buat **Storage bucket** bernama `activity-images` (private).
4. Jalankan [`docs/STORAGE_POLICIES.sql`](docs/STORAGE_POLICIES.sql) untuk
   policy upload/baca bucket (MVP: izinkan anon).
5. Ambil **Project URL** dan **anon public key** dari Settings → API,
   masukkan ke `.env`.

## Setup Gemini

1. Buat API key di [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Masukkan ke `VITE_GEMINI_API_KEY` di `.env`.

---

## Login (One-Click Demo)

Klik salah satu card user di halaman login untuk langsung masuk (tanpa
password). Tersedia juga form login manual (ID + password).

| ID | Nama | Role | Cabang |
|---|---|---|---|
| rh_001 | Budi Hartono | RH | Regional Jakarta |
| bm_001 | Drs. Agus Salim | BM | Regional Jakarta |
| fwss_001 | Hendra Wijaya | FWSS | Jakarta Pusat |
| fwss_002 | Maya Sari | FWSS | Jakarta Selatan |
| fa_001 | Andi Pratama | FA | Jakarta Pusat |
| fa_002 | Sari Dewi | FA | Jakarta Pusat |
| fa_003 | Budi Santoso | FA | Jakarta Selatan |
| fa_004 | Rina Marlina | FA | Jakarta Selatan |

**Password (login manual):** `icu2026`

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
