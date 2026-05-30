# PROMPT: ICU CLASS — BANK HANA
## Untuk Claude Code Opus 4.8

---

## KONTEKS PROYEK

Kamu adalah senior full-stack developer yang akan membangun web application **ICU Class Bank Hana** — sebuah Field Execution System untuk program intensif 2 minggu perbankan. Aplikasi ini digunakan oleh tim sales lapangan Bank Hana (FA, FWSS, BM, dan RH) untuk tracking aktivitas harian, scoring otomatis AI, dan monitoring performa tim.

Baca seluruh file di folder `docs/` sebelum menulis satu baris kode pun:
- `docs/ARCHITECTURE.md` — arsitektur lengkap, fitur, flow
- `docs/USERS.md` — struktur user & relasi organisasi
- `docs/BRAND_GUIDELINES.md` — design system Bank Hana
- `docs/SUPABASE_SCHEMA.sql` — schema database lengkap
- `assets/hana-bank-logo.png` — logo resmi Bank Hana
- `assets/hana-palette-analysis.png` — referensi palet warna

---

## TECH STACK

- **Framework:** React + Vite
- **Styling:** Tailwind CSS
- **Icons:** lucide-react
- **Charts:** Recharts
- **Database & Storage:** Supabase (`@supabase/supabase-js`)
- **AI Scoring & Summary:** Google Gemini Flash 2.5
- **Deploy:** Vercel
- **Env vars:**
  ```
  VITE_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY
  VITE_GEMINI_API_KEY
  ```

---

## DESIGN SYSTEM (WAJIB DIIKUTI)

### Warna Brand Bank Hana
```css
--hana-teal-500: #04B292   /* primary action, logo */
--hana-teal-600: #038E75   /* hover */
--hana-teal-700: #026B58   /* dark bg element */
--hana-pink-500: #E62560   /* CTA, warning, accent */
--hana-pink-600: #B81E4D   /* CTA hover */
--charcoal:      #1F2933   /* main bg */
--card-bg:       #263544   /* card bg */
--elevated:      #2E4057   /* modal, elevated */
--border:        #374B5C   /* subtle border */
--text-primary:  #FFFFFF
--text-secondary:#A0B4C8
--text-muted:    #52616B
```

### Score Colors
```
CRITICAL (1):    #EF4444
RECOVERY (2):    #F97316
ON TRACK (3):    #3B82F6
HIGH IMPACT (4): #22C55E
```

### Typography
- **Heading/Display:** Barlow Condensed (700, 800)
- **Body:** DM Sans (400, 500, 600)
- Import dari Google Fonts

### Theme: Dark mode, mobile-first (min-width: 375px)

---

## DATABASE SCHEMA

Jalankan `docs/SUPABASE_SCHEMA.sql` di Supabase SQL Editor.

### Tables utama:
- `users` — 8 dummy users (FA×4, FWSS×2, BM×1, RH×1)
- `weekly_plans` — rencana kerja mingguan per user
- `daily_activities` — aktivitas harian per slot waktu (JSONB), `is_dummy` flag
- `ai_scores` — hasil scoring Gemini per hari, `is_dummy` flag
- `supervisor_summaries` — AI summary + notes + action plan dari FWSS/BM/RH
- `warnings` — surat peringatan dari RH ke user manapun
- `activity_images` — metadata upload gambar bukti aktivitas

### Supabase Storage:
- Bucket: `activity-images` (private)
- Naming: `{user_id}/{YYYY-MM-DD}/{HH-MM}_{uuid}.jpg`

---

## STRUKTUR ORGANISASI

```
RH (rh_001: Budi Hartono)
└── BM (bm_001: Drs. Agus Salim)
    ├── FWSS (fwss_001: Hendra Wijaya) → FA fa_001, fa_002
    └── FWSS (fwss_002: Maya Sari)     → FA fa_003, fa_004
```

**Password semua user:** `icu2026`

---

## FITUR YANG HARUS DIBANGUN

