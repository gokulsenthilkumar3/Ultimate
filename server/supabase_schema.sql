-- GrowthTrack Ultimate — Supabase Schema (Phase 1 DB Foundation + Phase 2 metrics)
-- Run this in: Supabase Dashboard → SQL Editor → New Query

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low','medium','high')),
  tag TEXT,
  "dueDate" DATE,
  done BOOLEAN DEFAULT FALSE,
  recurring BOOLEAN DEFAULT FALSE,
  frequency TEXT,
  "lastDone" TEXT,
  "completedAt" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'user',
  modified_at TIMESTAMPTZ DEFAULT NOW(),
  modified_by TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS shopping (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  priority TEXT CHECK (priority IN ('low','medium','high')),
  "estimatedCost" NUMERIC,
  quantity INTEGER DEFAULT 1,
  purchased BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'user',
  modified_at TIMESTAMPTZ DEFAULT NOW(),
  modified_by TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS timesheet (
  id BIGSERIAL PRIMARY KEY,
  task TEXT,
  duration INTEGER,
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'user',
  modified_at TIMESTAMPTZ DEFAULT NOW(),
  modified_by TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS finance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('income','expense','investment')),
  category TEXT,
  amount NUMERIC NOT NULL,
  note TEXT,
  method TEXT,
  date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  limit_amount NUMERIC NOT NULL,
  period TEXT DEFAULT 'monthly',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metric_logs (
  id BIGSERIAL PRIMARY KEY,
  data TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  action TEXT,
  table_name TEXT,
  item_id TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_name TEXT DEFAULT 'System',
  actor_email TEXT DEFAULT 'admin@growthtrack.ultimate',
  actor_ip TEXT
);

CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'system',
  modified_at TIMESTAMPTZ DEFAULT NOW(),
  modified_by TEXT DEFAULT 'system'
);
CREATE TABLE IF NOT EXISTS training_plan (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS nutrition_strategy (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS lifestyle_tips (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS medical_data (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS physique_targets (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS assessment_qa (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS skills (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS calendar_events (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS notes (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled',
  content TEXT DEFAULT '',
  color TEXT DEFAULT '#e5a50a',
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  deadline DATE,
  done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sleep_logs (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  bed_time TEXT,
  wake_time TEXT,
  duration NUMERIC,
  quality INTEGER CHECK (quality BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  size TEXT,
  date TEXT,
  type TEXT DEFAULT 'Private',
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  cost NUMERIC NOT NULL,
  category TEXT DEFAULT 'General',
  next_date DATE,
  auto_renew BOOLEAN DEFAULT TRUE,
  icon TEXT DEFAULT '📦',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habits (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🏃',
  streak INTEGER DEFAULT 0,
  completed_dates TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entertainment (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT,
  category TEXT,
  status TEXT CHECK (status IN ('watching','completed','plan_to_watch','dropped','on_hold')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 10),
  progress INTEGER DEFAULT 0,
  poster TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health_extras (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  vision_score INTEGER CHECK (vision_score BETWEEN 0 AND 100),
  hearing_score INTEGER,
  smell_score INTEGER,
  taste_score INTEGER,
  touch_score INTEGER,
  gut_biome_score INTEGER,
  dermatology_score INTEGER,
  hair_vitality_score INTEGER,
  bronco_level NUMERIC,
  posture_status TEXT,
  active_diets TEXT DEFAULT '[]',
  hobbies TEXT DEFAULT '[]',
  hrv_score INTEGER,
  stress_load_score INTEGER,
  recovery_index_score INTEGER,
  modified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mood_logs (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  mood INTEGER CHECK (mood BETWEEN 1 AND 10),
  energy INTEGER CHECK (energy BETWEEN 1 AND 10),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id BIGSERIAL PRIMARY KEY,
  habit_id BIGINT REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (habit_id, date)
);

CREATE TABLE IF NOT EXISTS goal_progress_logs (
  id BIGSERIAL PRIMARY KEY,
  goal_id BIGINT REFERENCES goals(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  note TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  meal_type TEXT CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  food_name TEXT,
  calories NUMERIC,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  notes TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INTEGER,
  reps INTEGER,
  weight_kg NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS progress_photos (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  url TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vitals_logs (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  type TEXT NOT NULL,
  value NUMERIC,
  unit TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medications (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  dose TEXT,
  frequency TEXT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_articles (
  id BIGSERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  source TEXT,
  date_saved TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE shopping DISABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet DISABLE ROW LEVEL SECURITY;
ALTER TABLE finance DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE metric_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile DISABLE ROW LEVEL SECURITY;
ALTER TABLE training_plan DISABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_strategy DISABLE ROW LEVEL SECURITY;
ALTER TABLE lifestyle_tips DISABLE ROW LEVEL SECURITY;
ALTER TABLE medical_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE physique_targets DISABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_qa DISABLE ROW LEVEL SECURITY;
ALTER TABLE skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE habits DISABLE ROW LEVEL SECURITY;
ALTER TABLE entertainment DISABLE ROW LEVEL SECURITY;
ALTER TABLE health_extras DISABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE goal_progress_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE vitals_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE medications DISABLE ROW LEVEL SECURITY;
ALTER TABLE saved_articles DISABLE ROW LEVEL SECURITY;
