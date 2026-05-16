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

// ── Routes ────────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 4G-3: mount phase4a routes
app.use('/', phase4aRoutes(supabase, requireSecret, safeError, queryLimiter));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