### 1. LOGIN PAGE
- Grid 8 card user (avatar inisial, nama, role badge, cabang)
- **Klik card → langsung login** tanpa ketik password (demo mode)
- Tetap ada form manual username + password sebagai fallback
- Redirect ke dashboard sesuai role setelah login
- Session disimpan di localStorage (key: `icu_session`) + sync ke Supabase RLS header

---

### 2. FA DASHBOARD & FEATURES

#### Dashboard FA
- Header: logo Bank Hana + nama user + role badge + tombol logout
- **Warning banner merah** (jika ada surat peringatan belum dibaca dari RH)
- Score card hari ini: angka besar + level (CRITICAL/RECOVERY/ON TRACK/HIGH IMPACT) + warna
- Heatmap 10 hari ICU: grid kotak berwarna per hari sesuai score level
- Weekly plan status badge: "Sudah disubmit ✓" / "Belum ada rencana minggu ini ⚠"
- Daily input status: "Sudah dinilai ✓" / "Draft tersimpan" / "Belum diisi"
- Notes dari FWSS (read-only card, tampil jika ada)
- 2 tombol utama (prominent, full-width di mobile):
  - **[📋 Buat Rencana Minggu Ini]**
  - **[✏️ Input Aktivitas Hari Ini]**

#### Weekly Plan Form (`/weekly-plan`)
Template 12 time slot FA dari PDF:
```
07:30 Morning Briefing & Target Commitment
08:00 Pipeline Review & Prioritas Nasabah
09:00 Tele-Appointment & Customer Engagement
10:00 Prospecting & Referral Sourcing
11:00 Customer Meeting & Product Presentation
12:00 Persiapan Meeting & Kelengkapan Aplikasi
13:00 Midday Checkpoint & Recovery Action
14:00 Customer Meeting & Advisory Session
15:00 Closing Follow Up & Objection Handling
16:00 Update CRM & Submit Activity
17:00 Sales Coaching & Skill Practice
18:00 Evening Review & Pipeline Lock Besok
```
Per slot input:
- Nama nasabah/prospek (text)
- Lokasi/cabang (text)
- Objective spesifik (textarea)

Tombol: **[Submit Rencana]** → upsert ke `weekly_plans`

#### Daily Activity Input (`/daily-input`)
- Timeline view: 12 slot kartu vertikal
- Tiap kartu menampilkan:
  - Time label + aktivitas label
  - Rencana dari weekly plan (jika ada, tampil abu-abu sebagai context)
  - **Hasil aktual** (textarea, required)
  - **Status toggle:** ✓ Done | ⚡ Partial | ✗ Not Done
  - **Catatan** (textarea, optional)
  - **Upload gambar bukti** (1 foto per slot, max 500KB setelah kompresi)
    - Kompresi client-side dengan canvas sebelum upload ke Supabase Storage
    - Preview thumbnail setelah upload berhasil
- Auto-save draft ke Supabase setiap 30 detik (debounced)
- 2 tombol utility di atas form:
  - **[+ Tambah Dummy]** → generate & insert data realistis ke DB (semua 12 slot terisi, variatif done/partial/not_done)
  - **[🗑 Hapus Dummy]** → konfirmasi dialog → delete daily_activities + ai_scores hari ini → reset form
- Tombol submit: **[Submit & Minta Penilaian AI]** → trigger Gemini scoring

