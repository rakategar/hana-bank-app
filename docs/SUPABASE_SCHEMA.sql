-- ============================================
-- ICU CLASS BANK HANA — Supabase Schema FINAL
-- v4.0 | 30 Mei 2026
-- ============================================

-- ── USERS ──────────────────────────────────
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('FA','FWSS','BM','RH')),
  branch        TEXT,
  supervisor_id TEXT REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── WEEKLY PLANS ───────────────────────────
CREATE TABLE weekly_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL REFERENCES users(id),
  week_id      TEXT NOT NULL,
  role         TEXT NOT NULL,
  submitted_at TIMESTAMPTZ,
  is_locked    BOOLEAN DEFAULT false,
  slots        JSONB NOT NULL DEFAULT '[]',
  -- slot: { time, label, prospect, location, objective }
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_id)
);

-- ── DAILY ACTIVITIES ───────────────────────
CREATE TABLE daily_activities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL REFERENCES users(id),
  date         DATE NOT NULL,
  role         TEXT NOT NULL,
  is_dummy     BOOLEAN DEFAULT false,
  status       TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','scored')),
  submitted_at TIMESTAMPTZ,
  activities   JSONB NOT NULL DEFAULT '[]',
  -- activity: { time, label, planned, actual,
  --             activity_status(done|partial|not_done),
  --             notes, image_path, image_url }
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ── AI SCORES ──────────────────────────────
CREATE TABLE ai_scores (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                TEXT NOT NULL REFERENCES users(id),
  date                   DATE NOT NULL,
  role                   TEXT NOT NULL,
  daily_activity_id      UUID REFERENCES daily_activities(id),
  is_dummy               BOOLEAN DEFAULT false,
  scores                 JSONB NOT NULL DEFAULT '[]',
  -- score: { time, label, score(1-4), level, reasoning, recommendation }
  daily_average          NUMERIC(3,2),
  daily_level            TEXT,
  summary                TEXT,
  overall_recommendation TEXT,
  scored_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ── SUPERVISOR SUMMARIES ───────────────────
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
  -- action: { id, type(template|custom), label, is_completed }
  generated_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(supervisor_id, target_user_id, date, session_label)
);

-- ── WARNINGS (Surat Peringatan dari RH) ────
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

-- ── ACTIVITY IMAGES ────────────────────────
CREATE TABLE activity_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL REFERENCES users(id),
  date         DATE NOT NULL,
  time_slot    TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  -- format: {user_id}/{YYYY-MM-DD}/{HH-MM}_{uuid}.jpg
  public_url   TEXT,
  file_size_kb INTEGER,
  uploaded_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_weekly_plans_user_week     ON weekly_plans(user_id, week_id);
CREATE INDEX idx_daily_activities_user_date ON daily_activities(user_id, date);
CREATE INDEX idx_ai_scores_user_date        ON ai_scores(user_id, date);
CREATE INDEX idx_supervisor_summaries_sup   ON supervisor_summaries(supervisor_id, date);
CREATE INDEX idx_warnings_to_id             ON warnings(to_id, is_read);
CREATE INDEX idx_activity_images_user       ON activity_images(user_id, date);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scores            ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE warnings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_images      ENABLE ROW LEVEL SECURITY;

-- Simple policy: allow all for authenticated (MVP — tighten later)
CREATE POLICY "allow_all_authenticated" ON users               FOR ALL USING (true);
CREATE POLICY "allow_all_authenticated" ON weekly_plans        FOR ALL USING (true);
CREATE POLICY "allow_all_authenticated" ON daily_activities    FOR ALL USING (true);
CREATE POLICY "allow_all_authenticated" ON ai_scores           FOR ALL USING (true);
CREATE POLICY "allow_all_authenticated" ON supervisor_summaries FOR ALL USING (true);
CREATE POLICY "allow_all_authenticated" ON warnings            FOR ALL USING (true);
CREATE POLICY "allow_all_authenticated" ON activity_images     FOR ALL USING (true);

-- ============================================
-- SEED: DUMMY USERS
-- ============================================
INSERT INTO users (id, name, role, branch, supervisor_id) VALUES
('rh_001',   'Budi Hartono',    'RH',   'Regional Jakarta',       NULL),
('bm_001',   'Drs. Agus Salim', 'BM',   'Regional Jakarta',       'rh_001'),
('fwss_001', 'Hendra Wijaya',   'FWSS', 'Cabang Jakarta Pusat',   'bm_001'),
('fwss_002', 'Maya Sari',       'FWSS', 'Cabang Jakarta Selatan', 'bm_001'),
('fa_001',   'Andi Pratama',    'FA',   'Cabang Jakarta Pusat',   'fwss_001'),
('fa_002',   'Sari Dewi',       'FA',   'Cabang Jakarta Pusat',   'fwss_001'),
('fa_003',   'Budi Santoso',    'FA',   'Cabang Jakarta Selatan', 'fwss_002'),
('fa_004',   'Rina Marlina',    'FA',   'Cabang Jakarta Selatan', 'fwss_002');

-- ============================================
-- STORAGE BUCKET SETUP (via Supabase Dashboard)
-- ============================================
-- 1. Storage > New bucket: "activity-images", private
-- 2. Policy: authenticated can upload/read their own files
-- Naming: {user_id}/{YYYY-MM-DD}/{HH-MM}_{uuid}.jpg
