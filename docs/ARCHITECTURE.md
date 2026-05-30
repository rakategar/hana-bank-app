# ICU CLASS — BANK HANA
## Web Application Architecture v4.0 (FINAL)
### Intensive Control & Upgrading | Field Execution Program

---

## CHANGELOG v4.0
- Tambah role **RH (Regional Head)** — login aktif, monitoring semua role
- RH dapat **AI Summary keseluruhan** (semua FA + FWSS + BM) via tombol
- RH dapat kirim **Surat Peringatan** ke user manapun → notif di dashboard target
- Login page: **one-click dummy login** (semua user tampil, tinggal klik)
- Summary: tidak pakai jam, pakai **tombol "Generate Summary"** manual
- Daily input: ada **tombol Add Dummy** (tersimpan DB) & **tombol Delete Dummy** (hapus per hari)
- Storage: **Supabase** (PostgreSQL + Storage bucket)
- AI: **Gemini Flash 2.5**

---

## 1. ROLE HIERARCHY (FINAL)

```
┌─────────────────────────────────────────────┐
│  RH — Regional Head                         │
│  Budi Hartono  |  Regional Jakarta          │
│  • Monitor semua scoring semua user         │
│  • Generate AI summary keseluruhan          │
│  • Kirim Surat Peringatan ke siapa saja     │
└──────────────────────┬──────────────────────┘
                       │
              ┌────────▼────────┐
              │ BM — Branch Mgr │
              │ Drs. Agus Salim │
              │ Regional Jakarta│
              │ • Summary FWSS  │
              │ • Notes & AP    │
              └────────┬────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
  ┌────────▼────────┐   ┌──────────▼──────────┐
  │ FWSS-1          │   │ FWSS-2              │
  │ Hendra Wijaya   │   │ Maya Sari           │
  │ • Summary FA    │   │ • Summary FA        │
  │ • Notes & AP    │   │ • Notes & AP        │
  └────────┬────────┘   └──────────┬──────────┘
           │                       │
     ┌─────┴─────┐           ┌─────┴─────┐
     │           │           │           │
  ┌──▼──┐   ┌───▼─┐      ┌──▼──┐   ┌───▼─┐
  │FA-1 │   │FA-2 │      │FA-3 │   │FA-4 │
  │Andi │   │Sari │      │Budi │   │Rina │
  └─────┘   └─────┘      └─────┘   └─────┘
```

---

## 2. DUMMY USERS (FINAL — 8 users)

| ID | Nama | Role | Branch | Supervisor |
|---|---|---|---|---|
| rh_001 | Budi Hartono | RH | Regional Jakarta | — |
| bm_001 | Drs. Agus Salim | BM | Regional Jakarta | rh_001 |
| fwss_001 | Hendra Wijaya | FWSS | Cabang Jakarta Pusat | bm_001 |
| fwss_002 | Maya Sari | FWSS | Cabang Jakarta Selatan | bm_001 |
| fa_001 | Andi Pratama | FA | Cabang Jakarta Pusat | fwss_001 |
| fa_002 | Sari Dewi | FA | Cabang Jakarta Pusat | fwss_001 |
| fa_003 | Budi Santoso | FA | Cabang Jakarta Selatan | fwss_002 |
| fa_004 | Rina Marlina | FA | Cabang Jakarta Selatan | fwss_002 |

**Password semua:** `icu2026`

### Login Page Design
- Tampil grid card semua user (8 user)
- Tiap card: foto avatar (inisial), nama, role badge, cabang
- **Klik card → langsung masuk** (tidak perlu ketik password untuk demo)
- Tetap ada form username+password untuk login manual

---

## 3. FEATURES PER ROLE

### FA
- Dashboard: score card, heatmap 10 hari, notifikasi surat peringatan dari RH
- **[Buat Rencana Minggu Ini]** → weekly plan form (12 slot template FA)
- **[Input Aktivitas Hari Ini]** → daily input timeline (12 slot)
  - Per slot: actual input + status toggle + notes + upload gambar
  - **[+] Tambah Dummy** → generate & simpan data dummy realistis ke Supabase
  - **[🗑] Hapus Dummy** → hapus data dummy hari ini (reset ke kosong)
  - [Submit & Minta Penilaian AI] → Gemini scoring