**Dummy data generator FA** (gunakan data realistis berbahasa Indonesia):
```javascript
const FA_DUMMY = {
  "07:30": { actual: "Briefing dilakukan, target 4 appointment ditetapkan. Action plan dibagi per slot.", status: "done", notes: "Ada 2 hot prospect dari referral kemarin." },
  "08:00": { actual: "Review pipeline: 5 HOT prospect teridentifikasi. Next action jelas untuk masing-masing.", status: "done", notes: "Prioritas: Pak Budi (Sunter), Bu Ani (Kelapa Gading)" },
  "09:00": { actual: "12 engagement dilakukan, 3 appointment berhasil dijadwalkan.", status: "done", notes: "1 prospect minta reschedule ke besok." },
  "10:00": { actual: "4 lead baru dari referral nasabah existing. 1 lead sangat potensial.", status: "done", notes: "Referral dari Bu Tini — potensi tabungan 200jt" },
  "11:00": { actual: "2 meeting terlaksana. Product presentation berjalan baik, nasabah antusias.", status: "done", notes: "Bu Ani tertarik produk deposito 6 bulan." },
  "12:00": { actual: "Persiapan aplikasi untuk 1 calon nasabah hampir selesai, ada 1 dokumen kurang.", status: "partial", notes: "Tunggu KTP suami dari Bu Ani." },
  "13:00": { actual: "Midday check: 2 slot masih tertinggal. Recovery: reschedule 1 meeting sore.", status: "partial", notes: "Pipeline bergerak tapi perlu push di closing." },
  "14:00": { actual: "1 meeting advisory berjalan sangat baik. Nasabah setuju untuk produk investasi.", status: "done", notes: "Conversion kemungkinan besar besok." },
  "15:00": { actual: "4 follow up closing aktif. 1 sudah konfirmasi mau deal.", status: "done", notes: "Pak Budi konfirmasi mau buka rekening besok pagi." },
  "16:00": { actual: "CRM diupdate 95%. Semua aktivitas hari ini terdokumentasi.", status: "done", notes: "" },
  "17:00": { actual: "Sales coaching 30 menit dengan FWSS. Feedback diterima dan action plan disusun.", status: "done", notes: "Fokus besok: closing Pak Budi + follow up Bu Ani" },
  "18:00": { actual: "Review harian: 4 dari 5 target tercapai. Pipeline untuk besok sudah terkunci.", status: "done", notes: "Target besok: closing 1, appointment baru 3." }
}
```

#### Score Result Page (`/score-result`)
- Animated reveal: tiap score card muncul berurutan dengan delay
- Per aktivitas: label + score badge (1-4 + level) + reasoning + recommendation
- Bottom summary: rata-rata harian + overall recommendation dari Gemini
- Tombol: [Kembali ke Dashboard]

---

### 3. FWSS DASHBOARD & FEATURES

#### Dashboard FWSS
- Sama seperti FA (header, warning banner, score card diri sendiri, heatmap)
- 2 tombol: [Buat Rencana Minggu Ini] + [Input Aktivitas Hari Ini]
- Weekly plan & daily input FWSS menggunakan template slot FWSS:
  ```
  07:30 Daily Recovery Direction & Target Lock
  08:00 Pipeline Control & FA Monitoring
  09:00 Morning Activation & Sales Recovery
  10:00 Branch Opportunity & Lead Activation
  11:00 Case Review & Solution Discussion
  12:00 Recovery Coaching & Result Enforcement
  13:00 Joint Meeting & Assisted Closing
  14:00 Midday Monitoring & Recovery Intervention
  15:00 Closing Push & Conversion Acceleration
  16:00 CRM Monitoring & Activity Discipline
  17:00 Sales Clinic & Recovery Reinforcement
  18:00 End Day Accountability & Direction
  ```
- **Panel Monitoring FA** (2 kartu untuk 2 FA yang dibawahi):
  - Nama FA, cabang
  - Status daily input hari ini (badge: Sudah Dinilai / Draft / Belum Diisi)
  - Score hari ini (angka + level badge berwarna)
  - Progress slot: "X/12 slot selesai"
  - Link ke detail aktivitas FA (read-only view)
- Tombol: **[🤖 Generate Summary FA]**
- Notes dari BM (read-only card, jika ada)

