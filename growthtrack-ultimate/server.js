import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createRequire } from 'module';
import Stripe from 'stripe';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';
import { fileURLToPath } from 'url';
import { logToFile } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Resolve the database from this file, not the process working directory.
// This prevents `npm run dev` launched from another folder from creating a
// second empty dev.db and making the app appear to lose its data.
const databaseUrl = process.env.DATABASE_URL || `file:${path.join(__dirname, 'dev.db')}`;
const adapter = new PrismaLibSql({
  url: databaseUrl,
});
const prisma = new PrismaClient({ adapter });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';
const app = express();
const PORT = 3001;
const JWT_SECRET = 'super-secret-local-key';

app.use(cors());
app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());

// Delay to simulate network
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'api-explorer.html'));
});

app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Audit Logs (Read from Winston rotating file)
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 1000 });
    res.json(logs);
  } catch (err) {
    console.error('[Logs Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    const { action, table_name, item_id, details, category, user_id, user_name, user_email, actor_ip, user_agent, severity } = req.body;
    
    await prisma.auditLog.create({ data: {
      action, table_name, item_id, details: typeof details === 'string' ? details : JSON.stringify(details),
      category: category || 'system', user_id, actor_name: user_name, actor_email: user_email,
      actor_ip, user_agent, severity: severity || 'info'
    }});
    logToFile(severity || 'info', details || action, {
      action, table_name, item_id, category, user_id,
      actor_name: user_name, actor_email: user_email,
      actor_ip, user_agent
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('[Logs Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login Logs
app.post('/api/login-logs', async (req, res) => {
  try {
    const { user_id, email, action, failure_reason } = req.body;

    await prisma.loginLog.create({ data: { user_id, email, action, failure_reason, ip_address: req.ip, user_agent: req.headers['user-agent'] } });
    logToFile(action === 'login_failed' ? 'warning' : 'info',
      `${action}: ${email}`,
      { user_id, email, action, failure_reason, ip: req.ip, user_agent: req.headers['user-agent'] }
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('[Login Logs Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Session Logs
app.post('/api/session-logs', async (req, res) => {
  try {
    const { user_id, action, details } = req.body;

    await prisma.sessionLog.create({ data: { user_id, action, details, ip_address: req.ip, user_agent: req.headers['user-agent'] } });
    logToFile('info', `session:${action}`, { user_id, action, details, ip: req.ip, user_agent: req.headers['user-agent'] });
    
    res.json({ success: true });
  } catch (err) {
    console.error('[Session Logs Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const handleSignup = async (req, res) => {
  await delay(500);
  const { email, password, fullName, referralCode } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        referralCode: newReferralCode
      }
    });

    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode } });
      if (referrer) {
        await prisma.referral.create({
          data: {
            referrerId: referrer.id,
            referredId: user.id,
            status: 'pending'
          }
        });
      }
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        referralCode: user.referralCode,
        creditBalance: user.creditBalance,
        user_metadata: { full_name: user.fullName }
      }
    });
  } catch (error) {
    console.error('[Signup Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

app.post('/auth/signup', handleSignup);
app.post('/api/auth/signup', handleSignup);

const handleLogin = async (req, res) => {
  await delay(500);
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        user_metadata: { full_name: user.fullName }
      }
    });
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

app.post('/auth/login', handleLogin);
app.post('/api/auth/login', handleLogin);

const handleMe = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        referralCode: user.referralCode,
        creditBalance: user.creditBalance,
        user_metadata: { full_name: user.fullName }
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.get('/auth/me', handleMe);
app.get('/api/auth/me', handleMe);

// GitHub OAuth Token Exchange
app.post('/auth/github/exchange', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    });
    
    const data = await response.json();
    if (data.error) {
      return res.status(400).json({ error: data.error_description || data.error });
    }
    
    // Return the token to the frontend
    res.json({ access_token: data.access_token });
  } catch (error) {
    console.error('GitHub OAuth Exchange Error:', error);
    res.status(500).json({ error: 'Internal server error during GitHub OAuth' });
  }
});

app.post('/api/create-checkout-session', async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: process.env.STRIPE_PRICE_ID || 'price_mock',
        quantity: 1,
      }],
      success_url: `http://localhost:5173/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:5173/pricing`,
      client_reference_id: userId,
      subscription_data: {
        trial_period_days: 14,
      }
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/webhook/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: 'pro',
          stripeCustomerId: session.customer,
          subscriptionStatus: 'active'
        }
      });
    }
  }

  res.json({ received: true });
});

