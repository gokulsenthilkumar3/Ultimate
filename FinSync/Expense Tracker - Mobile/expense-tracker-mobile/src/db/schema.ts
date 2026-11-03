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
    amount_minor INTEGER,
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
    amount_minor INTEGER,
    total_periods   INTEGER,
    paid_periods    INTEGER DEFAULT 0,
    installment_amt REAL,
    installment_amt_minor INTEGER,
    min_amount      REAL,
    min_amount_minor INTEGER,
    max_amount      REAL,
    max_amount_minor INTEGER,
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
    actual_amount_minor INTEGER,
    status           TEXT DEFAULT 'pending' CHECK(status IN ('pending','paid','missed','skipped')),
    paid_date        TEXT,
    note             TEXT,
    notification_ids TEXT DEFAULT '[]',
    created_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    month       TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    amount      REAL NOT NULL,
    amount_minor INTEGER,
    alert_pct   INTEGER DEFAULT 80,
    created_at  TEXT DEFAULT (datetime('now'))
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

  CREATE TRIGGER IF NOT EXISTS expenses_money_insert BEFORE INSERT ON expenses
  WHEN (NEW.amount IS NOT NULL AND (abs(NEW.amount) > 1000000000000 OR NEW.amount != round(NEW.amount, 2)))
  BEGIN SELECT RAISE(ABORT, 'Money requires at most two decimal places'); END;
  CREATE TRIGGER IF NOT EXISTS expenses_money_update BEFORE UPDATE ON expenses
  WHEN (NEW.amount IS NOT NULL AND (abs(NEW.amount) > 1000000000000 OR NEW.amount != round(NEW.amount, 2)))
  BEGIN SELECT RAISE(ABORT, 'Money requires at most two decimal places'); END;
  CREATE TRIGGER IF NOT EXISTS budgets_money_insert BEFORE INSERT ON budgets
  WHEN (NEW.amount IS NOT NULL AND (abs(NEW.amount) > 1000000000000 OR NEW.amount != round(NEW.amount, 2)))
  BEGIN SELECT RAISE(ABORT, 'Money requires at most two decimal places'); END;
  CREATE TRIGGER IF NOT EXISTS budgets_money_update BEFORE UPDATE ON budgets
  WHEN (NEW.amount IS NOT NULL AND (abs(NEW.amount) > 1000000000000 OR NEW.amount != round(NEW.amount, 2)))
  BEGIN SELECT RAISE(ABORT, 'Money requires at most two decimal places'); END;
  CREATE TRIGGER IF NOT EXISTS recurring_templates_money_insert BEFORE INSERT ON recurring_templates
  WHEN (NEW.amount IS NOT NULL AND (abs(NEW.amount) > 1000000000000 OR NEW.amount != round(NEW.amount, 2))) OR (NEW.installment_amt IS NOT NULL AND (abs(NEW.installment_amt) > 1000000000000 OR NEW.installment_amt != round(NEW.installment_amt, 2))) OR (NEW.min_amount IS NOT NULL AND (abs(NEW.min_amount) > 1000000000000 OR NEW.min_amount != round(NEW.min_amount, 2))) OR (NEW.max_amount IS NOT NULL AND (abs(NEW.max_amount) > 1000000000000 OR NEW.max_amount != round(NEW.max_amount, 2)))
  BEGIN SELECT RAISE(ABORT, 'Money requires at most two decimal places'); END;
  CREATE TRIGGER IF NOT EXISTS recurring_templates_money_update BEFORE UPDATE ON recurring_templates
  WHEN (NEW.amount IS NOT NULL AND (abs(NEW.amount) > 1000000000000 OR NEW.amount != round(NEW.amount, 2))) OR (NEW.installment_amt IS NOT NULL AND (abs(NEW.installment_amt) > 1000000000000 OR NEW.installment_amt != round(NEW.installment_amt, 2))) OR (NEW.min_amount IS NOT NULL AND (abs(NEW.min_amount) > 1000000000000 OR NEW.min_amount != round(NEW.min_amount, 2))) OR (NEW.max_amount IS NOT NULL AND (abs(NEW.max_amount) > 1000000000000 OR NEW.max_amount != round(NEW.max_amount, 2)))
  BEGIN SELECT RAISE(ABORT, 'Money requires at most two decimal places'); END;
  CREATE TRIGGER IF NOT EXISTS recurring_entries_money_insert BEFORE INSERT ON recurring_entries
  WHEN (NEW.actual_amount IS NOT NULL AND (abs(NEW.actual_amount) > 1000000000000 OR NEW.actual_amount != round(NEW.actual_amount, 2)))
  BEGIN SELECT RAISE(ABORT, 'Money requires at most two decimal places'); END;
  CREATE TRIGGER IF NOT EXISTS recurring_entries_money_update BEFORE UPDATE ON recurring_entries
  WHEN (NEW.actual_amount IS NOT NULL AND (abs(NEW.actual_amount) > 1000000000000 OR NEW.actual_amount != round(NEW.actual_amount, 2)))
  BEGIN SELECT RAISE(ABORT, 'Money requires at most two decimal places'); END;

  CREATE TRIGGER IF NOT EXISTS expenses_money_sync_insert AFTER INSERT ON expenses
  WHEN NEW.amount_minor IS NOT CAST(round(NEW.amount * 100) AS INTEGER)
  BEGIN UPDATE expenses SET amount_minor=CAST(round(NEW.amount * 100) AS INTEGER) WHERE id=NEW.id; END;
  CREATE TRIGGER IF NOT EXISTS expenses_money_sync_update AFTER UPDATE ON expenses
  WHEN NEW.amount_minor IS NOT CAST(round(NEW.amount * 100) AS INTEGER)
  BEGIN UPDATE expenses SET amount_minor=CAST(round(NEW.amount * 100) AS INTEGER) WHERE id=NEW.id; END;
  CREATE TRIGGER IF NOT EXISTS budgets_money_sync_insert AFTER INSERT ON budgets
  WHEN NEW.amount_minor IS NOT CAST(round(NEW.amount * 100) AS INTEGER)
  BEGIN UPDATE budgets SET amount_minor=CAST(round(NEW.amount * 100) AS INTEGER) WHERE id=NEW.id; END;
  CREATE TRIGGER IF NOT EXISTS budgets_money_sync_update AFTER UPDATE ON budgets
  WHEN NEW.amount_minor IS NOT CAST(round(NEW.amount * 100) AS INTEGER)
  BEGIN UPDATE budgets SET amount_minor=CAST(round(NEW.amount * 100) AS INTEGER) WHERE id=NEW.id; END;
  CREATE TRIGGER IF NOT EXISTS recurring_templates_money_sync_insert AFTER INSERT ON recurring_templates
  WHEN NEW.amount_minor IS NOT CAST(round(NEW.amount * 100) AS INTEGER) OR NEW.installment_amt_minor IS NOT CAST(round(NEW.installment_amt * 100) AS INTEGER) OR NEW.min_amount_minor IS NOT CAST(round(NEW.min_amount * 100) AS INTEGER) OR NEW.max_amount_minor IS NOT CAST(round(NEW.max_amount * 100) AS INTEGER)
  BEGIN UPDATE recurring_templates SET amount_minor=CAST(round(NEW.amount * 100) AS INTEGER), installment_amt_minor=CAST(round(NEW.installment_amt * 100) AS INTEGER), min_amount_minor=CAST(round(NEW.min_amount * 100) AS INTEGER), max_amount_minor=CAST(round(NEW.max_amount * 100) AS INTEGER) WHERE id=NEW.id; END;
  CREATE TRIGGER IF NOT EXISTS recurring_templates_money_sync_update AFTER UPDATE ON recurring_templates
  WHEN NEW.amount_minor IS NOT CAST(round(NEW.amount * 100) AS INTEGER) OR NEW.installment_amt_minor IS NOT CAST(round(NEW.installment_amt * 100) AS INTEGER) OR NEW.min_amount_minor IS NOT CAST(round(NEW.min_amount * 100) AS INTEGER) OR NEW.max_amount_minor IS NOT CAST(round(NEW.max_amount * 100) AS INTEGER)
  BEGIN UPDATE recurring_templates SET amount_minor=CAST(round(NEW.amount * 100) AS INTEGER), installment_amt_minor=CAST(round(NEW.installment_amt * 100) AS INTEGER), min_amount_minor=CAST(round(NEW.min_amount * 100) AS INTEGER), max_amount_minor=CAST(round(NEW.max_amount * 100) AS INTEGER) WHERE id=NEW.id; END;
  CREATE TRIGGER IF NOT EXISTS recurring_entries_money_sync_insert AFTER INSERT ON recurring_entries
  WHEN NEW.actual_amount_minor IS NOT CAST(round(NEW.actual_amount * 100) AS INTEGER)
  BEGIN UPDATE recurring_entries SET actual_amount_minor=CAST(round(NEW.actual_amount * 100) AS INTEGER) WHERE id=NEW.id; END;
  CREATE TRIGGER IF NOT EXISTS recurring_entries_money_sync_update AFTER UPDATE ON recurring_entries
  WHEN NEW.actual_amount_minor IS NOT CAST(round(NEW.actual_amount * 100) AS INTEGER)
  BEGIN UPDATE recurring_entries SET actual_amount_minor=CAST(round(NEW.actual_amount * 100) AS INTEGER) WHERE id=NEW.id; END;
  CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date);
  CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
  CREATE INDEX IF NOT EXISTS idx_recurring_due     ON recurring_entries(due_date);
  CREATE INDEX IF NOT EXISTS idx_recurring_status  ON recurring_entries(status);
  CREATE INDEX IF NOT EXISTS idx_budgets_month     ON budgets(month);
  CREATE UNIQUE INDEX IF NOT EXISTS budgets_month_category_unique ON budgets(month, COALESCE(category_id, 0));
  CREATE UNIQUE INDEX IF NOT EXISTS recurring_template_due_unique ON recurring_entries(template_id, due_date);

  -- Existing budgets tables predate the category FK. Triggers enforce the same
  -- relationship without rebuilding the table or discarding installed data.
  CREATE TRIGGER IF NOT EXISTS budgets_category_insert BEFORE INSERT ON budgets
  WHEN NEW.category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE id = NEW.category_id)
  BEGIN SELECT RAISE(ABORT, 'Budget category does not exist'); END;
  CREATE TRIGGER IF NOT EXISTS budgets_category_update BEFORE UPDATE OF category_id ON budgets
  WHEN NEW.category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE id = NEW.category_id)
  BEGIN SELECT RAISE(ABORT, 'Budget category does not exist'); END;
  CREATE TRIGGER IF NOT EXISTS categories_budget_delete BEFORE DELETE ON categories
  WHEN EXISTS (SELECT 1 FROM budgets WHERE category_id = OLD.id)
  BEGIN SELECT RAISE(ABORT, 'Category is referenced by a budget'); END;
  CREATE TRIGGER IF NOT EXISTS categories_budget_update BEFORE UPDATE OF id ON categories
  WHEN NEW.id != OLD.id AND EXISTS (SELECT 1 FROM budgets WHERE category_id = OLD.id)
  BEGIN SELECT RAISE(ABORT, 'Category is referenced by a budget'); END;
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

