# 🗄️ Database Schema
## Offline Expense Tracker — SQLite

---

## Tables

### `users`
Single row — local user profile and auth.

```sql
CREATE TABLE users (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  pin_hash        TEXT,                  -- bcrypt hash of PIN
  security_q      TEXT,
  security_a_hash TEXT,
  currency        TEXT DEFAULT 'INR',
  locale          TEXT DEFAULT 'en-IN',
  created_at      TEXT DEFAULT (datetime('now'))
);
```

---

### `categories`
User-defined categories with optional parent for subcategories.

```sql
CREATE TABLE categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  icon        TEXT,                      -- emoji or icon name
  color       TEXT,                      -- hex color
  parent_id   INTEGER REFERENCES categories(id),
  is_system   INTEGER DEFAULT 0,         -- 1 = built-in, protected
  created_at  TEXT DEFAULT (datetime('now'))
);
```

---

### `payment_modes`
User-defined payment methods.

```sql
CREATE TABLE payment_modes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,              -- e.g. Cash, UPI, HDFC Card
  is_system  INTEGER DEFAULT 0
);
```

---

### `expenses`
All one-time expense entries.

```sql
CREATE TABLE expenses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  amount          REAL NOT NULL,
  date            TEXT NOT NULL,         -- ISO date YYYY-MM-DD
  category_id     INTEGER REFERENCES categories(id),
  subcategory_id  INTEGER REFERENCES categories(id),
  payment_mode_id INTEGER REFERENCES payment_modes(id),
  note            TEXT,
  tags            TEXT,                  -- JSON array of strings
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);
```

---

### `recurring_templates`
Master template for all recurring rules.

```sql
CREATE TABLE recurring_templates (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK(type IN ('fixed','installment','variable')),
  category_id     INTEGER REFERENCES categories(id),
  payment_mode_id INTEGER REFERENCES payment_modes(id),

  -- Fixed & installment
  amount          REAL,                  -- NULL for variable

  -- Installment only
  total_periods   INTEGER,
  paid_periods    INTEGER DEFAULT 0,
  installment_amt REAL,

  -- Variable only
  min_amount      REAL,
  max_amount      REAL,

  -- Schedule
  frequency       TEXT NOT NULL CHECK(frequency IN ('daily','weekly','monthly','yearly')),
  start_date      TEXT NOT NULL,
  end_date        TEXT,                  -- NULL = open-ended
  next_due_date   TEXT NOT NULL,

  -- Reminders
  reminder_days   INTEGER DEFAULT 1,    -- days before due to notify
  reminder_on_due INTEGER DEFAULT 1,    -- 1 = also notify on due date

  -- State
  status          TEXT DEFAULT 'active' CHECK(status IN ('active','paused','completed')),
  note            TEXT,

  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);
```

---

### `recurring_entries`
Generated due entries per cycle from a template.

```sql
CREATE TABLE recurring_entries (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id     INTEGER NOT NULL REFERENCES recurring_templates(id),
  due_date        TEXT NOT NULL,
  actual_amount   REAL,                  -- filled when paid (variable: actual bill)
  status          TEXT DEFAULT 'pending' CHECK(status IN ('pending','paid','missed','skipped')),
  paid_date       TEXT,
  note            TEXT,
  notification_id TEXT,                  -- scheduled local notification ID
  created_at      TEXT DEFAULT (datetime('now'))
);
```

---

### `budgets`
Monthly overall and per-category budgets.

```sql
CREATE TABLE budgets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  month       TEXT NOT NULL,             -- YYYY-MM
  category_id INTEGER REFERENCES categories(id), -- NULL = overall
  amount      REAL NOT NULL,
  alert_pct   INTEGER DEFAULT 80,        -- alert threshold %
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(month, category_id)
);
```

---

### `notifications_log`
Audit log of all sent/dismissed notifications.

```sql
CREATE TABLE notifications_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  type            TEXT NOT NULL,         -- due_soon | due_today | overdue | budget_warning | budget_exceeded
  ref_id          INTEGER,               -- recurring_entry_id or budget_id
  ref_type        TEXT,                  -- 'recurring_entry' | 'budget'
  message         TEXT,
  sent_at         TEXT DEFAULT (datetime('now')),
  action          TEXT                   -- dismissed | snoozed | paid
);
```

---

## Indexes

```sql
CREATE INDEX idx_expenses_date        ON expenses(date);
CREATE INDEX idx_expenses_category    ON expenses(category_id);
CREATE INDEX idx_recurring_due        ON recurring_entries(due_date);
CREATE INDEX idx_recurring_status     ON recurring_entries(status);
CREATE INDEX idx_recurring_template   ON recurring_entries(template_id);
CREATE INDEX idx_budgets_month        ON budgets(month);
```

---

## Entity Relationships

```
users
  └── (single row)

categories
  ├── parent_id → categories.id  (self-referencing for subcategories)
  └── is used by: expenses, recurring_templates, budgets

payment_modes
  └── is used by: expenses, recurring_templates

expenses
  ├── category_id     → categories.id
  ├── subcategory_id  → categories.id
  └── payment_mode_id → payment_modes.id

recurring_templates
  ├── category_id     → categories.id
  └── payment_mode_id → payment_modes.id

recurring_entries
  └── template_id → recurring_templates.id

budgets
  └── category_id → categories.id (NULL = overall budget)

notifications_log
  └── ref_id → recurring_entries.id OR budgets.id
```