- Score result page (animated reveal)
- Baca notes/action plan dari FWSS

### FWSS
- Dashboard: aktivitas sendiri + panel monitoring 2 FA
- **[Buat Rencana Minggu Ini]** + **[Input Aktivitas Hari Ini]** (template FWSS)
  - Tombol Tambah Dummy & Hapus Dummy
- **[Generate Summary FA]** → AI ringkasan kinerja 2 FA (manual trigger, kapan saja)
  - Hasil: ringkasan per FA + highlight risiko + rekomendasi
  - Form notes FWSS + action plan checklist
  - FA bisa baca notes ini di dashboard mereka
- Monitoring panel: status harian + skor tiap FA
- Notifikasi surat peringatan dari RH (jika ada)

### BM
- Dashboard: aktivitas sendiri + panel monitoring 2 FWSS + overview 4 FA
- **[Buat Rencana Minggu Ini]** + **[Input Aktivitas Hari Ini]** (template BM)
  - Tombol Tambah Dummy & Hapus Dummy
- **[Generate Summary Tim]** → AI ringkasan kinerja 2 FWSS + seluruh FA
  - Hasil: per FWSS + team overall + strategic actions
  - Form notes BM + action plan BM
  - FWSS bisa baca notes BM di dashboard mereka
- Notifikasi surat peringatan dari RH

### RH (Regional Head) ★ NEW
- **Dashboard overview semua user** (1 BM + 2 FWSS + 4 FA)
- Lihat skor harian tiap user (tabel + heatmap)
- **[Generate Summary Keseluruhan]** → AI ringkasan eksekutif seluruh tim
- **[Kirim Surat Peringatan]** → modal: pilih target user(s) + tulis pesan
  - Target: bisa 1 user atau multi-select
  - Notifikasi muncul di dashboard target sebagai banner/badge merah
  - Log surat peringatan tersimpan di DB
- Lihat semua weekly plan yang sudah disubmit

---

## 4. DUMMY DATA MECHANISM

### Tombol "Tambah Dummy" (per role, per hari)
- Tersedia di halaman Daily Input
- Klik → generate data aktivitas harian yang realistis sesuai role
- Data langsung di-insert/upsert ke Supabase `daily_activities`
- Otomatis juga generate `ai_scores` dummy
- Status: terisi semua slot dengan data variatif (campuran done/partial/not_done)
- Gambar: tidak diupload (image_url = null untuk dummy)

### Tombol "Hapus Dummy" (per role, per hari)
- Tersedia di halaman Daily Input (muncul jika ada data)
- Klik → konfirmasi dialog → delete record `daily_activities` hari ini
- Juga delete `ai_scores` hari ini
- Reset tampilan ke state kosong
- TIDAK menghapus weekly plan

### Dummy Data Generator (JS logic)
```javascript
// Contoh dummy generator untuk FA
const FA_DUMMY_TEMPLATES = {
  "07:30": {
    actual: "Briefing dilakukan, target 4 appointment ditetapkan bersama tim. Action plan sudah dibagi ke masing-masing slot.",
    status: "done",
    notes: "Ada 2 hot prospect dari referral kemarin yang akan dihubungi pagi ini."
  },
  "08:00": {
    actual: "Review pipeline: 5 HOT prospect teridentifikasi. Next action sudah jelas untuk masing-masing.",
    status: "done",
    notes: "Prioritas: Pak Budi (Sunter) dan Bu Ani (Kelapa Gading)"
  },
  // ... dst per slot, dengan variasi score 2-4
}
```

---

## 5. SURAT PERINGATAN (Warning Letter) — RH Feature

### Flow
```
RH → [Kirim Surat Peringatan]
  → Modal: pilih target user(s) + tulis judul + isi pesan
  → Submit → insert ke tabel warnings
  → Target user login → muncul notifikasi banner merah di dashboard
  → User klik "Baca" → modal isi surat peringatan
  → User klik "Tandai Sudah Dibaca" → status updated
```

