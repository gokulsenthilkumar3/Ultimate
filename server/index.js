require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const morgan = require('morgan');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'tracker.db');
const db = new Database(DB_PATH);

// --- Security: HTTP Headers ---
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// --- Security: CORS (restrict to known origins) ---
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:3000')
  .split(',')
  .map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    // Allow non-browser requests (curl, Postman) and whitelisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-actor-name', 'x-actor-email'],
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// --- Logging: use combined in production, dev in development ---
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// --- Security: Rate Limiting ---
const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});
app.use('/api/', limiter);

// Stricter limit on the raw SQL endpoint
const queryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Query rate limit exceeded.' }
});

// --- Security: Protected-route middleware (bearer token) ---
const API_SECRET = process.env.API_SECRET || '';
function requireSecret(req, res, next) {
  if (!API_SECRET) return next(); // skip if not configured (dev mode)
  const auth = req.headers['authorization'] || '';
  if (auth !== `Bearer ${API_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// --- Security: Production error sanitizer ---
// Prevents stack traces and internal messages from leaking to clients
function safeError(res, err, statusCode = 500) {
  const isProd = process.env.NODE_ENV === 'production';
  console.error('[SERVER ERROR]', err?.message || err);
  res.status(statusCode).json({
    error: isProd ? 'Internal server error' : (err?.message || String(err))
  });
}

// --- Startup Security Audit ---
function runStartupChecks() {
  const warnings = [];
  if (!API_SECRET) {
    warnings.push('⚠️  API_SECRET is not set — all protected endpoints are open. Set API_SECRET in .env for production.');
  }
  if (!process.env.ALLOWED_ORIGINS) {
    warnings.push('ℹ️  ALLOWED_ORIGINS not set — defaulting to localhost:5173,localhost:3000');
  }
  if (warnings.length > 0) {
    console.warn('\n╔══════════════════════════════════════════════════════╗');
    console.warn('║           GROWTHTRACK SECURITY NOTICES              ║');
    console.warn('╚══════════════════════════════════════════════════════╝');
    warnings.forEach(w => console.warn(w));
    console.warn('');
  }
}


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
    quantity INTEGER DEFAULT 1,
    purchased INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'user',
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_by TEXT DEFAULT 'user'
  );

  -- Migration: Add quantity to shopping if missing
  -- Using a try-catch pattern in SQL is hard in SQLite, so we'll do it via JS below if needed.
  -- But we can update the string for new installs.

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

  -- Singleton data tables (all enforce single-row via CHECK)
  CREATE TABLE IF NOT EXISTS training_plan (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS nutrition_strategy (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS lifestyle_tips (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS medical_data (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS physique_targets (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS assessment_qa (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS wellness_data (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS skills (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS calendar_events (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);

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

  CREATE TABLE IF NOT EXISTS entertainment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT,
    category TEXT,
    status TEXT,
    rating INTEGER,
    progress INTEGER,
    poster TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS health_extras (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    vision_score INTEGER DEFAULT 85,
    hearing_score INTEGER DEFAULT 90,
    smell_score INTEGER DEFAULT 95,
    taste_score INTEGER DEFAULT 90,
    touch_score INTEGER DEFAULT 88,
    gut_biome_score INTEGER DEFAULT 78,
    dermatology_score INTEGER DEFAULT 82,
    hair_vitality_score INTEGER DEFAULT 85,
    bronco_level TEXT DEFAULT '—',
    posture_status TEXT DEFAULT 'Not set',
    active_diets TEXT DEFAULT '[]',
    hobbies TEXT DEFAULT '[]',
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- Migrations: Add columns if they don't exist ---
try {
  const tableInfo = db.prepare("PRAGMA table_info(shopping)").all();
  const hasQuantity = tableInfo.some(col => col.name === 'quantity');
  if (!hasQuantity) {
    db.prepare("ALTER TABLE shopping ADD COLUMN quantity INTEGER DEFAULT 1").run();
    console.log('✅ Migration: Added quantity column to shopping table');
  }
} catch (e) {
  console.error('❌ Migration failed:', e.message);
}

// --- Input Validation Schemas (Zod) ---
const taskSchema = z.object({
  title: z.string().min(1).max(500),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  tag: z.string().max(100).optional(),
  dueDate: z.string().optional(),
  recurring: z.boolean().optional(),
  frequency: z.string().optional()
});

const shoppingSchema = z.object({
  name: z.string().min(1).max(300),
  category: z.string().max(100).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  estimatedCost: z.number().nonnegative().optional(),
  quantity: z.number().int().positive().default(1)
});

const financeSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['income', 'expense', 'investment', 'Income', 'Expense', 'Investment']),
  category: z.string().max(100).optional(),
  amount: z.number().positive(),
  note: z.string().max(500).optional(),
  method: z.string().max(100).optional(),
  date: z.string().optional()
});

const timesheetSchema = z.object({
  task: z.string().min(1).max(300),
  duration: z.number().int().positive(),
  date: z.string()
});

const habitSchema = z.object({
  name: z.string().min(1).max(200),
  icon: z.string().max(10).optional()
});

const noteSchema = z.object({
  id: z.number().int().optional(),
  title: z.string().max(300).optional(),
  content: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  pinned: z.boolean().optional()
});

const goalSchema = z.object({
  id: z.number().int().optional(),
  title: z.string().min(1).max(300),
  category: z.string().max(100).optional(),
  target_value: z.number().optional(),
  current_value: z.number().optional(),
  unit: z.string().max(50).optional(),
  deadline: z.string().optional(),
  done: z.boolean().optional()
});

const sleepSchema = z.object({
  date: z.string(),
  bed_time: z.string().optional(),
  wake_time: z.string().optional(),
  duration: z.number().nonnegative().optional(),
  quality: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(500).optional()
});

const entertainmentSchema = z.object({
  id: z.number().int().optional(),
  title: z.string().min(1).max(300),
  type: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  status: z.enum(['watching', 'completed', 'plan_to_watch', 'dropped', 'on_hold']).optional(),
  rating: z.number().int().min(1).max(10).optional(),
  progress: z.number().int().min(0).optional(),
  poster: z.string().url().optional().or(z.literal(''))
});

// --- Validation middleware factory ---
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({ error: 'Validation failed', issues: result.error.issues });
    }
    req.validated = result.data;
    next();
  };
}

// --- Helper for Audit Logging (server-side actor only — never trust client headers) ---
function logAction(req, action, table, id, details = null) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
  // Actor identity is resolved server-side only — client headers are ignored for security
  const actorName = 'System';
  const actorEmail = 'admin@growthtrack.ultimate';

  db.prepare(`
    INSERT INTO audit_log (action, table_name, item_id, details, actor_name, actor_email, actor_ip) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    action, table, id, details ? JSON.stringify(details) : null, actorName, actorEmail, ip
  );
}

