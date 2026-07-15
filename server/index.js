require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');

const phase4aRoutes = require('./routes/phase4a');

const app = express();
const PORT = process.env.PORT || 3001;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({});

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

// Prisma takes care of db connection

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
app.post('/api/tasks', async (req, res) => {
  const r = taskCreateSchema.safeParse(req.body);
  if (!r.success) return res.status(422).json({ error: 'Validation failed', issues: r.error.issues });
  try {
    const task = await prisma.task.create({
      data: {
        ...r.data,
        done: false,
        created_at: new Date(),
      }
    });
    res.json(task);
  } catch (err) {
    safeError(res, err);
  }
});

app.get('/api/tasks', async (_req, res) => {
  try {
    const tasks = await prisma.task.findMany();
    res.json(tasks);
  } catch (err) {
    safeError(res, err);
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.task.update({ where: { id }, data: req.body });
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: 'Task not found' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.task.delete({ where: { id } });
  } catch (err) {}
  res.json({ success: true });
});

// Shopping
app.post('/api/shopping', async (req, res) => {
  const r = shoppingCreateSchema.safeParse(req.body);
  if (!r.success) return res.status(422).json({ error: 'Validation failed', issues: r.error.issues });
  try {
    const item = await prisma.shoppingItem.create({
      data: {
        ...r.data,
        created_at: new Date(),
      }
    });
    res.json(item);
  } catch (err) {
    safeError(res, err);
  }
});

app.get('/api/shopping', async (_req, res) => {
  try {
    const items = await prisma.shoppingItem.findMany();
    res.json(items);
  } catch (err) {
    safeError(res, err);
  }
});

app.delete('/api/shopping/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.shoppingItem.delete({ where: { id } });
  } catch (err) {}
  res.json({ success: true });
});

// User stub (boundary tests)
app.post('/api/user', (_req, res) => res.json({ ok: true }));

// Phase 4A routes
app.use('/', phase4aRoutes(prisma, requireSecret, safeError, queryLimiter));

// Auth routes
const { router: authRouter } = require('./routes/auth')(prisma);
app.use('/api/auth', authRouter);

// Metric Logs
app.get('/api/metric_logs', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const userId = decoded.userId;

    const logs = await prisma.metricLog.findMany({ where: { userId } });
    res.json(logs);
  } catch (err) {
    safeError(res, err);
  }
});

// --- Apple Health Sync Simulation ---
app.post('/api/health/sync/apple', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const userId = decoded.userId;

    const today = new Date();
    // Simulate weight drop over 14 days
    for (let i = 14; i >= 0; i--) {
      const dateStr = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
      const weight = 80 - ((14 - i) * 0.1); // Weight goes from 80kg to 78.6kg
      const log = await prisma.metricLog.findFirst({ where: { userId, date: dateStr, metric: 'weight' } });
      if (!log) {
        await prisma.metricLog.create({
          data: {
            userId,
            date: dateStr,
            metric: 'weight',
            value: weight,
            unit: 'kg',
            source: 'Apple Health',
          }
        });
      } else {
        await prisma.metricLog.update({
          where: { id: log.id },
          data: { value: weight, source: 'Apple Health' }
        });
      }
    }
    res.json({ success: true, message: 'Synced 14 days of Apple Health data' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to sync Apple Health' });
  }
});

// --- Finance Sync Simulation (Mock AA Webhook) ---
app.post('/api/finance/sync/bank', (req, res) => {
  // Simulate 10-15 realistic transactions over the last 30 days
  const transactions = [];
  const count = Math.floor(Math.random() * 6) + 10;
  const categories = ['Food & Dining', 'Groceries', 'Transport', 'Shopping', 'Bills & Utilities', 'Entertainment'];
  const merchants = ['Zomato', 'Swiggy', 'Blinkit', 'Zepto', 'Uber', 'Ola', 'Amazon', 'Flipkart', 'Netflix', 'Spotify', 'Jio'];
  const methods = ['UPI (GPay/PhonePe)', 'Credit Card', 'Debit Card', 'Net Banking'];

  for (let i = 0; i < count; i++) {
    const isIncome = Math.random() > 0.85;
    const amount = isIncome ? Math.floor(Math.random() * 50000) + 15000 : Math.floor(Math.random() * 2000) + 50;
    
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() - Math.floor(Math.random() * 30));
    const dateStr = dateObj.toISOString().split('T')[0];
    
    transactions.push({
      id: `sync_${Date.now()}_${i}`,
      date: dateStr,
      amount: amount,
      type: isIncome ? 'income' : 'expense',
      category: isIncome ? 'Salary / Income' : categories[Math.floor(Math.random() * categories.length)],
      payment_method: methods[Math.floor(Math.random() * methods.length)],
      note: isIncome ? 'Salary Credit (Mock)' : `POS / UPI @ ${merchants[Math.floor(Math.random() * merchants.length)]}`,
      is_synced: true,
      provider: req.body.provider || 'Simulated Bank'
    });
  }
  
  // Return the payload simulating an AA webhook response
  res.json({
    success: true,
    message: 'Sync successful via mock provider',
    data: { transactions }
  });
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;
