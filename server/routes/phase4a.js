/**
 * Phase 4A — New API Routes
 * Covers: hydration, nutrition_logs, audit_log, progress_photos,
 *         goal_progress_logs, finance CSV import, PUT finance/budgets,
 *         ai_chat_history
 */
const express = require('express');
const router = express.Router();
const { z } = require('zod');

// --- Zod Schemas ---

const hydrationLogSchema = z.object({
  amount_ml: z.number().int().positive(),
  logged_at: z.string().optional(),
});

const nutritionLogSchema = z.object({
  meal: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  calories: z.number().nonnegative().optional(),
  protein_g: z.number().nonnegative().optional(),
  carbs_g: z.number().nonnegative().optional(),
  fat_g: z.number().nonnegative().optional(),
  notes: z.string().max(300).optional(),
  logged_at: z.string().optional(),
  date: z.string().optional(),
});

const nutritionLogUpdateSchema = z.object({
  meal: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  calories: z.number().nonnegative().optional(),
  protein_g: z.number().nonnegative().optional(),
  carbs_g: z.number().nonnegative().optional(),
  fat_g: z.number().nonnegative().optional(),
  notes: z.string().max(300).optional(),
  logged_at: z.string().optional(),
  date: z.string().optional(),
});

const auditLogSchema = z.object({
  module: z.string().min(1).max(100),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'VIEW']),
  record_id: z.union([z.string(), z.number()]).optional(),
  details: z.string().max(500).optional(),
});

const progressPhotoSchema = z.object({
  url: z.string().url(),
  date: z.string(),
  notes: z.string().max(300).optional(),
  weight_kg: z.number().nonnegative().optional(),
});

const goalProgressLogSchema = z.object({
  goal_id: z.number().int().positive(),
  value: z.number(),
  date: z.string(),
  notes: z.string().max(300).optional(),
});

const financeUpdateSchema = z.object({
  type: z.enum(['income', 'expense', 'investment']).optional(),
  category: z.string().max(100).optional(),
  amount: z.number().positive().optional(),
  note: z.string().max(500).optional(),
  method: z.string().max(100).optional(),
  date: z.string().optional(),
});

const budgetUpdateSchema = z.object({
  category: z.string().max(100).optional(),
  limit_amount: z.number().nonnegative().optional(),
  period: z.enum(['monthly', 'weekly', 'yearly']).optional(),
});

// --- Helpers ---

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

function withDB(supabase, res, fn) {
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
  return Promise.resolve().then(fn).catch(err => {
    const isProd = process.env.NODE_ENV === 'production';
    console.error('[4A ERROR]', err?.message || err);
    res.status(500).json({ error: isProd ? 'Internal server error' : (err?.message || String(err)) });
  });
}

// --- Route factory (injects supabase) ---

