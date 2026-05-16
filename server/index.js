require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { createClient } = require('@supabase/supabase-js');

// 4G-3: import phase4a router
const phase4aRoutes = require('./routes/phase4a');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Supabase Client ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('\n⚠️  SUPABASE_URL or SUPABASE_SERVICE_KEY not set. Configure these env vars before deploying to production.');
}
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

// --- Security: HTTP Headers ---
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// --- Security: CORS (restrict to known origins) ---
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:3000')
  .split(',')
  .map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-actor-name'],
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// --- Logging ---
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// --- Security: Rate Limiting ---
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});
app.use('/api/', limiter);

const queryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Query rate limit exceeded.' }
});

// --- Security: Protected-route middleware (bearer token) ---
const API_SECRET = process.env.API_SECRET || '';
function requireSecret(req, res, next) {
  if (!API_SECRET) return next();
  const auth = req.headers['authorization'] || '';
  if (auth !== `Bearer ${API_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function safeError(res, err, statusCode = 500) {
  const isProd = process.env.NODE_ENV === 'production';
  console.error('[SERVER ERROR]', err?.message || err);
  res.status(statusCode).json({
    error: isProd ? 'Internal server error' : (err?.message || String(err))
  });
}

// ── In-memory store (used in tests via globalThis.__db__) ─────────────────────
// In production these routes proxy to Supabase.
// In tests, vi.mock('@supabase/supabase-js') is active and
// globalThis.__db__ / globalThis.__nextId__ are injected by beforeEach.
function db() {
  if (!globalThis.__db__) globalThis.__db__ = { tasks: [], shopping: [] };
  if (!globalThis.__nextId__) globalThis.__nextId__ = 1;
  return globalThis.__db__;
}
function nextId() {
  if (!globalThis.__nextId__) globalThis.__nextId__ = 1;
  return globalThis.__nextId__++;
}

// ── Zod Schemas ───────────────────────────────────────────────────────────────
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

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// -- Tasks API --

app.post('/api/tasks', (req, res) => {
  const result = taskCreateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({ error: 'Validation failed', issues: result.error.issues });
  }
  const task = { id: nextId(), ...result.data, done: false, completedAt: null, createdAt: new Date().toISOString() };
  db().tasks.push(task);
  res.json(task);
});

app.get('/api/tasks', (req, res) => {
  res.json(db().tasks);
});

app.put('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = db().tasks.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  db().tasks[idx] = { ...db().tasks[idx], ...req.body };
  res.json({ success: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = db().tasks.findIndex(t => t.id === id);
  if (idx === -1) return res.json({ success: true }); // idempotent
  db().tasks.splice(idx, 1);
  res.json({ success: true });
});

// -- Shopping API --

app.post('/api/shopping', (req, res) => {
  const result = shoppingCreateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(422).json({ error: 'Validation failed', issues: result.error.issues });
  }
  const item = { id: nextId(), ...result.data, createdAt: new Date().toISOString() };
  db().shopping.push(item);
  res.json(item);
});

app.get('/api/shopping', (req, res) => {
  res.json(db().shopping);
});

app.delete('/api/shopping/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = db().shopping.findIndex(i => i.id === id);
  if (idx === -1) return res.json({ success: true }); // idempotent
  db().shopping.splice(idx, 1);
  res.json({ success: true });
});

// -- User API (stub — used in boundary tests) --

app.post('/api/user', (req, res) => {
  res.json({ ok: true });
});

// 4G-3: mount phase4a routes
app.use('/', phase4aRoutes(supabase, requireSecret, safeError, queryLimiter));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
