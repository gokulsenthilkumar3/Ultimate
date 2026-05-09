require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { createClient } = require('@supabase/supabase-js');

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
  allowedHeaders: ['Content-Type', 'Authorization'],
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

function runStartupChecks() {
  const warnings = [];
  if (!API_SECRET) {
    warnings.push('⚠️  API_SECRET is not set — protected endpoints are open. Set API_SECRET in .env for production.');
  }
  if (!process.env.ALLOWED_ORIGINS) {
    warnings.push('ℹ️  ALLOWED_ORIGINS not set — defaulting to localhost:5173,localhost:3000');
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    warnings.push('⚠️  Supabase env vars missing — API will error on DB calls.');
  }
  if (warnings.length > 0) {
    console.warn('\n╔══════════════════════════════════════════════════════╗');
    console.warn('║           GROWTHTRACK SECURITY / DB NOTICES          ║');
    console.warn('╚══════════════════════════════════════════════════════╝');
    warnings.forEach(w => console.warn(w));
    console.warn('');
  }
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
  id: z.string().uuid().optional(),
  type: z.enum(['income', 'expense', 'investment']),
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

const workoutSessionSchema = z.object({
  date: z.string(),
  notes: z.string().max(500).optional(),
  duration_minutes: z.number().int().min(0).optional(),
});

const workoutExercisesSchema = z.object({
  session_id: z.number().int(),
  exercises: z.array(z.object({
    exercise_name: z.string().min(1).max(200),
    sets: z.number().int().min(1).optional(),
    reps: z.number().int().min(1).optional(),
    weight_kg: z.number().nonnegative().optional(),
    notes: z.string().max(300).optional(),
  })).min(1),
});

const moodLogSchema = z.object({
  date: z.string(),
  mood: z.number().int().min(1).max(10),
  energy: z.number().int().min(1).max(10),
  note: z.string().max(500).optional(),
});

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

async function withDB(res, fn) {
  if (!supabase) {
    return safeError(res, new Error('Supabase not configured'), 500);
  }
  try {
    await fn();
  } catch (err) {
    safeError(res, err, 500);
  }
}

// --- ROUTES ---

// Health check
app.get('/api/health', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ status: 'offline', error: 'Supabase not configured' });
  }
  try {
    const { error } = await supabase.from('user_profile').select('id').limit(1);
    if (error) throw error;
    res.json({ status: 'online', db: 'connected', ts: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'offline', error: e.message });
  }
});

// User Profile (singleton)
app.get('/api/user', (req, res) => withDB(res, async () => {
  const { data, error } = await supabase.from('user_profile').select('data').eq('id', 1).single();
  if (error && error.code !== 'PGRST116') throw error;
  res.json(data ? data.data : {});
}));

app.post('/api/user', (req, res) => withDB(res, async () => {
  const payload = { id: 1, data: req.body, modified_at: new Date().toISOString(), modified_by: 'user' };
  const { error } = await supabase.from('user_profile').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  res.json({ success: true });
}));

// Tasks
app.get('/api/tasks', (req, res) => withDB(res, async () => {
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  res.json(data.map(r => ({ ...r, done: !!r.done, recurring: !!r.recurring })));
}));

app.post('/api/tasks', validate(taskSchema), (req, res) => withDB(res, async () => {
  const { title, priority, tag, dueDate, recurring, frequency } = req.validated;
  const { data, error } = await supabase.from('tasks').insert({
    title,
    priority,
    tag,
    dueDate: dueDate || null,
    recurring: !!recurring,
    frequency: frequency || null,
    created_by: 'user',
    modified_by: 'user'
  }).select('id').single();
  if (error) throw error;
  res.json({ id: data.id });
}));

app.put('/api/tasks/:id', (req, res) => withDB(res, async () => {
  const patch = { ...req.body, modified_at: new Date().toISOString(), modified_by: 'user' };
  const { error } = await supabase.from('tasks').update(patch).eq('id', Number(req.params.id));
  if (error) throw error;
  res.json({ success: true });
}));