#### Generate Summary FA (`/summary/fwss`)
Flow:
1. Klik tombol → loading spinner "Sedang menganalisis data FA..."
2. Fetch dari Supabase: weekly plan + daily activities + ai_scores untuk 2 FA hari ini
3. Kirim ke Gemini Flash 2.5 dengan prompt terstruktur
4. Tampilkan hasil:
   - Per FA: performance_status badge + summary paragraph + highlights + risks + recommendations
   - Team overall summary
   - Urgent actions list
5. Form di bawah hasil AI:
   - **Notes FWSS** (textarea — apa yang akan dilakukan FWSS merespons kondisi ini)
   - **Action Plan** (checklist, pilih dari template + tambah custom):
     - [ ] Coaching individual dengan [FA name]
     - [ ] Joint meeting / assisted selling
     - [ ] Follow-up pipeline bersama FA
     - [ ] Eskalasi ke BM
     - [ ] Custom action...
6. Tombol [Simpan Notes & Action Plan] → upsert ke `supervisor_summaries`
7. FA dapat melihat notes ini di dashboard mereka

**Prompt Gemini untuk FWSS:**
```
Kamu adalah asisten manajerial FWSS Bank Hana dalam program ICU Class.
Buat ringkasan kinerja FA berikut dalam Bahasa Indonesia.

Data FA 1: [nama, weekly plan, activities hari ini, scores]
Data FA 2: [nama, weekly plan, activities hari ini, scores]

Output HANYA JSON valid:
{
  "fa_summaries": [{
    "fa_id": "",
    "fa_name": "",
    "performance_status": "critical|recovery|on_track|high_impact",
    "summary": "max 150 kata",
    "highlights": ["max 3 poin positif"],
    "risks": ["max 3 poin risiko"],
    "fwss_recommendations": ["max 3 tindakan konkret untuk FWSS"]
  }],
  "team_overall": "ringkasan 2 FA dalam 1 paragraf",
  "urgent_actions": ["tindakan mendesak jika ada"]
}
```

---

### 4. BM DASHBOARD & FEATURES

#### Dashboard BM
- Header, warning banner, score card diri sendiri, heatmap
- 2 tombol: [Buat Rencana Minggu Ini] + [Input Aktivitas Hari Ini]
- Weekly plan & daily input BM menggunakan template slot BM:
  ```
  07:30 Business Direction & Daily Alignment
  08:00 Pipeline Monitoring & Priority Support
  09:00 Morning Support & Team Reinforcement
  10:00 Branch Coordination & Business Opportunity
  11:00 Support High Potential Customer Case
  12:00 Business Reinforcement & Team Support
  13:00 Joint Meeting & Closing Support
  14:00 Midday Monitoring & Recovery Support
  15:00 Escalation Support & Closing Assistance
  16:00 CRM Monitoring & Activity Validation
  17:00 Business Review & Team Reinforcement
  18:00 End Day Review & Planning Besok
  ```
- **Panel Monitoring FWSS** (2 kartu):
  - Status daily FWSS, score FWSS, summary yang sudah digenerate
  - Sub-panel: 2 FA di bawah FWSS ini (score mini)
- Tombol: **[🤖 Generate Summary Tim]**
- Notes dari RH (read-only, jika ada — via `supervisor_summaries` dari rh ke bm)

#### Generate Summary Tim (`/summary/bm`)
- Fetch: semua daily activities + scores FWSS + summary FWSS untuk FA + scores semua FA
- Gemini generate executive summary per FWSS + team overall
- Form: notes BM + action plan BM (template: coaching FWSS, support high-potential case, joint meeting, eskalasi ke RH, custom)
- Simpan ke `supervisor_summaries`
- FWSS bisa baca notes BM di dashboard mereka

---

### 5. RH DASHBOARD & FEATURES

#### Dashboard RH
- Header khusus RH (lebih executive, warna berbeda — gunakan teal-700 sebagai aksen)
- **Tidak ada** weekly plan / daily input (RH bukan sales)
- **Tabel monitoring semua user** (7 rows: BM, 2 FWSS, 4 FA):
  - Kolom: Nama, Role, Cabang, Score Hari Ini, Level, Trend (↑↓→), Status Input
  - Sort by score (default)
  - Warna row sesuai level score
