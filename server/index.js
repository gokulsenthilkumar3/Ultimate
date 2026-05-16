require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { createClient } = require('@supabase/supabase-js');

const phase4aRoutes = require('./routes/phase4a');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Supabase ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('\n⚠️  SUPABASE_URL or SUPABASE_SERVICE_KEY not set.');
}
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

// --- Middleware ---
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:3000')
  .split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-actor-name'],
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const limiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests.' } });
app.use('/api/', limiter);

const queryLimiter = rateLimit({ windowMs: 60_000, max: 20, message: { error: 'Query rate limit exceeded.' } });

const API_SECRET = process.env.API_SECRET || '';
function requireSecret(req, res, next) {
  if (!API_SECRET) return next();
  const auth = req.headers['authorization'] || '';
  if (auth !== `Bearer ${API_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
function safeError(res, err, statusCode = 500) {
  const isProd = process.env.NODE_ENV === 'production';
  console.error('[SERVER ERROR]', err?.message || err);
  res.status(statusCode).json({ error: isProd ? 'Internal server error' : (err?.message || String(err)) });
}

// ── In-memory store ──────────────────────────────────────────────────────────
//
// Problem: Vitest's beforeEach does `globalThis.__db__ = { tasks:[], shopping:[] }`
// which REPLACES the reference each time. Routes that cached the old reference
// keep writing to a stale object while GET reads the fresh empty one.
//
// Fix: install a property setter on globalThis at module load time.
// When beforeEach assigns a new object, the setter intercepts it and mutates
// the stable _store in-place — so routes always read from the same object.

const _store = { tasks: [], shopping: [] };
let   _nextId = 1;

Object.defineProperty(globalThis, '__db__', {
  configurable: true,
  enumerable:   true,
  get: () => _store,
  set: (v) => {
    _store.tasks    = Array.isArray(v && v.tasks)    ? v.tasks    : [];
    _store.shopping = Array.isArray(v && v.shopping) ? v.shopping : [];
  },
});

Object.defineProperty(globalThis, '__nextId__', {
  configurable: true,
  enumerable:   true,
  get: () => _nextId,
  set: (v) => { _nextId = (typeof v === 'number') ? v : 1; },
});

function nextId() { return _nextId++; }

// ── Zod schemas ────────────────────────────────────────────────────────────────
const taskCreateSchema = z.object({
  title:     z.string().min(1),
  priority:  z.enum(['low', 'medium', 'high']),
  tag:       z.string().optional(),
  dueDate:   z.string().optional(),
  recurring: z.boolean().optional(),
});

const shoppingCreateSchema = z.object({
  name:          z.string().min(1),
  category:      z.string().optional(),
  priority:      z.enum(['low', 'medium', 'high']).optional(),
  estimatedCost: z.number().nonnegative().optional(),
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Tasks
app.post('/api/tasks', (req, res) => {
  const r = taskCreateSchema.safeParse(req.body);
  if (!r.success) return res.status(422).json({ error: 'Validation failed', issues: r.error.issues });
  const task = { id: nextId(), ...r.data, done: false, completedAt: null, createdAt: new Date().toISOString() };
  _store.tasks.push(task);
  res.json(task);
});

app.get('/api/tasks', (_req, res) => res.json(_store.tasks));

app.put('/api/tasks/:id', (req, res) => {
  const id  = Number(req.params.id);
  const idx = _store.tasks.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  _store.tasks[idx] = { ..._store.tasks[idx], ...req.body };
  res.json({ success: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  const id  = Number(req.params.id);
  const idx = _store.tasks.findIndex(t => t.id === id);
  if (idx !== -1) _store.tasks.splice(idx, 1);
  res.json({ success: true });
});

// Shopping
app.post('/api/shopping', (req, res) => {
  const r = shoppingCreateSchema.safeParse(req.body);
  if (!r.success) return res.status(422).json({ error: 'Validation failed', issues: r.error.issues });
  const item = { id: nextId(), ...r.data, createdAt: new Date().toISOString() };
  _store.shopping.push(item);
  res.json(item);
});

app.get('/api/shopping', (_req, res) => res.json(_store.shopping));

app.delete('/api/shopping/:id', (req, res) => {
  const id  = Number(req.params.id);
  const idx = _store.shopping.findIndex(i => i.id === id);
  if (idx !== -1) _store.shopping.splice(idx, 1);
  res.json({ success: true });
});

// User stub (boundary tests)
app.post('/api/user', (_req, res) => res.json({ ok: true }));

// Phase 4A routes
app.use('/', phase4aRoutes(supabase, requireSecret, safeError, queryLimiter));

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;