app.delete('/api/tasks/:id', (req, res) => withDB(res, async () => {
  const { error } = await supabase.from('tasks').delete().eq('id', Number(req.params.id));
  if (error) throw error;
  res.json({ success: true });
}));

// Shopping
app.get('/api/shopping', (req, res) => withDB(res, async () => {
  const { data, error } = await supabase.from('shopping').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  res.json(data.map(r => ({ ...r, purchased: !!r.purchased })));
}));

app.post('/api/shopping', validate(shoppingSchema), (req, res) => withDB(res, async () => {
  const { name, category, priority, estimatedCost, quantity } = req.validated;
  const { data, error } = await supabase.from('shopping').insert({
    name,
    category,
    priority,
    estimatedCost,
    quantity,
    created_by: 'user',
    modified_by: 'user'
  }).select('id').single();
  if (error) throw error;
  res.json({ id: data.id });
}));

app.put('/api/shopping/:id', (req, res) => withDB(res, async () => {
  const patch = { ...req.body, modified_at: new Date().toISOString(), modified_by: 'user' };
  const { error } = await supabase.from('shopping').update(patch).eq('id', Number(req.params.id));
  if (error) throw error;
  res.json({ success: true });
}));

app.delete('/api/shopping/:id', (req, res) => withDB(res, async () => {
  const { error } = await supabase.from('shopping').delete().eq('id', Number(req.params.id));
  if (error) throw error;
  res.json({ success: true });
}));

// Timesheet
app.get('/api/timesheet', (req, res) => withDB(res, async () => {
  const { data, error } = await supabase.from('timesheet').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  res.json(data);
}));

app.post('/api/timesheet', validate(timesheetSchema), (req, res) => withDB(res, async () => {
  const { task, duration, date } = req.validated;
  const { data, error } = await supabase.from('timesheet').insert({
    task,
    duration,
    date,
    created_by: 'user',
    modified_by: 'user'
  }).select('id').single();
  if (error) throw error;
  res.json({ id: data.id });
}));

app.put('/api/timesheet/:id', (req, res) => withDB(res, async () => {
  const patch = { ...req.body, modified_at: new Date().toISOString(), modified_by: 'user' };
  const { error } = await supabase.from('timesheet').update(patch).eq('id', Number(req.params.id));
  if (error) throw error;
  res.json({ success: true });
}));

app.delete('/api/timesheet/:id', (req, res) => withDB(res, async () => {
  const { error } = await supabase.from('timesheet').delete().eq('id', Number(req.params.id));
  if (error) throw error;
  res.json({ success: true });
}));

// Finance & Budgets
app.get('/api/finance', (req, res) => withDB(res, async () => {
  const [txRes, budgetRes] = await Promise.all([
    supabase.from('finance').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('budgets').select('*').order('created_at', { ascending: false })
  ]);
  if (txRes.error) throw txRes.error;
  if (budgetRes.error) throw budgetRes.error;
  res.json({ transactions: txRes.data, budgets: budgetRes.data });
}));

app.post('/api/finance', validate(financeSchema), (req, res) => withDB(res, async () => {
  const { id, ...rest } = req.validated;
  const payload = { ...rest, date: rest.date || null };
  if (id) payload.id = id;
  const { data, error } = await supabase.from('finance').upsert(payload).select('id').single();
  if (error) throw error;
  res.json({ success: true, id: data.id });
}));

app.delete('/api/finance/:id', (req, res) => withDB(res, async () => {
  const { error } = await supabase.from('finance').delete().eq('id', req.params.id);
  if (error) throw error;
  res.json({ success: true });
}));

app.get('/api/budgets', (req, res) => withDB(res, async () => {
  const { data, error } = await supabase.from('budgets').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  res.json(data);
}));

