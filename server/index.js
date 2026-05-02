const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = 3001;
const db = new Database(path.join(__dirname, 'tracker.db'));

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

// --- Routes ---

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
  const { done, completedAt, lastDone } = req.body;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE tasks 
    SET done = ?, completedAt = ?, lastDone = ?, modified_at = ?, modified_by = 'user' 
    WHERE id = ?
  `).run(done ? 1 : 0, completedAt, lastDone, now, req.params.id);
  logAction(req, 'UPDATE', 'tasks', req.params.id, req.body);
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

// SQL Compiler Endpoint
app.post('/api/query', (req, res) => {
  const { query } = req.body;
  try {
    const isSelect = query.trim().toUpperCase().startsWith('SELECT');
    if (isSelect) {
      const rows = db.prepare(query).all();
      res.json({ success: true, data: rows });
    } else {
      const info = db.prepare(query).run();
      res.json({ success: true, data: info });
    }
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
