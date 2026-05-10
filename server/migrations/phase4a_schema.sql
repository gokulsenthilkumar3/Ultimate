-- ============================================================
-- Phase 4A Schema Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. hydration_logs
CREATE TABLE IF NOT EXISTS hydration_logs (
  id          BIGSERIAL PRIMARY KEY,
  amount_ml   INTEGER NOT NULL CHECK (amount_ml > 0),
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hydration_logs_logged_at ON hydration_logs (logged_at DESC);

-- 2. nutrition_logs
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id          BIGSERIAL PRIMARY KEY,
  meal        TEXT NOT NULL CHECK (meal IN ('breakfast', 'lunch', 'dinner', 'snack')),
  calories    NUMERIC(8,2),
  protein_g   NUMERIC(8,2),
  carbs_g     NUMERIC(8,2),
  fat_g       NUMERIC(8,2),
  notes       TEXT,
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_logged_at ON nutrition_logs (logged_at DESC);

-- 3. audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  module      TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW')),
  record_id   TEXT,
  details     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_module   ON audit_log (module);
CREATE INDEX IF NOT EXISTS idx_audit_log_action   ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created  ON audit_log (created_at DESC);

-- 4. progress_photos
CREATE TABLE IF NOT EXISTS progress_photos (
  id          BIGSERIAL PRIMARY KEY,
  url         TEXT NOT NULL,
  date        DATE NOT NULL,
  notes       TEXT,
  weight_kg   NUMERIC(5,2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_progress_photos_date ON progress_photos (date DESC);

-- 5. goal_progress_logs
CREATE TABLE IF NOT EXISTS goal_progress_logs (
  id          BIGSERIAL PRIMARY KEY,
  goal_id     BIGINT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  value       NUMERIC NOT NULL,
  date        DATE NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_goal_progress_logs_goal_id ON goal_progress_logs (goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_logs_date    ON goal_progress_logs (date DESC);

-- 6. ai_chat_history
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id          BIGSERIAL PRIMARY KEY,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_created ON ai_chat_history (created_at ASC);

-- ============================================================
-- ALTER existing tables
-- ============================================================

-- finance: add method column, allow 'investment' type, cast date to DATE
ALTER TABLE finance
  ADD COLUMN IF NOT EXISTS method TEXT,
  ALTER COLUMN date TYPE DATE USING date::DATE;

ALTER TABLE finance DROP CONSTRAINT IF EXISTS finance_type_check;
ALTER TABLE finance ADD CONSTRAINT finance_type_check
  CHECK (type IN ('income', 'expense', 'investment'));

-- shopping: add quantity, allow 'urgent' priority
ALTER TABLE shopping
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0);

ALTER TABLE shopping DROP CONSTRAINT IF EXISTS shopping_priority_check;
ALTER TABLE shopping ADD CONSTRAINT shopping_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- tasks: add description and parent_task_id for subtasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS parent_task_id BIGINT REFERENCES tasks(id) ON DELETE SET NULL;

-- documents: change size to BIGINT
ALTER TABLE documents
  ALTER COLUMN size TYPE BIGINT USING size::BIGINT;

-- goals: change deadline to DATE
ALTER TABLE goals
  ALTER COLUMN deadline TYPE DATE USING deadline::DATE;

-- ============================================================
-- Verify: SELECT table_name FROM information_schema.tables
--         WHERE table_schema = 'public' ORDER BY table_name;
-- ============================================================