app.post('/api/budgets', (req, res) => withDB(res, async () => {
  const { id, category, limit_amount, period } = req.body;
  if (!category || typeof category !== 'string') return res.status(422).json({ error: 'category is required' });
  if (typeof limit_amount !== 'number' || limit_amount < 0) return res.status(422).json({ error: 'limit_amount must be a non-negative number' });
  const payload = { id, category: category.slice(0, 100), limit_amount, period: period || 'monthly' };
  const { error } = await supabase.from('budgets').upsert(payload);
  if (error) throw error;
  res.json({ success: true });
}));

app.delete('/api/budgets/:id', (req, res) => withDB(res, async () => {
  const { error } = await supabase.from('budgets').delete().eq('id', req.params.id);
  if (error) throw error;
  res.json({ success: true });
}));

// Metric logs
app.get('/api/metric_logs', (req, res) => withDB(res, async () => {
  const { data, error } = await supabase.from('metric_logs').select('*').order('date', { ascending: false });
  if (error) throw error;
  res.json(data.map(r => ({ ...JSON.parse(r.data), id: r.id, date: r.date })));
}));

app.post('/api/metric_logs', (req, res) => withDB(res, async () => {
  const { date, ...rest } = req.body;
  if (!date) return res.status(422).json({ error: 'date is required' });
  const { data, error } = await supabase.from('metric_logs').insert({ data: JSON.stringify(rest), date }).select('id').single();
  if (error) throw error;
  res.json({ id: data.id });
}));

// Workout Sessions
app.get('/api/workout_sessions', (req, res) => withDB(res, async () => {
  const { from, to } = req.query;
  let query = supabase.from('workout_sessions').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(60);
  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);
  const { data, error } = await query;
  if (error) throw error;
  res.json(data);
}));

app.post('/api/workout_sessions', validate(workoutSessionSchema), (req, res) => withDB(res, async () => {
  const { date, notes, duration_minutes } = req.validated;
  if (!date) return res.status(422).json({ error: 'date is required' });
  const payload = { date, notes: notes || null, duration_minutes: duration_minutes || null };
  const { data, error } = await supabase.from('workout_sessions').insert(payload).select('id').single();
  if (error) throw error;
  res.json({ id: data.id });
}));

app.delete('/api/workout_sessions/:id', (req, res) => withDB(res, async () => {
  const { error } = await supabase.from('workout_sessions').delete().eq('id', Number(req.params.id));
  if (error) throw error;
  res.json({ success: true });
}));

// Workout Exercises for a session
app.get('/api/workout_sessions/:id/exercises', (req, res) => withDB(res, async () => {
  const sessionId = Number(req.params.id);
  const { data, error } = await supabase.from('workout_exercises').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
  if (error) throw error;
  res.json(data);
}));

app.post('/api/workout_sessions/:id/exercises', (req, res) => withDB(res, async () => {
  const sessionId = Number(req.params.id);
  const result = workoutExercisesSchema.safeParse({ session_id: sessionId, exercises: req.body.exercises });
  if (!result.success) {
    return res.status(422).json({ error: 'Validation failed', issues: result.error.issues });
  }
  const { exercises } = result.data;
  const rows = exercises.map(e => ({
    session_id: sessionId,
    exercise_name: e.exercise_name,
    sets: e.sets || null,
    reps: e.reps || null,
    weight_kg: e.weight_kg || null,
    notes: e.notes || null,
  }));
  const { error } = await supabase.from('workout_exercises').insert(rows);
  if (error) throw error;
  res.json({ success: true });
}));

// Mood logs (Mind & Wellness)
app.get('/api/mood_logs', (req, res) => withDB(res, async () => {
  const { from, to, limit = 60 } = req.query;
  let query = supabase.from('mood_logs').select('*').order('date', { ascending: false });
  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);
  const { data, error } = await query.limit(Number(limit));
  if (error) throw error;
  res.json(data);
}));