### Tabel: `warnings`
```sql
id          UUID PK
from_id     TEXT (rh_001)
to_id       TEXT (target user)
title       TEXT
message     TEXT
is_read     BOOLEAN DEFAULT false
read_at     TIMESTAMPTZ
created_at  TIMESTAMPTZ
```

### Notifikasi di Dashboard Target
- Badge merah di header: "1 Surat Peringatan"
- Banner merah di atas dashboard: "Anda menerima surat peringatan dari RH. [Baca Sekarang]"
- Setelah dibaca: badge hilang, banner berubah abu-abu "Sudah dibaca"

---

## 6. AI SUMMARY — GENERATE BUTTON

### FWSS: [Generate Summary FA]
- Bisa diklik kapan saja (tidak terikat jam)
- Data yang dikumpulkan:
  - Weekly plan FA (sebagai konteks target)
  - Daily activities FA hari ini (semua slot yang sudah diisi)
  - AI scores FA hari ini (jika sudah ada)
  - Summary hari sebelumnya (jika ada)
- Output JSON dari Gemini:
```json
{
  "fa_summaries": [{
    "fa_id": "fa_001",
    "fa_name": "Andi Pratama",
    "performance_status": "on_track",
    "summary": "...",
    "highlights": ["..."],
    "risks": ["..."],
    "fwss_recommendations": ["..."]
  }],
  "team_overall": "...",
  "urgent_actions": ["..."]
}
```
- FWSS input: notes (free text) + action plan (checklist)
- Disimpan ke `supervisor_summaries`
- FA bisa lihat notes dari FWSS di dashboard mereka

### BM: [Generate Summary Tim]
- Data: aktivitas & scores semua FWSS + summary FWSS untuk FA + scores semua FA
- Output: executive summary per FWSS + team overall
- BM notes + strategic action plan
- FWSS bisa lihat notes dari BM

### RH: [Generate Summary Keseluruhan]
- Data: seluruh scores (FA + FWSS + BM) + summary BM + summary FWSS
- Output: executive brief + ranking performa + flagging risiko
- RH tidak perlu input notes (hanya read + kirim surat peringatan jika perlu)

---

## 7. SUPABASE SCHEMA (FINAL)

### Tables

```sql
-- users
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('FA','FWSS','BM','RH')),
  branch        TEXT,
  supervisor_id TEXT REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- weekly_plans
CREATE TABLE weekly_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL REFERENCES users(id),
  week_id      TEXT NOT NULL,
  role         TEXT NOT NULL,
  submitted_at TIMESTAMPTZ,
  is_locked    BOOLEAN DEFAULT false,
  slots        JSONB NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_id)
);

-- daily_activities
CREATE TABLE daily_activities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL REFERENCES users(id),
  date         DATE NOT NULL,
  role         TEXT NOT NULL,
  is_dummy     BOOLEAN DEFAULT false,
  status       TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','scored')),
  submitted_at TIMESTAMPTZ,
  activities   JSONB NOT NULL DEFAULT '[]',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ai_scores
CREATE TABLE ai_scores (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                TEXT NOT NULL REFERENCES users(id),
  date                   DATE NOT NULL,
  role                   TEXT NOT NULL,
  daily_activity_id      UUID REFERENCES daily_activities(id),
  is_dummy               BOOLEAN DEFAULT false,
  scores                 JSONB NOT NULL DEFAULT '[]',
  daily_average          NUMERIC(3,2),
  daily_level            TEXT,
  summary                TEXT,
  overall_recommendation TEXT,
  scored_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- supervisor_summaries
CREATE TABLE supervisor_summaries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id    TEXT NOT NULL REFERENCES users(id),
  target_user_id   TEXT NOT NULL REFERENCES users(id),
  date             DATE NOT NULL,
  session_label    TEXT NOT NULL DEFAULT 'manual',
  ai_summary       TEXT,
  summary_data     JSONB,
  supervisor_notes TEXT,
  action_plans     JSONB DEFAULT '[]',
  generated_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(supervisor_id, target_user_id, date, session_label)
);

-- warnings (surat peringatan dari RH)
CREATE TABLE warnings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id    TEXT NOT NULL REFERENCES users(id),
  to_id      TEXT NOT NULL REFERENCES users(id),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT false,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- activity_images
CREATE TABLE activity_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL REFERENCES users(id),
  date         DATE NOT NULL,
  time_slot    TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url   TEXT,
  file_size_kb INTEGER,
  uploaded_at  TIMESTAMPTZ DEFAULT now()
);
```