- **Heatmap seluruh tim** — 10 hari × 7 user, grid berwarna
- Tombol: **[🤖 Generate Summary Keseluruhan]**
- Tombol: **[⚠️ Kirim Surat Peringatan]**
- Tab: **Log Surat Peringatan** (history semua warning yang pernah dikirim)

#### Generate Summary Keseluruhan (`/summary/rh`)
- Fetch semua data hari ini: scores semua user + summary BM + summary FWSS
- Gemini generate: executive brief, ranking performa, flagging risiko
- Tampilkan hasil, tidak perlu form notes (RH hanya baca + action via surat peringatan)
- Tombol [⚠️ Kirim Peringatan dari sini] untuk langsung action

**Prompt Gemini untuk RH:**
```
Kamu adalah asisten eksekutif Regional Head Bank Hana dalam program ICU Class.
Buat executive summary kinerja seluruh tim hari ini.

Data BM: [aktivitas + score]
Data FWSS-1: [summary untuk FA, aktivitas sendiri]
Data FWSS-2: [summary untuk FA, aktivitas sendiri]
Data FA (semua 4): [nama, score, level]
Summary BM: [jika ada]

Output HANYA JSON valid:
{
  "executive_summary": "max 200 kata, high-level, bahasa eksekutif",
  "team_overall_status": "critical|recovery|on_track|high_impact",
  "performance_ranking": [
    {"rank": 1, "user_id": "", "name": "", "role": "", "score": 0, "level": ""}
  ],
  "risk_flags": [
    {"user_id": "", "name": "", "issue": "", "urgency": "high|medium|low"}
  ],
  "strategic_recommendations": ["max 3 rekomendasi strategis"],
  "requires_warning_letter": ["user_id list yang disarankan dapat surat peringatan"]
}
```

#### Kirim Surat Peringatan
- Tombol [⚠️ Kirim Surat Peringatan] → buka modal
- Modal berisi:
  - **Pilih target** (multi-select dropdown, semua 7 user bisa dipilih)
  - **Judul surat** (text input)
  - **Isi pesan** (textarea, format bebas)
  - Tombol [Kirim Peringatan]
- Setelah kirim:
  - Insert ke tabel `warnings` (1 row per target user)
  - Target user yang login → muncul **banner merah** di atas dashboard:
    ```
    ⚠️ Anda menerima Surat Peringatan dari RH. [Baca Sekarang]
    ```
  - Klik → modal baca isi surat
  - Klik [Tandai Sudah Dibaca] → update `is_read = true`, banner hilang
- Badge merah di header jika ada warning belum dibaca

---

### 6. AI SCORING — GEMINI FLASH 2.5

#### Endpoint
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}
```

#### Request format
```javascript
{
  contents: [{ parts: [{ text: fullPrompt }] }],
  generationConfig: {
    temperature: 0.3,
    responseMimeType: "application/json"
  }
}
```

#### Scoring Prompt (FA — lengkap, gunakan rubrik dari ARCHITECTURE.md)
```
Kamu adalah evaluator performa ICU Class Bank Hana. Role user: Financial Advisor (FA).

Rubrik scoring per aktivitas:

Morning Briefing:
- Score 1: Tidak memiliki target & action plan
- Score 2: Target ada, action plan belum lengkap
- Score 3: Target, pipeline & action plan harian jelas
- Score 4: Target sangat jelas, urgency execution tinggi

[... semua rubrik dari ARCHITECTURE.md section 10 ...]

Evaluasi aktivitas berikut. Output HANYA JSON valid:
{
  "scores": [{
    "time": "07:30",
    "label": "Morning Briefing & Target Commitment",
    "score": 1-4,
    "level": "CRITICAL|RECOVERY|ON TRACK|HIGH IMPACT",
    "reasoning": "alasan singkat bahasa Indonesia max 50 kata",
    "recommendation": "saran konkret bahasa Indonesia max 50 kata"
  }],
  "daily_average": 0.0,
  "daily_level": "...",
  "summary": "ringkasan performa hari ini max 100 kata",
  "overall_recommendation": "saran utama untuk besok max 50 kata"
}

