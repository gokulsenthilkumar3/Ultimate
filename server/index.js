const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
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
  console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// --- Security: HTTP Headers ---
app.use(helmet());

// --- Security: CORS (restrict to known origins) ---
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
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

// --- Protected-route middleware ---
const API_SECRET = process.env.API_SECRET || '';
function requireSecret(req, res, next) {
  if (!API_SECRET) return next();
  const auth = req.headers['authorization'] || '';
  if (auth !== `Bearer ${API_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// --- Validation Schemas ---
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
  estimatedCost: z.number().nonnegative().optional()
});
const financeSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['income', 'expense']),
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

// --- Audit Logger ---
async function logAction(req, action, table, id, details = null) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
  await supabase.from('audit_log').insert({
    action, table_name: table, item_id: id ? String(id) : null,
    details: details ? JSON.stringify(details) : null,
    actor_name: 'System', actor_email: 'admin@growthtrack.ultimate', actor_ip: ip
  });
}

// --- Helper: supabase error handler ---
function dbErr(res, error) {
  console.error('DB error:', error.message);
  return res.status(500).json({ error: error.message });
}

// ==================== ROUTES ====================

// Health
app.get('/api/health', async (req, res) => {
  const { error } = await supabase.from('tasks').select('id').limit(1);
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    database: error ? 'error' : 'connected',
    uptime: process.uptime()
  });
});

// --- Tasks ---
app.get('/api/tasks', async (req, res) => {
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (error) return dbErr(res, error);
  res.json(data.map(r => ({ ...r, done: !!r.done, recurring: !!r.recurring })));
});
app.post('/api/tasks', validate(taskSchema), async (req, res) => {
  const { title, priority, tag, dueDate, recurring, frequency } = req.validated;
  const { data, error } = await supabase.from('tasks').insert({ title, priority, tag, dueDate, recurring: !!recurring, frequency, created_by: 'user', modified_by: 'user' }).select('id').single();
  if (error) return dbErr(res, error);
  await logAction(req, 'INSERT', 'tasks', data.id, { title });
  res.json({ id: data.id });
});
app.put('/api/tasks/:id', async (req, res) => {
  const allowed = ['done','completedAt','lastDone','title','priority','tag','dueDate','recurring','frequency'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  if (updates.done !== undefined) updates.done = !!updates.done;
  if (updates.recurring !== undefined) updates.recurring = !!updates.recurring;
  if (updates.title) updates.title = String(updates.title).slice(0, 500);
  updates.modified_at = new Date().toISOString();
  const { error } = await supabase.from('tasks').update(updates).eq('id', req.params.id);
  if (error) return dbErr(res, error);
  await logAction(req, 'UPDATE', 'tasks', req.params.id);
  res.json({ success: true });
});
app.delete('/api/tasks/:id', async (req, res) => {
  const { error } = await supabase.from('tasks').delete().eq('id', req.params.id);
  if (error) return dbErr(res, error);
  await logAction(req, 'DELETE', 'tasks', req.params.id);
  res.json({ success: true });
});

// --- Shopping ---
app.get('/api/shopping', async (req, res) => {
  const { data, error } = await supabase.from('shopping').select('*').order('created_at', { ascending: false });
  if (error) return dbErr(res, error);
  res.json(data.map(r => ({ ...r, purchased: !!r.purchased })));
});
app.post('/api/shopping', validate(shoppingSchema), async (req, res) => {
  const { name, category, priority, estimatedCost } = req.validated;
  const { data, error } = await supabase.from('shopping').insert({ name, category, priority, estimatedCost, created_by: 'user', modified_by: 'user' }).select('id').single();
  if (error) return dbErr(res, error);
  await logAction(req, 'INSERT', 'shopping', data.id, { name });
  res.json({ id: data.id });
});
app.put('/api/shopping/:id', async (req, res) => {
  const { purchased } = req.body;
  const { error } = await supabase.from('shopping').update({ purchased: !!purchased, modified_at: new Date().toISOString(), modified_by: 'user' }).eq('id', req.params.id);
  if (error) return dbErr(res, error);
  await logAction(req, 'UPDATE', 'shopping', req.params.id);
  res.json({ success: true });
});
app.delete('/api/shopping/:id', async (req, res) => {
  const { error } = await supabase.from('shopping').delete().eq('id', req.params.id);
  if (error) return dbErr(res, error);
  await logAction(req, 'DELETE', 'shopping', req.params.id);
  res.json({ success: true });
});

// --- Timesheet ---
app.get('/api/timesheet', async (req, res) => {
  const { data, error } = await supabase.from('timesheet').select('*').order('created_at', { ascending: false });
  if (error) return dbErr(res, error);
  res.json(data);
});
app.post('/api/timesheet', validate(timesheetSchema), async (req, res) => {
  const { task, duration, date } = req.validated;
  const { data, error } = await supabase.from('timesheet').insert({ task, duration, date, created_by: 'user', modified_by: 'user' }).select('id').single();
  if (error) return dbErr(res, error);
  await logAction(req, 'INSERT', 'timesheet', data.id, { task });
  res.json({ id: data.id });
});
app.put('/api/timesheet/:id', async (req, res) => {
  const { task, duration, date } = req.body;
  const updates = { modified_at: new Date().toISOString(), modified_by: 'user' };
  if (task !== undefined) updates.task = task;
  if (duration !== undefined) updates.duration = duration;
  if (date !== undefined) updates.date = date;
  const { error } = await supabase.from('timesheet').update(updates).eq('id', req.params.id);
  if (error) return dbErr(res, error);
  await logAction(req, 'UPDATE', 'timesheet', req.params.id);
  res.json({ success: true });
});
app.delete('/api/timesheet/:id', async (req, res) => {
  const { error } = await supabase.from('timesheet').delete().eq('id', req.params.id);
  if (error) return dbErr(res, error);
  await logAction(req, 'DELETE', 'timesheet', req.params.id);
  res.json({ success: true });
});

// --- Finance ---
app.get('/api/finance', async (req, res) => {
  const [t, b] = await Promise.all([
    supabase.from('finance').select('*').order('date', { ascending: false }),
    supabase.from('budgets').select('*').order('created_at', { ascending: false })
  ]);
  if (t.error) return dbErr(res, t.error);
  res.json({ transactions: t.data, budgets: b.data || [] });
});
app.post('/api/finance', validate(financeSchema), async (req, res) => {
  const { id, type, category, amount, note, method, date } = req.validated;
  const { error } = await supabase.from('finance').upsert({ id: id || Date.now().toString(), type, category, amount, note, method, date });
  if (error) return dbErr(res, error);
  await logAction(req, 'INSERT', 'finance', id);
  res.json({ success: true });
});
app.delete('/api/finance/:id', async (req, res) => {
  const { error } = await supabase.from('finance').delete().eq('id', req.params.id);
  if (error) return dbErr(res, error);
  await logAction(req, 'DELETE', 'finance', req.params.id);
  res.json({ success: true });
});

// --- Budgets ---
app.get('/api/budgets', async (req, res) => {
  const { data, error } = await supabase.from('budgets').select('*').order('created_at', { ascending: false });
  if (error) return dbErr(res, error);
  res.json(data);
});
app.post('/api/budgets', async (req, res) => {
  const { id, category, limit_amount, period } = req.body;
  if (!category || typeof category !== 'string') return res.status(422).json({ error: 'category is required' });
  if (typeof limit_amount !== 'number' || limit_amount < 0) return res.status(422).json({ error: 'limit_amount must be a non-negative number' });
  const { error } = await supabase.from('budgets').upsert({ id: id || Date.now().toString(), category: category.slice(0, 100), limit_amount, period: period || 'monthly' });
  if (error) return dbErr(res, error);
  res.json({ success: true });
});
app.delete('/api/budgets/:id', async (req, res) => {
  const { error } = await supabase.from('budgets').delete().eq('id', req.params.id);
  if (error) return dbErr(res, error);
  res.json({ success: true });
});

// --- Metric Logs ---
app.get('/api/metric_logs', async (req, res) => {
  const { data, error } = await supabase.from('metric_logs').select('*').order('date', { ascending: false });
  if (error) return dbErr(res, error);
  res.json(data.map(r => ({ ...JSON.parse(r.data), id: r.id, date: r.date })));
});
app.post('/api/metric_logs', async (req, res) => {
  const { date, ...rest } = req.body;
  if (!date) return res.status(422).json({ error: 'date is required' });
  const { data, error } = await supabase.from('metric_logs').insert({ data: JSON.stringify(rest), date }).select('id').single();
  if (error) return dbErr(res, error);
  await logAction(req, 'INSERT', 'metric_logs', data.id);
  res.json({ id: data.id });
});

// --- User Profile ---
app.get('/api/user', async (req, res) => {
  const { data, error } = await supabase.from('user_profile').select('data').eq('id', 1).single();
  if (error && error.code !== 'PGRST116') return dbErr(res, error);
  res.json(data ? JSON.parse(data.data) : {});
});
app.post('/api/user', async (req, res) => {
  const { error } = await supabase.from('user_profile').upsert({ id: 1, data: JSON.stringify(req.body), modified_at: new Date().toISOString(), modified_by: 'user' });
  if (error) return dbErr(res, error);
  await logAction(req, 'UPDATE', 'user_profile', 1);
  res.json({ success: true });
});

// --- Singleton Data Tables ---
const SINGLETON_TABLES = Object.freeze(new Set([
  'training_plan', 'nutrition_strategy', 'lifestyle_tips', 'medical_data',
  'physique_targets', 'assessment_qa', 'skills', 'calendar_events'
]));
SINGLETON_TABLES.forEach(table => {
  app.get(`/api/${table}`, async (req, res) => {
    const { data, error } = await supabase.from(table).select('data').eq('id', 1).single();
    if (error && error.code !== 'PGRST116') return dbErr(res, error);
    res.json(data ? JSON.parse(data.data) : null);
  });
  app.post(`/api/${table}`, async (req, res) => {
    const { error } = await supabase.from(table).upsert({ id: 1, data: JSON.stringify(req.body) });
    if (error) return dbErr(res, error);
    await logAction(req, 'updated', table, 1);
    res.json({ success: true });
  });
});

// --- Habits ---
app.get('/api/habits', async (req, res) => {
  const { data, error } = await supabase.from('habits').select('*').order('created_at', { ascending: true });
  if (error) return dbErr(res, error);
  res.json(data.map(h => ({ ...h, completed_dates: Array.isArray(h.completed_dates) ? h.completed_dates : JSON.parse(h.completed_dates || '[]') })));
});
app.post('/api/habits', validate(habitSchema), async (req, res) => {
  const { name, icon } = req.validated;
  const { data, error } = await supabase.from('habits').insert({ name, icon: icon || '🏃' }).select('id').single();
  if (error) return dbErr(res, error);
  res.json({ success: true, id: data.id });
});
app.put('/api/habits/:id', async (req, res) => {
  const { completed_dates, streak } = req.body;
  const parsedDates = Array.isArray(completed_dates) ? completed_dates : [];
  const parsedStreak = Number.isInteger(streak) ? streak : 0;
  const { error } = await supabase.from('habits').update({ completed_dates: JSON.stringify(parsedDates), streak: parsedStreak }).eq('id', req.params.id);
  if (error) return dbErr(res, error);
  res.json({ success: true });
});
app.delete('/api/habits/:id', async (req, res) => {
  const { error } = await supabase.from('habits').delete().eq('id', req.params.id);
  if (error) return dbErr(res, error);
  res.json({ success: true });
});

// --- Documents ---
app.get('/api/documents', async (req, res) => {
  const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
  if (error) return dbErr(res, error);
  res.json(data);
});
app.post('/api/documents', async (req, res) => {
  const { name, size, date, type, url } = req.body;
  if (!name || typeof name !== 'string') return res.status(422).json({ error: 'name is required' });
  const { data, error } = await supabase.from('documents').insert({ name: name.slice(0, 300), size, date, type: type || 'Private', url }).select('id').single();
  if (error) return dbErr(res, error);
  await logAction(req, 'CREATE', 'documents', data.id, { name });
  res.json({ success: true, id: data.id });
});
app.delete('/api/documents/:id', async (req, res) => {
  const { error } = await supabase.from('documents').delete().eq('id', req.params.id);
  if (error) return dbErr(res, error);
  await logAction(req, 'DELETE', 'documents', req.params.id);
  res.json({ success: true });
});

// --- Notes ---
app.get('/api/notes', async (req, res) => {
  const { data, error } = await supabase.from('notes').select('*').order('pinned', { ascending: false }).order('modified_at', { ascending: false });
  if (error) return dbErr(res, error);
  res.json(data.map(r => ({ ...r, pinned: !!r.pinned })));
});
app.post('/api/notes', validate(noteSchema), async (req, res) => {
  const { id, title, content, color, pinned } = req.validated;
  if (id) {
    const { error } = await supabase.from('notes').update({ title, content, color: color || '#e5a50a', pinned: !!pinned, modified_at: new Date().toISOString() }).eq('id', id);
    if (error) return dbErr(res, error);
    res.json({ success: true, id });
  } else {
    const { data, error } = await supabase.from('notes').insert({ title: title || 'Untitled', content: content || '', color: color || '#e5a50a', pinned: !!pinned }).select('id').single();
    if (error) return dbErr(res, error);
    res.json({ success: true, id: data.id });
  }
});
app.delete('/api/notes/:id', async (req, res) => {
  const { error } = await supabase.from('notes').delete().eq('id', req.params.id);
  if (error) return dbErr(res, error);
  res.json({ success: true });
});

// --- Goals ---
app.get('/api/goals', async (req, res) => {
  const { data, error } = await supabase.from('goals').select('*').order('done', { ascending: true }).order('created_at', { ascending: false });
  if (error) return dbErr(res, error);
  res.json(data.map(r => ({ ...r, done: !!r.done })));
});
app.post('/api/goals', validate(goalSchema), async (req, res) => {
  const { id, title, category, target_value, current_value, unit, deadline, done } = req.validated;
  if (id) {
    const { error } = await supabase.from('goals').update({ title, category, target_value, current_value, unit, deadline, done: !!done, modified_at: new Date().toISOString() }).eq('id', id);
    if (error) return dbErr(res, error);
    res.json({ success: true, id });
  } else {
    const { data, error } = await supabase.from('goals').insert({ title, category, target_value, current_value: current_value || 0, unit, deadline }).select('id').single();
    if (error) return dbErr(res, error);
    res.json({ success: true, id: data.id });
  }
});
app.delete('/api/goals/:id', async (req, res) => {
  const { error } = await supabase.from('goals').delete().eq('id', req.params.id);
  if (error) return dbErr(res, error);
  res.json({ success: true });
});

// --- Sleep Logs ---
app.get('/api/sleep_logs', async (req, res) => {
  const { data, error } = await supabase.from('sleep_logs').select('*').order('date', { ascending: false }).limit(90);
  if (error) return dbErr(res, error);
  res.json(data);
});
app.post('/api/sleep_logs', validate(sleepSchema), async (req, res) => {
  const { date, bed_time, wake_time, duration, quality, notes } = req.validated;
  const { error } = await supabase.from('sleep_logs').upsert({ date, bed_time, wake_time, duration, quality, notes });
  if (error) return dbErr(res, error);
  res.json({ success: true });
});
app.delete('/api/sleep_logs/:date', async (req, res) => {
  const { error } = await supabase.from('sleep_logs').delete().eq('date', req.params.date);
  if (error) return dbErr(res, error);
  res.json({ success: true });
});

// --- Subscriptions ---
app.get('/api/subscriptions', async (req, res) => {
  const { data, error } = await supabase.from('subscriptions').select('*').eq('active', true).order('next_date', { ascending: true });
  if (error) return dbErr(res, error);
  res.json(data.map(r => ({ ...r, auto_renew: !!r.auto_renew, active: !!r.active })));
});
app.post('/api/subscriptions', async (req, res) => {
  const { id, name, cost, category, next_date, auto_renew, icon } = req.body;
  if (!name || typeof name !== 'string') return res.status(422).json({ error: 'name is required' });
  if (typeof cost !== 'number' || cost < 0) return res.status(422).json({ error: 'cost must be a non-negative number' });
  if (id) {
    const { error } = await supabase.from('subscriptions').update({ name, cost, category, next_date, auto_renew: !!auto_renew, icon }).eq('id', id);
    if (error) return dbErr(res, error);
    res.json({ success: true, id });
  } else {
    const { data, error } = await supabase.from('subscriptions').insert({ name, cost, category, next_date, auto_renew: !!auto_renew, icon: icon || '📦' }).select('id').single();
    if (error) return dbErr(res, error);
    res.json({ success: true, id: data.id });
  }
});
app.delete('/api/subscriptions/:id', async (req, res) => {
  const { error } = await supabase.from('subscriptions').update({ active: false }).eq('id', req.params.id);
  if (error) return dbErr(res, error);
  res.json({ success: true });
});

// --- Entertainment ---
app.get('/api/entertainment', async (req, res) => {
  const { data, error } = await supabase.from('entertainment').select('*').order('modified_at', { ascending: false });
  if (error) return dbErr(res, error);
  res.json(data);
});
app.post('/api/entertainment', validate(entertainmentSchema), async (req, res) => {
  const { id, title, type, category, status, rating, progress, poster } = req.validated;
  if (id) {
    const { error } = await supabase.from('entertainment').update({ title, type, category, status, rating, progress, poster, modified_at: new Date().toISOString() }).eq('id', id);
    if (error) return dbErr(res, error);
    res.json({ success: true, id });
  } else {
    const { data, error } = await supabase.from('entertainment').insert({ title, type, category, status, rating, progress, poster }).select('id').single();
    if (error) return dbErr(res, error);
    res.json({ success: true, id: data.id });
  }
});
app.delete('/api/entertainment/:id', async (req, res) => {
  const { error } = await supabase.from('entertainment').delete().eq('id', req.params.id);
  if (error) return dbErr(res, error);
  res.json({ success: true });
});

// --- Audit Logs (protected) ---
app.get('/api/logs', requireSecret, async (req, res) => {
  const { data, error } = await supabase.from('audit_log').select('*').order('timestamp', { ascending: false }).limit(100);
  if (error) return dbErr(res, error);
  res.json(data);
});

// --- Master Dump (protected) ---
app.get('/api/all', requireSecret, async (req, res) => {
  const tables = ['tasks','shopping','timesheet','notes','goals','sleep_logs','documents','subscriptions','habits','entertainment'];
  const singletons = Array.from(SINGLETON_TABLES);
  const [tableResults, singletonResults, auditResult] = await Promise.all([
    Promise.all(tables.map(t => supabase.from(t).select('*'))),
    Promise.all(singletons.map(t => supabase.from(t).select('data').eq('id', 1).single())),
    supabase.from('audit_log').select('*').order('timestamp', { ascending: false }).limit(50)
  ]);
  const result = {};
  tables.forEach((t, i) => { result[t] = tableResults[i].data || []; });
  singletons.forEach((t, i) => { const row = singletonResults[i].data; result[t] = row ? JSON.parse(row.data) : null; });
  result.audit_log = auditResult.data || [];
  res.json(result);
});

// 404 & error handlers
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.message);
  if (err.message?.includes('CORS')) return res.status(403).json({ error: err.message });
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`GrowthTrack server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
    if (!API_SECRET) console.warn('WARNING: API_SECRET not set — protected routes are open (dev mode)');
  });
}

module.exports = app;