app.post('/api/mood_logs', validate(moodLogSchema), (req, res) => withDB(res, async () => {
  const { date, mood, energy, note } = req.validated;
  const payload = { date, mood, energy, note: note || null };
  const { error } = await supabase.from('mood_logs').upsert(payload, { onConflict: 'date' });
  if (error) throw error;
  res.json({ success: true });
}));

// Generic singleton tables
const SINGLETON_TABLES = Object.freeze([
  'training_plan',
  'nutrition_strategy',
  'lifestyle_tips',
  'medical_data',
  'physique_targets',
  'assessment_qa',
  'skills',
  'calendar_events',
  'wellness_data'
]);

SINGLETON_TABLES.forEach(table => {
  app.get(`/api/${table}`, (req, res) => withDB(res, async () => {
    const { data, error } = await supabase.from(table).select('data').eq('id', 1).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json(data ? data.data : null);
  }));

  app.post(`/api/${table}`, (req, res) => withDB(res, async () => {
    const payload = { id: 1, data: req.body };
    const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    res.json({ success: true });
  }));
});

// Notes
app.get('/api/notes', (req, res) => withDB(res, async () => {
  const { data, error } = await supabase.from('notes').select('*').order('pinned', { ascending: false }).order('modified_at', { ascending: false });
  if (error) throw error;
  res.json(data.map(r => ({ ...r, pinned: !!r.pinned })));
}));

app.post('/api/notes', validate(noteSchema), (req, res) => withDB(res, async () => {
  const { id, title, content, color, pinned } = req.validated;
  if (id) {
    const { error } = await supabase.from('notes').update({
      title,
      content,
      color: color || '#e5a50a',
      pinned: pinned ? true : false,
      modified_at: new Date().toISOString()
    }).eq('id', id);
    if (error) throw error;
    res.json({ success: true, id });
  } else {
    const { data, error } = await supabase.from('notes').insert({
      title: title || 'Untitled',
      content: content || '',
      color: color || '#e5a50a',
      pinned: pinned ? true : false
    }).select('id').single();
    if (error) throw error;
    res.json({ success: true, id: data.id });
  }
}));

app.put('/api/notes/:id', validate(noteSchema), (req, res) => withDB(res, async () => {
  const { title, content, color, pinned } = req.validated;
  const patch = { modified_at: new Date().toISOString() };
  if (title !== undefined) patch.title = title.slice(0, 300);
  if (content !== undefined) patch.content = content;
  if (color !== undefined) patch.color = color;
  if (pinned !== undefined) patch.pinned = !!pinned;
  const { error } = await supabase.from('notes').update(patch).eq('id', Number(req.params.id));
  if (error) throw error;
  res.json({ success: true });
}));

app.delete('/api/notes/:id', (req, res) => withDB(res, async () => {
  const { error } = await supabase.from('notes').delete().eq('id', Number(req.params.id));
  if (error) throw error;
  res.json({ success: true });
}));

// Goals
app.get('/api/goals', (req, res) => withDB(res, async () => {
  const { data, error } = await supabase.from('goals').select('*').order('done', { ascending: true }).order('created_at', { ascending: false });
  if (error) throw error;
  res.json(data.map(r => ({ ...r, done: !!r.done })));
}));

app.post('/api/goals', validate(goalSchema), (req, res) => withDB(res, async () => {
  const { id, title, category, target_value, current_value, unit, deadline, done } = req.validated;
  if (id) {
    const { error } = await supabase.from('goals').update({
      title,
      category,
      target_value,
      current_value,
      unit,
      deadline,
      done: !!done,
      modified_at: new Date().toISOString()
    }).eq('id', id);
    if (error) throw error;
    res.json({ success: true, id });
  } else {
    const { data, error } = await supabase.from('goals').insert({
      title,
      category,
      target_value,
      current_value: current_value || 0,
      unit,
      deadline
    }).select('id').single();
    if (error) throw error;
    res.json({ success: true, id: data.id });
  }
}));