app.get('/api/referrals', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const history = await prisma.referral.findMany({ 
      where: { referrerId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      referralCode: user.referralCode,
      creditBalance: user.creditBalance,
      history
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/api/referrals/sync', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const referral = await prisma.referral.findFirst({
      where: { referredId: decoded.userId, status: 'pending' }
    });
    
    if (referral) {
      await prisma.referral.update({
        where: { id: referral.id },
        data: { status: 'completed' }
      });
      await prisma.user.update({
        where: { id: referral.referrerId },
        data: { creditBalance: { increment: 10 } }
      });
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { creditBalance: { increment: 10 } }
      });
      return res.json({ success: true, message: 'Referral completed.' });
    }
    res.json({ success: false, message: 'No pending referral found.' });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Middleware to authenticate requests to dynamic endpoints
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ── Admin: list all users ────────────────────────────────────────────────────
app.get('/api/admin/users', authMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, fullName: true,
        subscriptionTier: true, subscriptionStatus: true,
        creditBalance: true, referralCode: true,
        createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: update a user's tier ─────────────────────────────────────────────
app.patch('/api/admin/users/:id', authMiddleware, async (req, res) => {
  try {
    const { subscriptionTier } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { subscriptionTier },
      select: { id: true, email: true, subscriptionTier: true },
    });
    logToFile('info', `Admin updated user tier`, { adminId: req.user.id, targetId: req.params.id, newTier: subscriptionTier });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// Update user singletons
app.post('/user', authMiddleware, async (req, res) => {
  try {
    const data = req.body;
    const updateData = {};
    const singletonFields = ['trainingPlan', 'nutritionStrategy', 'lifestyleTips', 'medicalData', 'physiqueTargets', 'assessmentQA', 'skills', 'calendarEvents', 'wellnessData', 'healthExtras'];
    
    // Also support root fields if needed
    if (data.email) updateData.email = data.email;
    if (data.fullName) updateData.fullName = data.fullName;
    
    singletonFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = typeof data[field] === 'object' ? JSON.stringify(data[field]) : data[field];
      }
    });

    // Support separate endpoints like /training_plan mapping directly to user update
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Single endpoints mapping to user JSON fields
const singletons = [
  'training_plan', 'nutrition_strategy', 'lifestyle_tips', 'medical_data', 
  'physique_targets', 'assessment_qa', 'skills', 'calendar_events', 'wellness_data', 'health_extras'
];

singletons.forEach(route => {
  app.post(`/${route}`, authMiddleware, async (req, res) => {
    try {
      const camelCaseField = route.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { [camelCaseField]: typeof req.body === 'object' ? JSON.stringify(req.body) : req.body }
      });
      res.json(user);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
  
  app.put(`/${route}`, authMiddleware, async (req, res) => {
    try {
      const camelCaseField = route.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { [camelCaseField]: typeof req.body === 'object' ? JSON.stringify(req.body) : req.body }
      });
      res.json(user);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
});

// Dynamic CRUD endpoints for collections
const collections = [
  { name: 'tasks', model: prisma.task },
  { name: 'finance', model: prisma.transaction },
  { name: 'budgets', model: prisma.budget },
  { name: 'metric_logs', model: prisma.metricLog },
  { name: 'nutrition_logs', model: prisma.nutritionLog },
  { name: 'workout_sessions', model: prisma.workoutSession },
  { name: 'shopping', model: prisma.shoppingItem },
  { name: 'timesheet', model: prisma.timesheetSession },
  { name: 'entertainment', model: prisma.entertainmentMedia },
  { name: 'notes', model: prisma.note },
  { name: 'goals', model: prisma.goal },
  { name: 'sleep_logs', model: prisma.sleepLog },
  { name: 'documents', model: prisma.document },
  { name: 'habits', model: prisma.habit },
  { name: 'subscriptions', model: prisma.subscriptionItem },
  { name: 'mood_logs', model: prisma.moodLog },
  { name: 'vitals_logs', model: prisma.vitalsLog },
  { name: 'medications', model: prisma.medication },
];

collections.forEach(({ name, model }) => {
  // GET all for user
  app.get(`/${name}`, authMiddleware, async (req, res) => {
    try {
      const items = await model.findMany({ where: { userId: req.user.id } });
      res.json(items);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST create new
  app.post(`/${name}`, authMiddleware, async (req, res) => {
    try {
      const { id, ...data } = req.body;
      
      // Clean up relations or arrays that might be in the payload
      Object.keys(data).forEach(k => {
        if (typeof data[k] === 'object' && data[k] !== null) {
          data[k] = JSON.stringify(data[k]);
        }
      });
      
      const item = await model.create({
        data: { ...data, userId: req.user.id, id: id || undefined }
      });
      res.json(item);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PUT update
  app.put(`/${name}/:id`, authMiddleware, async (req, res) => {
    try {
      const data = { ...req.body };
      Object.keys(data).forEach(k => {
        if (typeof data[k] === 'object' && data[k] !== null) {
          data[k] = JSON.stringify(data[k]);
        }
      });
      
      const item = await model.updateMany({
        where: { id: req.params.id, userId: req.user.id },
        data
      });
      res.json({ success: true, count: item.count });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE 
  app.delete(`/${name}/:id`, authMiddleware, async (req, res) => {
    try {
      const item = await model.deleteMany({
        where: { id: req.params.id, userId: req.user.id }
      });
      res.json({ success: true, count: item.count });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
});

// Nested entities overrides
app.post('/workout_sessions/:id/exercises', authMiddleware, async (req, res) => {
  try {
    const data = req.body;
    if (data.exercises) {
       await prisma.workoutExercise.createMany({
         data: data.exercises.map(e => ({ ...e, sessionId: req.params.id }))
       });
       return res.json({ success: true });
    }
    const item = await prisma.workoutExercise.create({
       data: { ...data, sessionId: req.params.id }
    });
    res.json(item);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/workout_sessions/:id/exercises', authMiddleware, async (req, res) => {
  try {
    const items = await prisma.workoutExercise.findMany({ where: { sessionId: req.params.id } });
    res.json(items);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/habit_logs', authMiddleware, async (req, res) => {
  try {
    const data = req.body; 
    const habitId = data.habit_id;
    const date = data.date;
    const existing = await prisma.habitLog.findFirst({ where: { habitId, date }});
    if (existing) {
       await prisma.habitLog.delete({ where: { id: existing.id } });
       res.json({ success: true, deleted: true });
    } else {
       const log = await prisma.habitLog.create({ data: { habitId, date } });
       res.json(log);
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/habit_logs/:habitId', authMiddleware, async (req, res) => {
  try {
    const items = await prisma.habitLog.findMany({ where: { habitId: req.params.habitId } });
    res.json(items);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
  logToFile('info', `GrowthTrack server started`, { port: PORT, env: process.env.NODE_ENV || 'development' });
  console.log(`Local Auth Server running on http://localhost:${PORT}`);
});