Aktivitas yang dievaluasi:
{activitiesJSON}
```

Buat prompt serupa untuk role FWSS dan BM berdasarkan rubrik scoring di ARCHITECTURE.md.

---

### 7. IMAGE UPLOAD

```javascript
// Client-side compression sebelum upload ke Supabase Storage
async function compressImage(file, maxKB = 500) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, Math.sqrt((maxKB * 1024) / file.size));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// Upload ke Supabase Storage
async function uploadActivityImage(supabase, userId, date, timeSlot, file) {
  const compressed = await compressImage(file);
  const uuid = crypto.randomUUID();
  const timeForPath = timeSlot.replace(':', '-'); // 07:30 → 07-30
  const path = `${userId}/${date}/${timeForPath}_${uuid}.jpg`;
  
  const { data, error } = await supabase.storage
    .from('activity-images')
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: true });
  
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from('activity-images')
    .getPublicUrl(path);
  
  return { path, url: urlData.publicUrl };
}
```

---

### 8. SUPABASE CLIENT SETUP

```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Set user context untuk RLS (setelah login)
export function setUserContext(userId) {
  // Untuk MVP tanpa Supabase Auth penuh, gunakan anon key
  // Data filtering dilakukan di query level (where user_id = ...)
  localStorage.setItem('icu_user_id', userId);
}
```

---

### 9. STRUKTUR FILE PROYEK

```
src/
├── main.jsx
├── App.jsx                    ← Router utama
├── lib/
│   ├── supabase.js            ← Supabase client
│   ├── gemini.js              ← Gemini API calls
│   ├── dummyData.js           ← Dummy data generators (FA/FWSS/BM)
│   └── utils.js               ← Helpers: date, week ID, score colors, dll
├── contexts/
│   └── AuthContext.jsx        ← User session context
├── components/
│   ├── Layout.jsx             ← Header + bottom nav wrapper
│   ├── ScoreBadge.jsx         ← Reusable score badge (1-4 + warna)
│   ├── Heatmap.jsx            ← 10-hari heatmap component
│   ├── WarningBanner.jsx      ← Banner surat peringatan
│   ├── ActivitySlot.jsx       ← Satu time slot di daily input
│   └── UserCard.jsx           ← Card user di login page
├── pages/
│   ├── Login.jsx              ← Grid 8 user cards
│   ├── fa/
│   │   ├── Dashboard.jsx
│   │   ├── WeeklyPlan.jsx
│   │   ├── DailyInput.jsx
│   │   └── ScoreResult.jsx
│   ├── fwss/
│   │   ├── Dashboard.jsx
│   │   ├── WeeklyPlan.jsx
│   │   ├── DailyInput.jsx
│   │   └── Summary.jsx
│   ├── bm/
│   │   ├── Dashboard.jsx
│   │   ├── WeeklyPlan.jsx
│   │   ├── DailyInput.jsx
│   │   └── Summary.jsx
│   └── rh/
│       ├── Dashboard.jsx
│       ├── Summary.jsx
│       └── WarningModal.jsx
└── constants/
    ├── timeSlots.js           ← Template slot per role (FA/FWSS/BM)
    └── scoringRubric.js       ← Rubrik scoring lengkap per role