app.put('/api/goals/:id', (req, res) => withDB(res, async () => {
  const patch = { ...req.body, modified_at: new Date().toISOString() };
  const { error } = await supabase.from('goals').update(patch).eq('id', Number(req.params.id));
  if (error) throw error;
  res.json({ success: true });
}));

app.delete('/api/goals/:id', (req, res) => withDB(res, async () => {
  const { error } = await supabase.from('goals').delete().eq('id', Number(req.params.id));
  if (error) throw error;
  res.json({ success: true });
}));

// Sleep logs
app.get('/api/sleep_logs', (req, res) => withDB(res, async () => {
  const { data, error } = await supabase.from('sleep_logs').select('*').order('date', { ascending: false }).limit(90);
  if (error) throw error;
  res.json(data);
}));

app.post('/api/sleep_logs', validate(sleepSchema), (req, res) => withDB(res, async () => {
  const { date, bed_time, wake_time, duration, quality, notes } = req.validated;
  const payload = { date, bed_time, wake_time, duration, quality, notes };
  const { error } = await supabase.from('sleep_logs').upsert(payload, { onConflict: 'date' });
  if (error) throw error;
  res.json({ success: true });
}));

app.delete('/api/sleep_logs/:date', (req, res) => withDB(res, async () => {
  const { error } = await supabase.from('sleep_logs').delete().eq('date', req.params.date);
  if (error) throw error;
  res.json({ success: true });
}));

// Subscriptions
app.get('/api/subscriptions', (req, res) => withDB(res, async () => {
  const { data, error } = await supabase.from('subscriptions').select('*').eq('active', true).order('next_date', { ascending: true });
  if (error) throw error;
  res.json(data.map(r => ({ ...r, auto_renew: !!r.auto_renew, active: !!r.active })));
}));

app.post('/api/subscriptions', (req, res) => withDB(res, async () => {
  const { id, name, cost, category, next_date, auto_renew, icon } = req.body;
  if (!name || typeof name !== 'string') return res.status(422).json({ error: 'name is required' });
  if (typeof cost !== 'number' || cost < 0) return res.status(422).json({ error: 'cost must be a non-negative number' });
  const payload = { id, name, cost, category, next_date, auto_renew: !!auto_renew, icon: icon || '📦' };
  const { data, error } = await supabase.from('subscriptions').upsert(payload).select('id').single();
  if (error) throw error;
  res.json({ success: true, id: data.id });
}));

app.put('/api/subscriptions/:id', (req, res) => withDB(res, async () => {
  const patch = { ...req.body };
  if (patch.auto_renew != null) patch.auto_renew = !!patch.auto_renew;
  const { error } = await supabase.from('subscriptions').update(patch).eq('id', Number(req.params.id));
  if (error) throw error;
  res.json({ success: true });
}));

app.delete('/api/subscriptions/:id', (req, res) => withDB(res, async () => {
  const { error } = await supabase.from('subscriptions').update({ active: false }).eq('id', Number(req.params.id));
  if (error) throw error;
  res.json({ success: true });
}));

// Habits
app.get('/api/habits', (req, res) => withDB(res, async () => {
  const { data, error } = await supabase.from('habits').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  res.json(data);
}));

app.post('/api/habits', validate(habitSchema), (req, res) => withDB(res, async () => {
  const { name, icon } = req.validated;
  const { data, error } = await supabase.from('habits').insert({ name, icon }).select('id').single();
  if (error) throw error;
  res.json({ success: true, id: data.id });
}));

app.put('/api/habits/:id', (req, res) => withDB(res, async () => {
  const patch = { ...req.body };
  const { error } = await supabase.from('habits').update(patch).eq('id', Number(req.params.id));
  if (error) throw error;
  res.json({ success: true });
}));