### Seed Data
```sql
INSERT INTO users (id, name, role, branch, supervisor_id) VALUES
('rh_001',   'Budi Hartono',    'RH',   'Regional Jakarta',       NULL),
('bm_001',   'Drs. Agus Salim', 'BM',   'Regional Jakarta',       'rh_001'),
('fwss_001', 'Hendra Wijaya',   'FWSS', 'Cabang Jakarta Pusat',   'bm_001'),
('fwss_002', 'Maya Sari',       'FWSS', 'Cabang Jakarta Selatan', 'bm_001'),
('fa_001',   'Andi Pratama',    'FA',   'Cabang Jakarta Pusat',   'fwss_001'),
('fa_002',   'Sari Dewi',       'FA',   'Cabang Jakarta Pusat',   'fwss_001'),
('fa_003',   'Budi Santoso',    'FA',   'Cabang Jakarta Selatan', 'fwss_002'),
('fa_004',   'Rina Marlina',    'FA',   'Cabang Jakarta Selatan', 'fwss_002');
```

---

## 8. APPLICATION SCREENS (FINAL)

```
/login
  → Grid 8 user cards (klik langsung masuk)
  → Atau form manual username+password

/dashboard/fa        (Andi, Sari, Budi, Rina)
  → Score card + heatmap + warning banner (jika ada)
  → [Buat Rencana Minggu Ini]
  → [Input Aktivitas Hari Ini]
  → Notes dari FWSS (read only)

/dashboard/fwss      (Hendra, Maya)
  → Score card sendiri + warning banner
  → [Buat Rencana Minggu Ini]
  → [Input Aktivitas Hari Ini]
  → Panel FA-1 & FA-2 (status, skor, progress)
  → [Generate Summary FA] → /summary/fwss
  → Notes dari BM (read only)

/dashboard/bm        (Drs. Agus)
  → Score card sendiri + warning banner
  → [Buat Rencana Minggu Ini]
  → [Input Aktivitas Hari Ini]
  → Panel FWSS-1 & FWSS-2 + FA overview
  → [Generate Summary Tim] → /summary/bm
  → Notes dari RH (read only, jika ada)

/dashboard/rh        (Budi Hartono)
  → Tabel semua user: nama, role, skor hari ini, trend
  → Heatmap semua user (10 hari ICU)
  → [Generate Summary Keseluruhan] → /summary/rh
  → [Kirim Surat Peringatan] → modal
  → Log surat peringatan yang sudah dikirim

/weekly-plan         (FA/FWSS/BM — template sesuai role)
  → 12 slot form

/daily-input         (FA/FWSS/BM)
  → Timeline 12 slot
  → Per slot: planned + actual + status + notes + upload gambar
  → [+] Tambah Dummy   [🗑] Hapus Dummy
  → [Submit & Minta Penilaian AI]

/score-result        (setelah submit daily)
  → Animated score reveal per aktivitas
  → Daily summary + rekomendasi

/summary/fwss        (FWSS generate)
  → AI summary per FA + team overall
  → Form: notes + action plan checklist

/summary/bm          (BM generate)
  → AI summary per FWSS + team overall
  → Form: notes + strategic action plan

/summary/rh          (RH generate)
  → Executive brief seluruh tim
  → Ranking performa + risk flagging
  → Tombol kirim peringatan dari sini juga
```

---

## 9. TECH STACK (FINAL)

| Layer | Tech |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Icons | lucide-react |
| Charts | Recharts |
| Database | Supabase PostgreSQL |
| File Storage | Supabase Storage (`activity-images` bucket) |
| Auth | Supabase (simple session via localStorage + user table) |
| AI Scoring | Gemini Flash 2.5 |
| AI Summary | Gemini Flash 2.5 |
| Deploy | Vercel |
| Env Vars | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GEMINI_API_KEY |

---

## 10. ENV VARS (Vercel)

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GEMINI_API_KEY=AIza...
```

---

*Versi: 4.0 FINAL | 30 Mei 2026*