// --- ROUTES ---

// Health check (used by SettingsModal latency display)
app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get(); // quick DB ping
    res.json({ status: 'online', db: 'connected', ts: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'offline', error: e.message });
  }
});

// Audit log viewer (last 100 entries)
app.get('/api/logs', (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT action, table_name, item_id, details, actor_name, timestamp 
       FROM audit_log ORDER BY timestamp DESC LIMIT 100`
    ).all();
    res.json(rows);
  } catch (e) {
    res.json([]); // audit_log table may not exist yet — return empty
  }
});

// Habits
app.get('/api/habits', (req, res) => {
  res.json(db.prepare('SELECT * FROM habits').all().map(h => ({
    ...h,
    completed_dates: JSON.parse(h.completed_dates || '[]')
  })));
});

app.post('/api/habits', validate(habitSchema), (req, res) => {
  const { name, icon } = req.validated;
  const info = db.prepare('INSERT INTO habits (name, icon) VALUES (?, ?)').run(name, icon);
  res.json({ success: true, id: info.lastInsertRowid });
});

app.put('/api/habits/:id', (req, res) => {
  const { completed_dates, streak } = req.body;
  const parsedDates = Array.isArray(completed_dates) ? completed_dates : [];
  const parsedStreak = Number.isInteger(streak) ? streak : 0;
  db.prepare('UPDATE habits SET completed_dates = ?, streak = ? WHERE id = ?').run(
    JSON.stringify(parsedDates), parsedStreak, req.params.id
  );
  res.json({ success: true });
});

app.delete('/api/habits/:id', (req, res) => {
  db.prepare('DELETE FROM habits WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Documents
app.get('/api/documents', (req, res) => {
  res.json(db.prepare('SELECT * FROM documents ORDER BY created_at DESC').all());
});

app.post('/api/documents', (req, res) => {
  const { name, size, date, type, url } = req.body;
  if (!name || typeof name !== 'string') return res.status(422).json({ error: 'name is required' });
  const info = db.prepare('INSERT INTO documents (name, size, date, type, url) VALUES (?, ?, ?, ?, ?)').run(
    name.slice(0, 300), size, date, type || 'Private', url
  );
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
  logAction(req, 'UPDATE', 'user_profile', 1, null);
  res.json({ success: true });
});

// Tasks
app.get('/api/tasks', (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
  res.json(rows.map(r => ({ ...r, done: !!r.done, recurring: !!r.recurring })));
});

app.post('/api/tasks', validate(taskSchema), (req, res) => {
  const { title, priority, tag, dueDate, recurring, frequency } = req.validated;
  const info = db.prepare(`
    INSERT INTO tasks (title, priority, tag, dueDate, recurring, frequency, created_by, modified_by)
    VALUES (?, ?, ?, ?, ?, ?, 'user', 'user')
  `).run(title, priority, tag, dueDate, recurring ? 1 : 0, frequency);
  logAction(req, 'INSERT', 'tasks', info.lastInsertRowid, { title });
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/tasks/:id', (req, res) => {
  const { done, completedAt, lastDone, title, priority, tag, dueDate, recurring, frequency } = req.body;
  const now = new Date().toISOString();
  const updates = [];
  const params = [];
  if (done !== undefined)        { updates.push('done = ?');        params.push(done ? 1 : 0); }
  if (completedAt !== undefined) { updates.push('completedAt = ?'); params.push(completedAt); }
  if (lastDone !== undefined)    { updates.push('lastDone = ?');    params.push(lastDone); }
  if (title !== undefined)       { updates.push('title = ?');       params.push(String(title).slice(0, 500)); }
  if (priority !== undefined)    { updates.push('priority = ?');    params.push(priority); }
  if (tag !== undefined)         { updates.push('tag = ?');         params.push(tag); }
  if (dueDate !== undefined)     { updates.push('dueDate = ?');     params.push(dueDate); }
  if (recurring !== undefined)   { updates.push('recurring = ?');   params.push(recurring ? 1 : 0); }
  if (frequency !== undefined)   { updates.push('frequency = ?');   params.push(frequency); }
  updates.push('modified_at = ?'); params.push(now);
  params.push(req.params.id);
  if (updates.length > 1) {
    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    logAction(req, 'UPDATE', 'tasks', req.params.id, null);
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

app.post('/api/shopping', validate(shoppingSchema), (req, res) => {
  const { name, category, priority, estimatedCost, quantity } = req.validated;
  const info = db.prepare(`
    INSERT INTO shopping (name, category, priority, estimatedCost, quantity, created_by, modified_by)
    VALUES (?, ?, ?, ?, ?, 'user', 'user')
  `).run(name, category, priority, estimatedCost, quantity);
  logAction(req, 'INSERT', 'shopping', info.lastInsertRowid, { name });
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
  logAction(req, 'UPDATE', 'shopping', req.params.id, null);
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

app.post('/api/timesheet', validate(timesheetSchema), (req, res) => {
  const { task, duration, date } = req.validated;
  const info = db.prepare(`
    INSERT INTO timesheet (task, duration, date, created_by, modified_by)
    VALUES (?, ?, ?, 'user', 'user')
  `).run(task, duration, date);
  logAction(req, 'INSERT', 'timesheet', info.lastInsertRowid, { task });
  res.json({ id: info.lastInsertRowid });
});

app.delete('/api/timesheet/:id', (req, res) => {
  db.prepare('DELETE FROM timesheet WHERE id = ?').run(req.params.id);
  logAction(req, 'DELETE', 'timesheet', req.params.id);
  res.json({ success: true });
});

app.put('/api/timesheet/:id', (req, res) => {
  const { task, duration, date } = req.body;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE timesheet 
    SET task = COALESCE(?, task), duration = COALESCE(?, duration), date = COALESCE(?, date), modified_at = ?, modified_by = 'user' 
    WHERE id = ?
  `).run(task, duration, date, now, req.params.id);
  logAction(req, 'UPDATE', 'timesheet', req.params.id, null);
  res.json({ success: true });
});

