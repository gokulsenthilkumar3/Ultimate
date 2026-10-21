/**
 * SQLite schema
 * NOTE: PRAGMAs are intentionally NOT included here.
 * They must be run separately via db.execAsync() before this DDL
 * because expo-sqlite v16 does not allow mixing PRAGMAs inside a
 * multi-statement execAsync block reliably.
 */

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    icon       TEXT,
    color      TEXT,
    parent_id  INTEGER REFERENCES categories(id),
    is_system  INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payment_modes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    is_system INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    amount          REAL NOT NULL,
    date            TEXT NOT NULL,
    category_id     INTEGER REFERENCES categories(id),
    subcategory_id  INTEGER REFERENCES categories(id),
    payment_mode_id INTEGER REFERENCES payment_modes(id),
    note            TEXT,
    tags            TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recurring_templates (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL CHECK(type IN ('fixed','installment','variable')),
    category_id     INTEGER REFERENCES categories(id),
    payment_mode_id INTEGER REFERENCES payment_modes(id),
    amount          REAL,
    total_periods   INTEGER,
    paid_periods    INTEGER DEFAULT 0,
    installment_amt REAL,
    min_amount      REAL,
    max_amount      REAL,
    frequency       TEXT NOT NULL CHECK(frequency IN ('daily','weekly','monthly','yearly')),
    start_date      TEXT NOT NULL,
    end_date        TEXT,
    next_due_date   TEXT NOT NULL,
    reminder_days   INTEGER DEFAULT 1,
    reminder_on_due INTEGER DEFAULT 1,
    status          TEXT DEFAULT 'active' CHECK(status IN ('active','paused','completed')),
    note            TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recurring_entries (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id      INTEGER NOT NULL REFERENCES recurring_templates(id),
    due_date         TEXT NOT NULL,
    actual_amount    REAL,
    status           TEXT DEFAULT 'pending' CHECK(status IN ('pending','paid','missed','skipped')),
    paid_date        TEXT,
    note             TEXT,
    notification_ids TEXT DEFAULT '[]',
    created_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    month       TEXT NOT NULL,
    category_id INTEGER,
    amount      REAL NOT NULL,
    alert_pct   INTEGER DEFAULT 80,
    created_at  TEXT DEFAULT (datetime('now')),
    UNIQUE(month, COALESCE(category_id, 0))
  );

  CREATE TABLE IF NOT EXISTS notifications_log (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    type     TEXT NOT NULL,
    ref_id   INTEGER,
    ref_type TEXT,
    message  TEXT,
    sent_at  TEXT DEFAULT (datetime('now')),
    action   TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date);
  CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
  CREATE INDEX IF NOT EXISTS idx_recurring_due     ON recurring_entries(due_date);
  CREATE INDEX IF NOT EXISTS idx_recurring_status  ON recurring_entries(status);
  CREATE INDEX IF NOT EXISTS idx_budgets_month     ON budgets(month);
`;

export const SEED_DEFAULTS_SQL = `
  INSERT OR IGNORE INTO categories (id, name, icon, color, is_system) VALUES
    (1,  'Food & Dining',   '🍽️',  '#f97316', 1),
    (2,  'Transport',       '🚗',  '#3b82f6', 1),
    (3,  'Groceries',       '🛒',  '#22c55e', 1),
    (4,  'Bills & Utilities','💡',  '#eab308', 1),
    (5,  'Entertainment',   '🎬',  '#8b5cf6', 1),
    (6,  'Health',          '💊',  '#ec4899', 1),
    (7,  'Shopping',        '🛍️',  '#06b6d4', 1),
    (8,  'Education',       '📚',  '#6366f1', 1),
    (9,  'Rent',            '🏠',  '#64748b', 1),
    (10, 'Savings',         '💰',  '#01696f', 1),
    (11, 'Personal Care',   '✂️',  '#a16207', 1),
    (12, 'Others',          '📦',  '#374151', 1);

  INSERT OR IGNORE INTO payment_modes (id, name, is_system) VALUES
    (1, 'Cash',        1),
    (2, 'UPI',         1),
    (3, 'Credit Card', 1),
    (4, 'Debit Card',  1),
    (5, 'Net Banking', 1),
    (6, 'Wallet',      1);
`;