// Existing installations retain decimal columns for compatibility. Integer mirrors
// are added without rebuilding or deleting tables; validation refuses lossy conversion.
export const MONEY_COLUMNS: Record<string, string[]> = {
  expenses: ['amount'], budgets: ['amount'],
  recurring_templates: ['amount', 'installment_amt', 'min_amount', 'max_amount'],
  recurring_entries: ['actual_amount'],
};

interface SchemaDatabase {
  execAsync(sql: string): Promise<void>;
  getAllAsync<T>(sql: string): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export async function initializeSchema(db: SchemaDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync(CREATE_TABLES_SQL);
    for (const [table, fields] of Object.entries(MONEY_COLUMNS)) {
      const existing = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
      let added = false;
      for (const field of fields) {
        if (!existing.some(column => column.name === `${field}_minor`)) {
          await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${field}_minor INTEGER`);
          added = true;
        }
      }
      if (added) await db.execAsync(`UPDATE ${table} SET ${fields[0]}=${fields[0]}`);
    }
    const brokenReferences = await db.getAllAsync('PRAGMA foreign_key_check');
    const orphanedBudgets = await db.getAllAsync(`SELECT id FROM budgets
      WHERE category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE categories.id = budgets.category_id)`);
    if (brokenReferences.length || orphanedBudgets.length) {
      throw new Error('Database contains missing references. Schema upgrade was rolled back; records were preserved.');
    }
  });
}