```

---

### 10. ROUTING (React Router v6)

```javascript
// App.jsx
<Routes>
  <Route path="/" element={<Login />} />
  <Route path="/dashboard/fa" element={<ProtectedRoute role="FA"><FADashboard /></ProtectedRoute>} />
  <Route path="/dashboard/fwss" element={<ProtectedRoute role="FWSS"><FWSSDashboard /></ProtectedRoute>} />
  <Route path="/dashboard/bm" element={<ProtectedRoute role="BM"><BMDashboard /></ProtectedRoute>} />
  <Route path="/dashboard/rh" element={<ProtectedRoute role="RH"><RHDashboard /></ProtectedRoute>} />
  <Route path="/weekly-plan" element={<ProtectedRoute><WeeklyPlan /></ProtectedRoute>} />
  <Route path="/daily-input" element={<ProtectedRoute><DailyInput /></ProtectedRoute>} />
  <Route path="/score-result" element={<ProtectedRoute><ScoreResult /></ProtectedRoute>} />
  <Route path="/summary/fwss" element={<ProtectedRoute role="FWSS"><FWSSSummary /></ProtectedRoute>} />
  <Route path="/summary/bm" element={<ProtectedRoute role="BM"><BMSummary /></ProtectedRoute>} />
  <Route path="/summary/rh" element={<ProtectedRoute role="RH"><RHSummary /></ProtectedRoute>} />
</Routes>
```

---

### 11. SCORING RUBRIC CONSTANTS (lengkap, masukkan ke `constants/scoringRubric.js`)

Gunakan seluruh rubrik dari section **10. SCORING RUBRIC** di `docs/ARCHITECTURE.md` untuk:
- FA: 9 aktivitas × 4 level
- FWSS: 12 aktivitas × 4 level
- BM: 12 aktivitas × 4 level

Struktur:
```javascript
export const FA_RUBRIC = {
  "07:30": {
    label: "Morning Briefing & Target Commitment",
    criteria: {
      1: "Tidak memiliki target & action plan",
      2: "Target ada, action plan belum lengkap",
      3: "Target, pipeline & action plan harian jelas",
      4: "Target sangat jelas, urgency execution tinggi"
    }
  },
  // ... semua slot
}
```

---

## INSTRUKSI PEMBANGUNAN

### Urutan pengerjaan yang disarankan:
1. Setup project (Vite + React + Tailwind + dependencies)
2. Setup Supabase client + jalankan schema SQL + seed users
3. `AuthContext` + Login page (8 user cards, one-click login)
4. Layout component (header + navigation)
5. FA Dashboard (lengkap dengan warning banner, score card, heatmap)
6. FA Weekly Plan form
7. FA Daily Input (timeline, upload gambar, tambah/hapus dummy)
8. Gemini scoring integration + Score Result page
9. FWSS Dashboard + monitoring FA
10. FWSS Generate Summary (Gemini summary + notes form)
11. BM Dashboard + monitoring FWSS
12. BM Generate Summary
13. RH Dashboard (tabel semua user + heatmap)
14. RH Generate Summary
15. Surat Peringatan (kirim + notif di dashboard target)
16. Polish: animasi, loading states, error handling, responsive

### Hal yang WAJIB dijaga:
- **Mobile-first:** semua UI harus nyaman di layar 375px
- **Dark theme:** konsisten, jangan ada background putih di luar login
- **Bahasa Indonesia:** semua label, pesan, placeholder
- **Error handling:** semua Gemini API call dan Supabase call harus punya try/catch + user feedback
- **Loading states:** spinner/skeleton saat fetch data atau generate AI
- **Logo Bank Hana:** tampil di login page dan header (gunakan file dari `assets/`)
- **is_dummy flag:** selalu set `is_dummy: true` saat insert data dummy, agar bisa dibedakan dari data asli
- **Auto-save:** daily input auto-save draft ke Supabase setiap 30 detik

### Hal yang TIDAK perlu:
- Server-side rendering
- Auth Supabase penuh (gunakan anon key + filter by user_id di query)
- Push notification (cukup poll/check saat load dashboard)
- Pagination (data masih kecil untuk MVP)

---

## SELESAI

Bangun aplikasi ini secara lengkap, production-ready, dan dengan kualitas UI yang tinggi sesuai brand Bank Hana. Prioritaskan fungsionalitas penuh daripada fitur tambahan yang tidak diminta.