module.exports = function phase4aRoutes(supabase) {

  // -- Hydration --

  router.get('/hydration/logs', (req, res) => withDB(supabase, res, async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('hydration_logs')
      .select('*')
      .gte('logged_at', since)
      .order('logged_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  }));

  router.post('/hydration/log', validate(hydrationLogSchema), (req, res) => withDB(supabase, res, async () => {
    const { amount_ml, logged_at } = req.validated;
    const { data, error } = await supabase
      .from('hydration_logs')
      .insert({ amount_ml, logged_at: logged_at || new Date().toISOString() })
      .select('id')
      .single();
    if (error) throw error;
    res.json({ success: true, id: data.id });
  }));

  // -- Nutrition Logs --

  router.get('/nutrition_logs', (req, res) => withDB(supabase, res, async () => {
    const { date, limit = 50 } = req.query;
    let query = supabase.from('nutrition_logs').select('*').order('logged_at', { ascending: false }).limit(Number(limit));
    if (date) {
      query = query.gte('logged_at', `${date}T00:00:00.000Z`).lte('logged_at', `${date}T23:59:59.999Z`);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  }));

  router.post('/nutrition_logs', validate(nutritionLogSchema), (req, res) => withDB(supabase, res, async () => {
    const { meal, calories, protein_g, carbs_g, fat_g, notes, logged_at, date } = req.validated;
    const { data, error } = await supabase
      .from('nutrition_logs')
      .insert({ meal, calories, protein_g, carbs_g, fat_g, notes, logged_at: logged_at || new Date().toISOString(), date: date || new Date().toISOString().slice(0, 10) })
      .select('id')
      .single();
    if (error) throw error;
    res.json({ success: true, id: data.id });
  }));

  // 4G-2: PUT for updateNutritionLog store action
  router.put('/nutrition_logs/:id', validate(nutritionLogUpdateSchema), (req, res) => withDB(supabase, res, async () => {
    const patch = { ...req.validated, modified_at: new Date().toISOString() };
    const { error } = await supabase.from('nutrition_logs').update(patch).eq('id', Number(req.params.id));
    if (error) throw error;
    res.json({ success: true });
  }));

  router.delete('/nutrition_logs/:id', (req, res) => withDB(supabase, res, async () => {
    const { error } = await supabase.from('nutrition_logs').delete().eq('id', Number(req.params.id));
    if (error) throw error;
    res.json({ success: true });
  }));

  // -- Audit Log --

  router.get('/audit_log', (req, res) => withDB(supabase, res, async () => {
    const { module, action, from, to, limit = 100 } = req.query;
    let query = supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(Number(limit));
    if (module) query = query.eq('module', module);
    if (action) query = query.eq('action', action);
    if (from)   query = query.gte('created_at', `${from}T00:00:00.000Z`);
    if (to)     query = query.lte('created_at', `${to}T23:59:59.999Z`);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  }));

  router.post('/audit_log', validate(auditLogSchema), (req, res) => withDB(supabase, res, async () => {
    const { module, action, record_id, details } = req.validated;
    const { data, error } = await supabase
      .from('audit_log')
      .insert({ module, action, record_id: record_id ? String(record_id) : null, details })
      .select('id')
      .single();
    if (error) throw error;
    res.json({ success: true, id: data.id });
  }));

  // -- Progress Photos --

  router.get('/progress_photos', (req, res) => withDB(supabase, res, async () => {
    const { data, error } = await supabase.from('progress_photos').select('*').order('date', { ascending: false });
    if (error) throw error;
    res.json(data);
  }));

  router.post('/progress_photos', validate(progressPhotoSchema), (req, res) => withDB(supabase, res, async () => {
    const { url, date, notes, weight_kg } = req.validated;
    const { data, error } = await supabase
      .from('progress_photos')
      .insert({ url, date, notes, weight_kg })
      .select('id')
      .single();
    if (error) throw error;
    res.json({ success: true, id: data.id });
  }));

  router.delete('/progress_photos/:id', (req, res) => withDB(supabase, res, async () => {
    const { error } = await supabase.from('progress_photos').delete().eq('id', Number(req.params.id));
    if (error) throw error;
    res.json({ success: true });
  }));

  // -- Goal Progress Logs --

  router.get('/goal_progress_logs', (req, res) => withDB(supabase, res, async () => {
    const { goal_id, limit = 60 } = req.query;
    let query = supabase.from('goal_progress_logs').select('*').order('date', { ascending: false }).limit(Number(limit));
    if (goal_id) query = query.eq('goal_id', Number(goal_id));
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  }));

  router.post('/goal_progress_logs', validate(goalProgressLogSchema), (req, res) => withDB(supabase, res, async () => {
    const { goal_id, value, date, notes } = req.validated;
    const [insertRes, updateRes] = await Promise.all([
      supabase.from('goal_progress_logs').insert({ goal_id, value, date, notes }).select('id').single(),
      supabase.from('goals').update({ current_value: value, modified_at: new Date().toISOString() }).eq('id', goal_id),
    ]);
    if (insertRes.error) throw insertRes.error;
    if (updateRes.error) throw updateRes.error;
    res.json({ success: true, id: insertRes.data.id });
  }));

  // -- Finance CSV Import --

  router.post('/finance/import/csv', (req, res) => withDB(supabase, res, async () => {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(422).json({ error: 'rows array is required and must not be empty' });
    }
    if (rows.length > 500) {
      return res.status(422).json({ error: 'Maximum 500 rows per import' });
    }
    const VALID_TYPES = ['income', 'expense', 'investment'];
    const sanitized = rows.map((r, i) => {
      if (!VALID_TYPES.includes(r.type)) throw new Error(`Row ${i}: invalid type "${r.type}"`);
      if (typeof r.amount !== 'number' || r.amount <= 0) throw new Error(`Row ${i}: amount must be a positive number`);
      return {
        type: r.type,
        category: String(r.category || '').slice(0, 100) || null,
        amount: r.amount,
        note: String(r.note || '').slice(0, 500) || null,
        method: String(r.method || '').slice(0, 100) || null,
        date: r.date || null,
      };
    });
    const { error } = await supabase.from('finance').insert(sanitized);
    if (error) throw error;
    res.json({ success: true, imported: sanitized.length });
  }));

  // -- Finance PUT --

  router.put('/finance/:id', validate(financeUpdateSchema), (req, res) => withDB(supabase, res, async () => {
    const patch = { ...req.validated, modified_at: new Date().toISOString() };
    const { error } = await supabase.from('finance').update(patch).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  }));

  // -- Budgets PUT --

  router.put('/budgets/:id', validate(budgetUpdateSchema), (req, res) => withDB(supabase, res, async () => {
    const { error } = await supabase.from('budgets').update(req.validated).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  }));

  // -- AI Chat History --

  router.get('/ai_chat_history', (req, res) => withDB(supabase, res, async () => {
    const { limit = 50 } = req.query;
    const { data, error } = await supabase
      .from('ai_chat_history')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(Number(limit));
    if (error) throw error;
    res.json(data);
  }));

  router.post('/ai_chat_history', (req, res) => withDB(supabase, res, async () => {
    const { role, content } = req.body;
    if (!['user', 'assistant', 'system'].includes(role)) {
      return res.status(422).json({ error: 'role must be user, assistant, or system' });
    }
    if (!content || typeof content !== 'string') {
      return res.status(422).json({ error: 'content is required' });
    }
    const { data, error } = await supabase
      .from('ai_chat_history')
      .insert({ role, content: content.slice(0, 10000) })
      .select('id')
      .single();
    if (error) throw error;
    res.json({ success: true, id: data.id });
  }));

  router.delete('/ai_chat_history', (req, res) => withDB(supabase, res, async () => {
    const { error } = await supabase.from('ai_chat_history').delete().neq('id', 0);
    if (error) throw error;
    res.json({ success: true });
  }));

  return router;
};
