-- GrowthTrack Ultimate — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- Core tables
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('low','medium','high')),
  tag TEXT,
  "dueDate" TEXT,
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
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'user',
  modified_at TIMESTAMPTZ DEFAULT NOW(),
  modified_by TEXT DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS finance (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  category TEXT,
  amount NUMERIC NOT NULL,
  note TEXT,
  method TEXT,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
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

-- Singleton tables (one row each, enforced by PK = 1)
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

-- Feature tables
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
  deadline TEXT,
  done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  modified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sleep_logs (
  id BIGSERIAL PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
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
  next_date TEXT,
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

-- Disable Row Level Security (personal single-user app — access controlled via service key)
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
