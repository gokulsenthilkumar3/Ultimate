const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'tracker.db');
const db = new Database(DB_PATH);

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_by TEXT DEFAULT 'system'
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    priority TEXT,
    tag TEXT,
    dueDate TEXT,
    done INTEGER DEFAULT 0,
    recurring INTEGER DEFAULT 0,
    frequency TEXT,
    lastDone TEXT,
    completedAt TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'user',
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_by TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS shopping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    priority TEXT,
    estimatedCost REAL,
    purchased INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'user',
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_by TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS timesheet (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task TEXT,
    duration INTEGER,
    date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'user',
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_by TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS metric_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS finance (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    category TEXT,
    amount REAL NOT NULL,
    note TEXT,
    method TEXT,
    date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    limit_amount REAL NOT NULL,
    period TEXT DEFAULT 'monthly',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    table_name TEXT,
    item_id INTEGER,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    actor_name TEXT DEFAULT 'System',
    actor_email TEXT DEFAULT 'admin@growthtrack.ultimate',
    actor_ip TEXT
  );

  -- Migration of remaining hardcoded constants
  CREATE TABLE IF NOT EXISTS user_profile (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS training_plan (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS nutrition_strategy (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS lifestyle_tips (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS medical_data (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS physique_targets (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS assessment_qa (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'Untitled',
    content TEXT DEFAULT '',
    color TEXT DEFAULT '#e5a50a',
    pinned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    target_value REAL,
    current_value REAL DEFAULT 0,
    unit TEXT,
    deadline TEXT,
    done INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sleep_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    bed_time TEXT,
    wake_time TEXT,
    duration REAL,
    quality INTEGER CHECK(quality BETWEEN 1 AND 10),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    size TEXT,
    date TEXT,
    type TEXT DEFAULT 'Private',
    url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cost REAL NOT NULL,
    category TEXT DEFAULT 'General',
    next_date TEXT,
    auto_renew INTEGER DEFAULT 1,
    icon TEXT DEFAULT '📦',
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '🏃',
    streak INTEGER DEFAULT 0,
    completed_dates TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- Helper for Audit Logging ---
function logAction(req, action, table, id, details = null, actorName = 'System', actorEmail = 'admin@growthtrack.ultimate') {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  
  // Prioritize headers if provided by the frontend
  const finalName = req.headers['x-actor-name'] || actorName;
  const finalEmail = req.headers['x-actor-email'] || actorEmail;

  db.prepare(`
    INSERT INTO audit_log (action, table_name, item_id, details, actor_name, actor_email, actor_ip) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    action, table, id, details ? JSON.stringify(details) : null, finalName, finalEmail, ip
  );
}

// --- ROUTES ---

// Habits
app.get('/api/habits', (req, res) => {
  res.json(db.prepare('SELECT * FROM habits').all().map(h => ({
    ...h,
    completed_dates: JSON.parse(h.completed_dates || '[]')
  })));
});

app.post('/api/habits', (req, res) => {
  const { name, icon } = req.body;
  const info = db.prepare('INSERT INTO habits (name, icon) VALUES (?, ?)').run(name, icon);
  res.json({ success: true, id: info.lastInsertRowid });
});

app.put('/api/habits/:id', (req, res) => {
  const { completed_dates, streak } = req.body;
  db.prepare('UPDATE habits SET completed_dates = ?, streak = ? WHERE id = ?').run(
    JSON.stringify(completed_dates), streak, req.params.id
  );
  res.json({ success: true });
});

app.delete('/api/habits/:id', (req, res) => {
  db.prepare('DELETE FROM habits WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Health
app.get('/api/health', (req, res) => {
  try {
    const stats = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
    res.json({ status: 'ok', uptime: process.uptime(), tasks: stats.count, db: 'connected' });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Documents
app.get('/api/documents', (req, res) => {
  res.json(db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all());
});

app.post('/api/documents', (req, res) => {
  const { name, size, date, type, url } = req.body;
  const info = db.prepare('INSERT INTO documents (name, size, date, type, url) VALUES (?, ?, ?, ?, ?)').run(name, size, date, type, url);
  logAction(req, 'CREATE', 'documents', info.lastInsertRowid, { name });
  res.json({ success: true, id: info.lastInsertRowid });
});

app.delete('/api/documents/:id', (req, res) => {
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  logAction(req, 'DELETE', 'documents', req.params.id);
  res.json({ success: true });
});

// User Profile
app.get('/api/user', (req, res) => {
  const row = db.prepare('SELECT data FROM user_profile WHERE id = 1').get();
  res.json(row ? JSON.parse(row.data) : {});
});

app.post('/api/user', (req, res) => {
  const data = JSON.stringify(req.body);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO user_profile (id, data, modified_at, modified_by) 
    VALUES (1, ?, ?, 'user')
    ON CONFLICT(id) DO UPDATE SET data=excluded.data, modified_at=excluded.modified_at, modified_by=excluded.modified_by
  `).run(data, now);
  logAction(req, 'UPDATE', 'user_profile', 1, req.body);
  res.json({ success: true });
});

// Tasks
app.get('/api/tasks', (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
  res.json(rows.map(r => ({ ...r, done: !!r.done, recurring: !!r.recurring })));
});

app.post('/api/tasks', (req, res) => {
  const { title, priority, tag, dueDate, recurring, frequency } = req.body;
  const info = db.prepare(`
    INSERT INTO tasks (title, priority, tag, dueDate, recurring, frequency, created_by, modified_by)
    VALUES (?, ?, ?, ?, ?, ?, 'user', 'user')
  `).run(title, priority, tag, dueDate, recurring ? 1 : 0, frequency);
  logAction(req, 'INSERT', 'tasks', info.lastInsertRowid, req.body);
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/tasks/:id', (req, res) => {
  const { done, completedAt, lastDone, title, priority, tag, dueDate, recurring, frequency } = req.body;
  const now = new Date().toISOString();
  // Build dynamic SET clause based on provided fields
  const updates = [];
  const params = [];
  if (done !== undefined)        { updates.push('done = ?');        params.push(done ? 1 : 0); }
  if (completedAt !== undefined) { updates.push('completedAt = ?'); params.push(completedAt); }
  if (lastDone !== undefined)    { updates.push('lastDone = ?');    params.push(lastDone); }
  if (title !== undefined)       { updates.push('title = ?');       params.push(title); }
  if (priority !== undefined)    { updates.push('priority = ?');    params.push(priority); }
  if (tag !== undefined)         { updates.push('tag = ?');         params.push(tag); }
  if (dueDate !== undefined)     { updates.push('dueDate = ?');     params.push(dueDate); }
  if (recurring !== undefined)   { updates.push('recurring = ?');   params.push(recurring ? 1 : 0); }
  if (frequency !== undefined)   { updates.push('frequency = ?');   params.push(frequency); }
  updates.push('modified_at = ?'); params.push(now);
  params.push(req.params.id);
  if (updates.length > 1) {
    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    logAction(req, 'UPDATE', 'tasks', req.params.id, req.body);
  }
  res.json({ success: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  logAction(req, 'DELETE', 'tasks', req.params.id);
  res.json({ success: true });
});

// Shopping
app.get('/api/shopping', (req, res) => {
  const rows = db.prepare('SELECT * FROM shopping ORDER BY created_at DESC').all();
  res.json(rows.map(r => ({ ...r, purchased: !!r.purchased })));
});

app.post('/api/shopping', (req, res) => {
  const { name, category, priority, estimatedCost } = req.body;
  const info = db.prepare(`
    INSERT INTO shopping (name, category, priority, estimatedCost, created_by, modified_by)
    VALUES (?, ?, ?, ?, 'user', 'user')
  `).run(name, category, priority, estimatedCost);
  logAction(req, 'INSERT', 'shopping', info.lastInsertRowid, req.body);
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/shopping/:id', (req, res) => {
  const { purchased } = req.body;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE shopping 
    SET purchased = ?, modified_at = ?, modified_by = 'user' 
    WHERE id = ?
  `).run(purchased ? 1 : 0, now, req.params.id);
  logAction(req, 'UPDATE', 'shopping', req.params.id, req.body);
  res.json({ success: true });
});

app.delete('/api/shopping/:id', (req, res) => {
  db.prepare('DELETE FROM shopping WHERE id = ?').run(req.params.id);
  logAction(req, 'DELETE', 'shopping', req.params.id);
  res.json({ success: true });
});

// Timesheet
app.get('/api/timesheet', (req, res) => {
  const rows = db.prepare('SELECT * FROM timesheet ORDER BY created_at DESC').all();
  res.json(rows);
});

app.post('/api/timesheet', (req, res) => {
  const { task, duration, date } = req.body;
  const info = db.prepare(`
    INSERT INTO timesheet (task, duration, date, created_by, modified_by)
    VALUES (?, ?, ?, 'user', 'user')
  `).run(task, duration, date);
  logAction(req, 'INSERT', 'timesheet', info.lastInsertRowid, req.body);
  res.json({ id: info.lastInsertRowid });
});

app.delete('/api/timesheet/:id', (req, res) => {
  db.prepare('DELETE FROM timesheet WHERE id = ?').run(req.params.id);
  logAction(req, 'DELETE', 'timesheet', req.params.id);
  res.json({ success: true });
});

// Finance Transactions
app.get('/api/finance', (req, res) => {
  const transactions = db.prepare('SELECT * FROM finance ORDER BY date DESC, created_at DESC').all();
  const budgets = db.prepare('SELECT * FROM budgets ORDER BY created_at DESC').all();
  res.json({ transactions, budgets });
});

app.post('/api/finance', (req, res) => {
  const { id, type, category, amount, note, method, date } = req.body;
  db.prepare(`
    INSERT OR REPLACE INTO finance (id, type, category, amount, note, method, date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id || Date.now().toString(), type, category, amount, note, method, date);
  logAction(req, 'INSERT', 'finance', id, req.body);
  res.json({ success: true });
});

app.delete('/api/finance/:id', (req, res) => {
  db.prepare('DELETE FROM finance WHERE id = ?').run(req.params.id);
  logAction(req, 'DELETE', 'finance', req.params.id);
  res.json({ success: true });
});

// Budgets
app.get('/api/budgets', (req, res) => {
  const rows = db.prepare('SELECT * FROM budgets ORDER BY created_at DESC').all();
  res.json(rows);
});

app.post('/api/budgets', (req, res) => {
  const { id, category, limit_amount, period } = req.body;
  db.prepare(`INSERT OR REPLACE INTO budgets (id, category, limit_amount, period) VALUES (?, ?, ?, ?)`)
    .run(id || Date.now().toString(), category, limit_amount, period || 'monthly');
  res.json({ success: true });
});

app.delete('/api/budgets/:id', (req, res) => {
  db.prepare('DELETE FROM budgets WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Metric Logs
app.get('/api/metric_logs', (req, res) => {
  const rows = db.prepare('SELECT * FROM metric_logs ORDER BY date DESC').all();
  res.json(rows.map(r => ({ ...JSON.parse(r.data), id: r.id, date: r.date })));
});

app.post('/api/metric_logs', (req, res) => {
  const { date, ...rest } = req.body;
  const data = JSON.stringify(rest);
  const info = db.prepare('INSERT INTO metric_logs (data, date) VALUES (?, ?)').run(data, date);
  logAction(req, 'INSERT', 'metric_logs', info.lastInsertRowid, req.body);
  res.json({ id: info.lastInsertRowid });
});

// Generic Singleton Data Routes
const singletonTables = [
  'user_profile',
  'training_plan',
  'nutrition_strategy',
  'lifestyle_tips',
  'medical_data',
  'physique_targets',
  'assessment_qa',
  'skills',
  'calendar_events'
];

singletonTables.forEach(table => {
  app.get(`/api/${table}`, (req, res) => {
    const row = db.prepare(`SELECT data FROM ${table} WHERE id = 1`).get();
    res.json(row ? JSON.parse(row.data) : null);
  });

  app.post(`/api/${table}`, (req, res) => {
    const data = JSON.stringify(req.body);
    db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (1, ?)`).run(data);
    logAction(req, 'updated', table, 1, req.body);
    res.json({ success: true });
  });
});

// Audit Logs (for debugging/logging check)
app.get('/api/logs', (req, res) => {
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 100').all();
  res.json(rows);
});

// Master Database Dump
app.get('/api/all', (req, res) => {
  const result = {};
  
  // Dynamic JSON tables
  singletonTables.forEach(table => {
    const row = db.prepare(`SELECT data FROM ${table} WHERE id = 1`).get();
    result[table] = row ? JSON.parse(row.data) : null;
  });
  
  // Array tables
  result.tasks = db.prepare('SELECT * FROM tasks').all();
  result.shopping = db.prepare('SELECT * FROM shopping').all();
  result.timesheet = db.prepare('SELECT * FROM timesheet').all();
  result.audit_log = db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 50').all();
  
  res.json(result);
});

// SQL Compiler — with security hardening
const SQL_BLACKLIST = /\b(DROP|TRUNCATE|ALTER|ATTACH|DETACH|PRAGMA|CREATE\s+TABLE|DELETE\s+FROM\s+user_profile)\b/i;
app.post('/api/query', (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') return res.status(400).json({ success: false, error: 'No query provided' });
  if (query.trim().length > 2000) return res.status(400).json({ success: false, error: 'Query too long' });
  if (SQL_BLACKLIST.test(query)) return res.status(403).json({ success: false, error: 'Destructive query blocked for safety. Use the server console for schema changes.' });
  try {
    const isSelect = query.trim().toUpperCase().startsWith('SELECT');
    if (isSelect) {
      const rows = db.prepare(query).all();
      res.json({ success: true, data: rows, rowCount: rows.length });
    } else {
      const info = db.prepare(query).run();
      res.json({ success: true, data: info, rowCount: info.changes });
    }
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  try {
    const dbCheck = db.prepare('SELECT 1 as ok').get();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    res.json({
      status: 'online',
      timestamp: new Date().toISOString(),
      database: dbCheck.ok === 1 ? 'connected' : 'error',
      tables: tables.length,
      tableNames: tables,
      uptime: process.uptime()
    });
  } catch (e) {
    res.status(500).json({ status: 'error', error: e.message });
  }
});

// Notes
app.get('/api/notes', (req, res) => {
  res.json(db.prepare('SELECT * FROM notes ORDER BY pinned DESC, modified_at DESC').all().map(r => ({ ...r, pinned: !!r.pinned })));
});
app.post('/api/notes', (req, res) => {
  const { id, title, content, color, pinned } = req.body;
  if (id) {
    db.prepare('UPDATE notes SET title=?, content=?, color=?, pinned=?, modified_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(title, content, color || '#e5a50a', pinned ? 1 : 0, id);
    res.json({ success: true, id });
  } else {
    const info = db.prepare('INSERT INTO notes (title, content, color, pinned) VALUES (?, ?, ?, ?)').run(title || 'Untitled', content || '', color || '#e5a50a', pinned ? 1 : 0);
    res.json({ success: true, id: info.lastInsertRowid });
  }
});
app.delete('/api/notes/:id', (req, res) => {
  db.prepare('DELETE FROM notes WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Goals
app.get('/api/goals', (req, res) => {
  res.json(db.prepare('SELECT * FROM goals ORDER BY done ASC, created_at DESC').all().map(r => ({ ...r, done: !!r.done })));
});
app.post('/api/goals', (req, res) => {
  const { id, title, category, target_value, current_value, unit, deadline, done } = req.body;
  if (id) {
    db.prepare('UPDATE goals SET title=?, category=?, target_value=?, current_value=?, unit=?, deadline=?, done=?, modified_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(title, category, target_value, current_value, unit, deadline, done ? 1 : 0, id);
    res.json({ success: true, id });
  } else {
    const info = db.prepare('INSERT INTO goals (title, category, target_value, current_value, unit, deadline) VALUES (?, ?, ?, ?, ?, ?)').run(title, category, target_value, current_value || 0, unit, deadline);
    res.json({ success: true, id: info.lastInsertRowid });
  }
});
app.delete('/api/goals/:id', (req, res) => {
  db.prepare('DELETE FROM goals WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Sleep Logs
app.get('/api/sleep_logs', (req, res) => {
  res.json(db.prepare('SELECT * FROM sleep_logs ORDER BY date DESC LIMIT 90').all());
});
app.post('/api/sleep_logs', (req, res) => {
  const { date, bed_time, wake_time, duration, quality, notes } = req.body;
  if (!date) return res.status(400).json({ error: 'date required' });
  db.prepare('INSERT OR REPLACE INTO sleep_logs (date, bed_time, wake_time, duration, quality, notes) VALUES (?, ?, ?, ?, ?, ?)')
    .run(date, bed_time, wake_time, duration, quality, notes);
  res.json({ success: true });
});
app.delete('/api/sleep_logs/:date', (req, res) => {
  db.prepare('DELETE FROM sleep_logs WHERE date=?').run(req.params.date);
  res.json({ success: true });
});

// Subscriptions
app.get('/api/subscriptions', (req, res) => {
  res.json(db.prepare('SELECT * FROM subscriptions WHERE active=1 ORDER BY next_date ASC').all().map(r => ({ ...r, auto_renew: !!r.auto_renew, active: !!r.active })));
});
app.post('/api/subscriptions', (req, res) => {
  const { id, name, cost, category, next_date, auto_renew, icon } = req.body;
  if (id) {
    db.prepare('UPDATE subscriptions SET name=?, cost=?, category=?, next_date=?, auto_renew=?, icon=? WHERE id=?')
      .run(name, cost, category, next_date, auto_renew ? 1 : 0, icon, id);
    res.json({ success: true, id });
  } else {
    const info = db.prepare('INSERT INTO subscriptions (name, cost, category, next_date, auto_renew, icon) VALUES (?, ?, ?, ?, ?, ?)').run(name, cost, category, next_date, auto_renew ? 1 : 0, icon || '📦');
    res.json({ success: true, id: info.lastInsertRowid });
  }
});
app.delete('/api/subscriptions/:id', (req, res) => {
  db.prepare('UPDATE subscriptions SET active=0 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