// Finance Transactions
app.get('/api/finance', (req, res) => {
  const transactions = db.prepare('SELECT * FROM finance ORDER BY date DESC, created_at DESC').all();
  const budgets = db.prepare('SELECT * FROM budgets ORDER BY created_at DESC').all();
  res.json({ transactions, budgets });
});

app.post('/api/finance', validate(financeSchema), (req, res) => {
  const { id, type, category, amount, note, method, date } = req.validated;
  db.prepare(`
    INSERT OR REPLACE INTO finance (id, type, category, amount, note, method, date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id || Date.now().toString(), type, category, amount, note, method, date);
  logAction(req, 'INSERT', 'finance', id, null);
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
  if (!category || typeof category !== 'string') return res.status(422).json({ error: 'category is required' });
  if (typeof limit_amount !== 'number' || limit_amount < 0) return res.status(422).json({ error: 'limit_amount must be a non-negative number' });
  db.prepare(`INSERT OR REPLACE INTO budgets (id, category, limit_amount, period) VALUES (?, ?, ?, ?)`)
    .run(id || Date.now().toString(), category.slice(0, 100), limit_amount, period || 'monthly');
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
  if (!date) return res.status(422).json({ error: 'date is required' });
  const data = JSON.stringify(rest);
  const info = db.prepare('INSERT INTO metric_logs (data, date) VALUES (?, ?)').run(data, date);
  logAction(req, 'INSERT', 'metric_logs', info.lastInsertRowid, null);
  res.json({ id: info.lastInsertRowid });
});

// Generic Singleton Data Routes
const SINGLETON_TABLES = Object.freeze(new Set([
  'user_profile',
  'training_plan',
  'nutrition_strategy',
  'lifestyle_tips',
  'medical_data',
  'physique_targets',
  'assessment_qa',
  'wellness_data',
  'skills',
  'calendar_events'
]));

SINGLETON_TABLES.forEach(table => {
  app.get(`/api/${table}`, (req, res) => {
    const row = db.prepare(`SELECT data FROM ${table} WHERE id = 1`).get();
    res.json(row ? JSON.parse(row.data) : null);
  });

  app.post(`/api/${table}`, (req, res) => {
    const data = JSON.stringify(req.body);
    db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (1, ?)`).run(data);
    logAction(req, 'updated', table, 1, null);
    res.json({ success: true });
  });
});