app.delete('/api/habits/:id', (req, res) => withDB(res, async () => {
  const { error } = await supabase.from('habits').delete().eq('id', Number(req.params.id));
  if (error) throw error;
  res.json({ success: true });
}));

// Habit logs
app.get('/api/habit_logs/:habitId', (req, res) => withDB(res, async () => {
  const { data, error } = await supabase.from('habit_logs').select('*').eq('habit_id', Number(req.params.habitId)).order('date', { ascending: false });
  if (error) throw error;
  res.json(data);
}));

app.post('/api/habit_logs', (req, res) => withDB(res, async () => {
  const { habit_id, date } = req.body;
  if (!habit_id || !date) return res.status(422).json({ error: 'habit_id and date are required' });
  const { error } = await supabase.from('habit_logs').upsert({ habit_id, date }, { onConflict: 'habit_id,date' });
  if (error) throw error;
  res.json({ success: true });
}));

// Entertainment
app.get('/api/entertainment', (req, res) => withDB(res, async () => {
  const { data, error } = await supabase.from('entertainment').select('*').order('modified_at', { ascending: false });
  if (error) throw error;
  res.json(data);
}));

app.post('/api/entertainment', validate(entertainmentSchema), (req, res) => withDB(res, async () => {
  const { id, title, type, category, status, rating, progress, poster } = req.validated;
  const payload = { title, type, category, status, rating, progress, poster };
  if (id) {
    const { error } = await supabase.from('entertainment').update({ ...payload, modified_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    res.json({ success: true, id });
  } else {
    const { data, error } = await supabase.from('entertainment').insert(payload).select('id').single();
    if (error) throw error;
    res.json({ success: true, id: data.id });
  }
}));

app.put('/api/entertainment/:id', (req, res) => withDB(res, async () => {
  const patch = { ...req.body, modified_at: new Date().toISOString() };
  const { error } = await supabase.from('entertainment').update(patch).eq('id', Number(req.params.id));
  if (error) throw error;
  res.json({ success: true });
}));

app.delete('/api/entertainment/:id', (req, res) => withDB(res, async () => {
  const { error } = await supabase.from('entertainment').delete().eq('id', Number(req.params.id));
  if (error) throw error;
  res.json({ success: true });
}));

// Health extras
app.get('/api/health_extras', (req, res) => withDB(res, async () => {
  const { data, error } = await supabase.from('health_extras').select('*').eq('id', 1).single();
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return res.json(null);
  res.json({ ...data, active_diets: JSON.parse(data.active_diets || '[]'), hobbies: JSON.parse(data.hobbies || '[]') });
}));

app.put('/api/health_extras', (req, res) => withDB(res, async () => {
  const now = new Date().toISOString();
  const payload = {
    id: 1,
    ...req.body,
    active_diets: JSON.stringify(req.body.active_diets || []),
    hobbies: JSON.stringify(req.body.hobbies || []),
    modified_at: now
  };
  const { error } = await supabase.from('health_extras').upsert(payload, { onConflict: 'id' });
  if (error) throw error;
  res.json({ success: true });
}));

// Finance CSV export
app.get('/api/finance/export', (req, res) => withDB(res, async () => {
  const { data, error } = await supabase.from('finance').select('*').order('date', { ascending: false });
  if (error) throw error;
  const headers = ['id', 'date', 'type', 'category', 'amount', 'note', 'method'];
  const csv = [
    headers.join(','),
    ...data.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))
  ].join('\n');
  const dateStr = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="growthtrack-finance-${dateStr}.csv"`);
  res.send(csv);
}));

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
    console.log(`\n🚀 GrowthTrack Ultimate API (Supabase)`);
    console.log(`   Port      : http://localhost:${PORT}`);
    console.log(`   Env       : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   DB        : Supabase ${SUPABASE_URL || '(not configured)'}`);
    console.log(`   CORS      : ${ALLOWED_ORIGINS.join(', ')}`);
    runStartupChecks();
  });
}

module.exports = app;