// Audit Logs — protected route
app.get('/api/logs', requireSecret, (req, res) => {
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 100').all();
  res.json(rows);
});

// Master Database Dump — protected route
app.get('/api/all', requireSecret, (req, res) => {
  const result = {};
  SINGLETON_TABLES.forEach(table => {
    const row = db.prepare(`SELECT data FROM ${table} WHERE id = 1`).get();
    result[table] = row ? JSON.parse(row.data) : null;
  });
  result.tasks = db.prepare('SELECT * FROM tasks').all();
  result.shopping = db.prepare('SELECT * FROM shopping').all();
  result.timesheet = db.prepare('SELECT * FROM timesheet').all();
  result.notes = db.prepare('SELECT * FROM notes').all();
  result.goals = db.prepare('SELECT * FROM goals').all();
  result.sleep_logs = db.prepare('SELECT * FROM sleep_logs').all();
  result.documents = db.prepare('SELECT * FROM documents').all();
  result.subscriptions = db.prepare('SELECT * FROM subscriptions').all();
  result.habits = db.prepare('SELECT * FROM habits').all();
  result.entertainment = db.prepare('SELECT * FROM entertainment').all();
  result.audit_log = db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 50').all();
  res.json(result);
});

// SQL Compiler — protected + rate-limited — SELECT ONLY for safety
const SQL_BLACKLIST = /\b(DROP|TRUNCATE|ALTER|ATTACH|DETACH|PRAGMA|CREATE\s+TABLE)\b/i;
app.post('/api/query', requireSecret, queryLimiter, (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') return res.status(400).json({ success: false, error: 'No query provided' });
  if (query.trim().length > 2000) return res.status(400).json({ success: false, error: 'Query too long' });
  // Only SELECT queries allowed via the UI console — use the REST API endpoints for mutations
  if (!query.trim().toUpperCase().startsWith('SELECT')) {
    return res.status(403).json({ success: false, error: 'Only SELECT queries are allowed in the SQL console. Use the REST API endpoints for data mutations.' });
  }
  if (SQL_BLACKLIST.test(query)) return res.status(403).json({ success: false, error: 'Blocked query detected.' });
  try {
    const rows = db.prepare(query).all();
    res.json({ success: true, data: rows, rowCount: rows.length });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Health Check (public — safe minimal info)
app.get('/api/health', (req, res) => {
  try {
    const dbCheck = db.prepare('SELECT 1 as ok').get();
    res.json({
      status: 'online',
      timestamp: new Date().toISOString(),
      database: dbCheck.ok === 1 ? 'connected' : 'error',
      uptime: process.uptime()
    });
  } catch (e) {
    res.status(500).json({ status: 'error', error: 'Database unavailable' });
  }
});

// Notes
app.get('/api/notes', (req, res) => {
  res.json(db.prepare('SELECT * FROM notes ORDER BY pinned DESC, modified_at DESC').all().map(r => ({ ...r, pinned: !!r.pinned })));
});
app.post('/api/notes', validate(noteSchema), (req, res) => {
  const { id, title, content, color, pinned } = req.validated;
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
app.post('/api/goals', validate(goalSchema), (req, res) => {
  const { id, title, category, target_value, current_value, unit, deadline, done } = req.validated;
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
app.post('/api/sleep_logs', validate(sleepSchema), (req, res) => {
  const { date, bed_time, wake_time, duration, quality, notes } = req.validated;
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
  if (!name || typeof name !== 'string') return res.status(422).json({ error: 'name is required' });
  if (typeof cost !== 'number' || cost < 0) return res.status(422).json({ error: 'cost must be a non-negative number' });
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

// Entertainment (Media)
app.get('/api/entertainment', (req, res) => {
  res.json(db.prepare('SELECT * FROM entertainment ORDER BY modified_at DESC').all());
});
app.post('/api/entertainment', validate(entertainmentSchema), (req, res) => {
  const { id, title, type, category, status, rating, progress, poster } = req.validated;
  if (id) {
    db.prepare('UPDATE entertainment SET title=?, type=?, category=?, status=?, rating=?, progress=?, poster=?, modified_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(title, type, category, status, rating, progress, poster, id);
    res.json({ success: true, id });
  } else {
    const info = db.prepare('INSERT INTO entertainment (title, type, category, status, rating, progress, poster) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(title, type, category, status, rating, progress, poster);
    res.json({ success: true, id: info.lastInsertRowid });
  }
});
app.delete('/api/entertainment/:id', (req, res) => {
  db.prepare('DELETE FROM entertainment WHERE id=?').run(req.params.id);
  res.json({ success: true });
});
app.put('/api/entertainment/:id', (req, res) => {
  const { title, type, category, status, rating, progress, poster } = req.body;
  const now = new Date().toISOString();
  db.prepare(`UPDATE entertainment SET
    title=COALESCE(?,title), type=COALESCE(?,type), category=COALESCE(?,category),
    status=COALESCE(?,status), rating=COALESCE(?,rating), progress=COALESCE(?,progress),
    poster=COALESCE(?,poster), modified_at=? WHERE id=?`)
    .run(title, type, category, status, rating, progress, poster, now, req.params.id);
  res.json({ success: true });
});

// PUT /api/notes/:id — dedicated REST update (separate from POST upsert)
app.put('/api/notes/:id', validate(noteSchema), (req, res) => {
  const { title, content, color, pinned } = req.validated;
  const now = new Date().toISOString();
  const updates = ['modified_at = ?'];
  const params = [now];
  if (title !== undefined)   { updates.unshift('title = ?');   params.unshift(String(title).slice(0, 300)); }
  if (content !== undefined) { updates.unshift('content = ?'); params.unshift(content); }
  if (color !== undefined)   { updates.unshift('color = ?');   params.unshift(color); }
  if (pinned !== undefined)  { updates.unshift('pinned = ?');  params.unshift(pinned ? 1 : 0); }
  params.push(req.params.id);
  db.prepare(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

// PUT /api/goals/:id — update goal progress
app.put('/api/goals/:id', (req, res) => {
  const { title, category, target_value, current_value, unit, deadline, done } = req.body;
  const now = new Date().toISOString();
  const updates = ['modified_at = ?'];
  const params = [now];
  if (done !== undefined)          { updates.unshift('done = ?');          params.unshift(done ? 1 : 0); }
  if (deadline !== undefined)      { updates.unshift('deadline = ?');      params.unshift(deadline); }
  if (unit !== undefined)          { updates.unshift('unit = ?');          params.unshift(unit); }
  if (current_value !== undefined) { updates.unshift('current_value = ?'); params.unshift(current_value); }
  if (target_value !== undefined)  { updates.unshift('target_value = ?');  params.unshift(target_value); }
  if (category !== undefined)      { updates.unshift('category = ?');      params.unshift(category); }
  if (title !== undefined)         { updates.unshift('title = ?');         params.unshift(String(title).slice(0,300)); }
  params.push(req.params.id);
  db.prepare(`UPDATE goals SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  logAction(req, 'UPDATE', 'goals', req.params.id, null);
  res.json({ success: true });
});

// PUT /api/subscriptions/:id — full subscription update
app.put('/api/subscriptions/:id', (req, res) => {
  const { name, cost, category, next_date, auto_renew, icon } = req.body;
  db.prepare(`UPDATE subscriptions SET
    name=COALESCE(?,name), cost=COALESCE(?,cost), category=COALESCE(?,category),
    next_date=COALESCE(?,next_date), auto_renew=COALESCE(?,auto_renew), icon=COALESCE(?,icon)
    WHERE id=?`).run(name, cost != null ? cost : null, category, next_date,
    auto_renew != null ? (auto_renew ? 1 : 0) : null, icon, req.params.id);
  res.json({ success: true });
});

// PUT /api/shopping/:id — full shopping item update (not just purchased toggle)
app.put('/api/shopping/:id', (req, res) => {
  const { purchased, name, category, priority, estimatedCost, quantity } = req.body;
  const now = new Date().toISOString();
  const updates = ['modified_at = ?'];
  const params = [now];
  if (quantity !== undefined)      { updates.unshift('quantity = ?');      params.unshift(quantity); }
  if (estimatedCost !== undefined) { updates.unshift('estimatedCost = ?'); params.unshift(estimatedCost); }
  if (priority !== undefined)      { updates.unshift('priority = ?');      params.unshift(priority); }
  if (category !== undefined)      { updates.unshift('category = ?');      params.unshift(category); }
  if (name !== undefined)          { updates.unshift('name = ?');          params.unshift(String(name).slice(0,300)); }
  if (purchased !== undefined)     { updates.unshift('purchased = ?');     params.unshift(purchased ? 1 : 0); }
  params.push(req.params.id);
  db.prepare(`UPDATE shopping SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

// Health Extras — individual column store (not a JSON blob)
app.get('/api/health_extras', (req, res) => {
  const row = db.prepare('SELECT * FROM health_extras WHERE id = 1').get();
  if (!row) return res.json(null);
  res.json({ ...row, active_diets: JSON.parse(row.active_diets || '[]'), hobbies: JSON.parse(row.hobbies || '[]') });
});
app.put('/api/health_extras', (req, res) => {
  const {
    vision_score, hearing_score, smell_score, taste_score, touch_score,
    gut_biome_score, dermatology_score, hair_vitality_score,
    bronco_level, posture_status, active_diets, hobbies
  } = req.body;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO health_extras (id, vision_score, hearing_score, smell_score, taste_score, touch_score,
      gut_biome_score, dermatology_score, hair_vitality_score, bronco_level, posture_status,
      active_diets, hobbies, modified_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      vision_score = COALESCE(excluded.vision_score, vision_score),
      hearing_score = COALESCE(excluded.hearing_score, hearing_score),
      smell_score = COALESCE(excluded.smell_score, smell_score),
      taste_score = COALESCE(excluded.taste_score, taste_score),
      touch_score = COALESCE(excluded.touch_score, touch_score),
      gut_biome_score = COALESCE(excluded.gut_biome_score, gut_biome_score),
      dermatology_score = COALESCE(excluded.dermatology_score, dermatology_score),
      hair_vitality_score = COALESCE(excluded.hair_vitality_score, hair_vitality_score),
      bronco_level = COALESCE(excluded.bronco_level, bronco_level),
      posture_status = COALESCE(excluded.posture_status, posture_status),
      active_diets = COALESCE(excluded.active_diets, active_diets),
      hobbies = COALESCE(excluded.hobbies, hobbies),
      modified_at = excluded.modified_at
  `).run(vision_score, hearing_score, smell_score, taste_score, touch_score,
    gut_biome_score, dermatology_score, hair_vitality_score,
    bronco_level, posture_status,
    JSON.stringify(active_diets || []), JSON.stringify(hobbies || []), now);
  res.json({ success: true });
});

// Finance CSV Export
app.get('/api/finance/export', (req, res) => {
  const rows = db.prepare('SELECT * FROM finance ORDER BY date DESC').all();
  const headers = ['id', 'date', 'type', 'category', 'amount', 'note', 'method'];
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))
  ].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="growthtrack-finance-${dateStr}.csv"`);
  res.send(csv);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.message);
  if (err.message?.includes('CORS')) return res.status(403).json({ error: err.message });
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 GrowthTrack Ultimate API`);
    console.log(`   Port      : http://localhost:${PORT}`);
    console.log(`   Env       : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Database  : ${DB_PATH}`);
    console.log(`   CORS      : ${ALLOWED_ORIGINS.join(', ')}`);
    runStartupChecks();
  });
}

module.exports = app;
