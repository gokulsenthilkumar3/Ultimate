import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
import Stripe from 'stripe';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';
import { fileURLToPath } from 'url';
import { logToFile } from './logger.js';
import { createSecurity } from './server/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { PrismaClient } = require('@prisma/client');

// Resolve the database from this file, not the process working directory.
// This prevents `npm run dev` launched from another folder from creating a
// second empty dev.db and making the app appear to lose its data.
const configuredDatabaseUrl = process.env.DATABASE_URL;
const databaseUrl = configuredDatabaseUrl?.startsWith('file:./')
  ? `file:${path.resolve(__dirname, configuredDatabaseUrl.slice('file:'.length)).replaceAll('\\', '/')}`
  : configuredDatabaseUrl || `file:${path.join(__dirname, 'dev.db').replaceAll('\\', '/')}`;
const adapter = new PrismaLibSql({
  url: databaseUrl,
});
const prisma = new PrismaClient({ adapter });
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const app = express();
const PORT = Number(process.env.PORT || 3001);
const APP_URL = process.env.APP_URL || 'http://localhost:5000/Ultimate';
const security = createSecurity({ prisma, logToFile });
const authMiddleware = security.authenticate;

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(security.headers);
app.use(cors(security.corsOptions));
app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '8mb' }));
app.use('/api', (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || /^\/(logs|session-logs|auth)(\/|$)/.test(req.path)) return next();
  res.on('finish', () => {
    if (res.statusCode < 400 && req.user?.id && !req.auditWritten) {
      const segments = req.path.split('/').filter(Boolean);
      void auditCrud({ action: req.method === 'POST' ? 'create' : req.method === 'DELETE' ? 'delete' : 'update', table_name: segments[0] || 'system', item_id: segments[1] || 'request', details: `${req.method} ${req.path}`, userId: req.user.id, req });
    }
  });
  next();
});

app.get('/', (req, res) => {
  res.status(200).json({ service: 'GrowthTrack API', status: 'online' });
});

app.get('/api/health', (req, res) => res.status(200).json({ status: 'online', service: 'GrowthTrack API' }));

// Keep CRUD auditing at the API boundary so every module is covered, including
// modules whose client-side store does not import the logger directly.
async function auditCrud({ action, table_name, item_id, details, userId, req }) {
  req.auditWritten = true;
  try {
    await prisma.auditLog.create({ data: {
      action, table_name, item_id: item_id == null ? null : String(item_id),
      details: typeof details === 'string' ? details : JSON.stringify(details),
      category: 'crud', user_id: userId, actor_ip: req.ip,
      user_agent: req.headers['user-agent'], severity: 'info'
    }});
  } catch (error) {
    console.error('[CRUD Audit Error]', error);
  }
}

function sendInternalError(res, error, context) {
  console.error(`[${context}]`, error);
  return res.status(500).json({ error: 'Internal server error.' });
}

// Audit Logs (Read from Winston rotating file)
app.get('/api/logs', authMiddleware, async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 1000 });
    res.json(logs);
  } catch (err) {
    console.error('[Logs Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/logs', authMiddleware, async (req, res) => {
  try {
    const { action, table_name, item_id, details, category, severity } = req.body;
    
    await prisma.auditLog.create({ data: {
      action, table_name, item_id, details: typeof details === 'string' ? details : JSON.stringify(details),
      category: category || 'system', user_id: req.user.id, actor_name: req.user.fullName, actor_email: req.user.email,
      actor_ip: req.ip, user_agent: req.headers['user-agent'], severity: severity || 'info'
    }});
    logToFile(severity || 'info', details || action, {
      action, table_name, item_id, category, user_id: req.user.id,
      actor_name: req.user.fullName, actor_email: req.user.email,
      actor_ip: req.ip, user_agent: req.headers['user-agent']
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error('[Logs Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Client session annotations are authenticated; start/end lifecycle events are
// generated by the server during login and logout.
app.post('/api/session-logs', authMiddleware, async (req, res) => {
  try {
    const { action, details } = req.body;

    await prisma.sessionLog.create({ data: { user_id: req.user.id, action, details, ip_address: req.ip, user_agent: req.headers['user-agent'] } });
    logToFile('info', `session:${action}`, { user_id: req.user.id, action, details, ip: req.ip, user_agent: req.headers['user-agent'] });
    
    res.json({ success: true });
  } catch (err) {
    console.error('[Session Logs Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post(['/auth/login', '/api/auth/login'], security.login);
app.get(['/auth/me', '/api/auth/me'], authMiddleware, security.me);
app.get(['/auth/csrf', '/api/auth/csrf'], authMiddleware, security.csrf);
app.post(['/auth/logout', '/api/auth/logout'], authMiddleware, security.logout);
app.put('/api/auth/profile', authMiddleware, security.updateProfile);
app.all(['/auth/signup', '/api/auth/signup'], (req, res) => res.status(404).json({ error: 'Signup is disabled. This is a single-user application.' }));

// GitHub OAuth Token Exchange
app.post('/auth/github/exchange', authMiddleware, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) return res.status(503).json({ error: 'GitHub integration is not configured.' });

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

app.post('/api/create-checkout-session', authMiddleware, async (req, res) => {
  if (!stripe || !process.env.STRIPE_PRICE_ID) return res.status(503).json({ error: 'Billing is not configured.' });
  const userId = req.user.id;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      success_url: `${APP_URL}/profile?billing=success`,
      cancel_url: `${APP_URL}/profile?billing=cancelled`,
      client_reference_id: userId,
      subscription_data: {
        trial_period_days: 14,
      }
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error(error);
    sendInternalError(res, error, 'Stripe checkout');
  }
});

app.post('/api/webhook/stripe', async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) return res.status(503).json({ error: 'Stripe webhook is not configured.' });
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

app.get('/api/referrals', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    
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

app.post('/api/referrals/sync', authMiddleware, async (req, res) => {
  try {
    const referral = await prisma.referral.findFirst({
      where: { referredId: req.user.id, status: 'pending' }
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
        where: { id: req.user.id },
        data: { creditBalance: { increment: 10 } }
      });
      return res.json({ success: true, message: 'Referral completed.' });
    }
    res.json({ success: false, message: 'No pending referral found.' });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

const parseStoredJson = (value, fallback = null) => {
  if (value == null) return fallback;
  try { return JSON.parse(value); } catch { return value; }
};
const jsonSize = value => Buffer.byteLength(JSON.stringify(value ?? null), 'utf8');
const PROTECTED_MUTATION_FIELDS = new Set(['id', 'userId', 'user_id', 'createdAt', 'updatedAt']);
const stripProtectedFields = source => Object.fromEntries(Object.entries(source || {}).filter(([key]) => !PROTECTED_MUTATION_FIELDS.has(key)));

const metricColumns = new Set(['date', 'metric', 'value', 'source']);
const metricToClient = row => row ? { ...parseStoredJson(row.data, {}), ...row, data: undefined } : row;
const metricPayload = input => {
  const raw = { ...(input || {}) };
  delete raw.id; delete raw.userId; delete raw.createdAt;
  const columns = Object.fromEntries(Object.entries(raw).filter(([key]) => metricColumns.has(key)));
  const details = Object.fromEntries(Object.entries(raw).filter(([key, value]) => !metricColumns.has(key) && value !== '' && value !== undefined));
  return { ...columns, value: columns.value == null || columns.value === '' ? null : Number(columns.value), data: JSON.stringify(details) };
};

const ownerFieldMap = {
  avatar: 'avatar', phone: 'phone', bio: 'bio', dob: 'dateOfBirth', gender: 'gender', bloodType: 'bloodType',
  location_name: 'locationName', country: 'country', state: 'state', city: 'city', nationality: 'nationality', language: 'language', timezone: 'timezone',
  occupation: 'occupation', education: 'education', maritalStatus: 'maritalStatus', incomeBracket: 'incomeBracket', livingSituation: 'livingSituation',
  dietaryPreference: 'dietaryPreference', emergencyContactName: 'emergencyContactName', emergencyContactPhone: 'emergencyContactPhone',
  medicalConditions: 'medicalConditions', allergies: 'allergies', restingHeartRate: 'restingHeartRate', activityLevel: 'activityLevel',
  maintenanceCalories: 'maintenanceCalories', trainingStyle: 'trainingStyle', baseCurrency: 'baseCurrency', isdCode: 'isdCode', netWorth: 'netWorth',
  primaryBank: 'primaryBank', passportNationality: 'passportNationality', dateFormat: 'dateFormat', measurementSystem: 'measurementSystem',
  textDirection: 'textDirection', motherLanguage: 'motherLanguage', motherLanguageProficiency: 'motherLanguageProficiency', privacyLevel: 'privacyLevel',
  emailNotifications: 'emailNotifications', smsNotifications: 'smsNotifications', notifications: 'notifications', primaryGoal: 'primaryGoal',
};
const ownerNumberFields = new Set(['incomeBracket', 'restingHeartRate', 'maintenanceCalories', 'netWorth']);
const ownerBooleanFields = new Set(['emailNotifications', 'smsNotifications', 'notifications']);

const bodyFieldMap = {
  height: 'heightCm', weight: 'weightKg', bodyFat: 'bodyFatPct', chest: 'chestCm', waist: 'waistCm', shoulders: 'shouldersCm',
  arms: 'armsCm', forearm: 'forearmsCm', hips: 'hipsCm', thighs: 'thighsCm', calves: 'calvesCm', neck: 'neckCm', glutes: 'glutesCm',
  ankle: 'ankleCm', torsoLength: 'torsoLengthCm', upperArm: 'upperArmCm', lowerArm: 'lowerArmCm', handLength: 'handLengthCm',
  legLength: 'legLengthCm', footLength: 'footLengthCm', headCirc: 'headCircCm', headTiltAngle: 'headTiltAngle', pelvicTilt: 'pelvicTilt',
  shoulderRounding: 'shoulderRounding', brow_depth: 'browDepth', nose_bridge_width: 'noseBridgeWidth', nose_tip_size: 'noseTipSize',
  ear_prominence: 'earProminence', jaw_width: 'jawWidth', chin_projection: 'chinProjection', lip_fullness: 'lipFullness', eye_size: 'eyeSize', skinTone: 'skinTone',
};
const bodyNumberFields = new Set(Object.values(bodyFieldMap).filter(field => field !== 'skinTone'));

const mapClientFields = (source, mapping, numberFields = new Set(), booleanFields = new Set()) => Object.fromEntries(
  Object.entries(mapping).filter(([clientField]) => source[clientField] !== undefined).map(([clientField, databaseField]) => {
    const value = source[clientField];
    if (numberFields.has(databaseField)) {
      const parsed = Number(value);
      return [databaseField, value === '' || value == null || !Number.isFinite(parsed) ? null : parsed];
    }
    if (booleanFields.has(databaseField)) return [databaseField, Boolean(value)];
    return [databaseField, value === '' ? null : value];
  }),
);

const mapDatabaseFields = (source, mapping) => source ? Object.fromEntries(
  Object.entries(mapping).map(([clientField, databaseField]) => [clientField, source[databaseField]]),
) : {};

app.get('/api/config', authMiddleware, async (req, res) => {
  const [settings, integrations, helpArticles, planTemplates] = await Promise.all([
    prisma.appSetting.findMany({ orderBy: { key: 'asc' } }),
    prisma.integrationProvider.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] }),
    prisma.helpArticle.findMany({ where: { enabled: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.planTemplate.findMany({ where: { active: true }, orderBy: [{ planType: 'asc' }, { sortOrder: 'asc' }] }),
  ]);
  res.json({
    settings: Object.fromEntries(settings.map(setting => [setting.key, parseStoredJson(setting.value, setting.value)])),
    integrations,
    helpArticles,
    planTemplates,
  });
});

app.put('/api/config/:key', authMiddleware, async (req, res) => {
  const key = String(req.params.key || '').trim();
  if (!/^[a-z][a-zA-Z0-9.-]{0,63}$/.test(key)) return res.status(400).json({ error: 'Setting key is invalid.' });
  const rawValue = req.body?.value ?? req.body;
  if (jsonSize(rawValue) > 512 * 1024) return res.status(413).json({ error: 'Setting value is too large.' });
  const value = JSON.stringify(rawValue);
  const category = ['application', 'integration', 'content'].includes(req.body?.category) ? req.body.category : 'application';
  const setting = await prisma.appSetting.upsert({
    where: { key }, update: { value, valueType: 'json', category },
    create: { key, value, valueType: 'json', category },
  });
  await auditCrud({ action: 'update', table_name: 'app_settings', item_id: setting.id, details: `Updated ${key}`, userId: req.user.id, req });
  res.json({ ...setting, value: parseStoredJson(setting.value, setting.value) });
});

app.get('/api/health-profile', authMiddleware, async (req, res) => {
  const profile = await prisma.healthProfile.findUnique({ where: { userId: req.user.id } });
  res.json(profile ? { ...profile, data: parseStoredJson(profile.data, {}) } : { data: {} });
});

app.put('/api/health-profile', authMiddleware, async (req, res) => {
  const current = await prisma.healthProfile.findUnique({ where: { userId: req.user.id } });
  const merged = { ...parseStoredJson(current?.data, {}), ...(req.body || {}) };
  if (jsonSize(merged) > 1024 * 1024) return res.status(413).json({ error: 'Health profile is too large.' });
  const profile = await prisma.healthProfile.upsert({ where: { userId: req.user.id }, update: { data: JSON.stringify(merged) }, create: { userId: req.user.id, data: JSON.stringify(merged) } });
  await auditCrud({ action: current ? 'update' : 'create', table_name: 'health_profiles', item_id: profile.id, details: { fields: Object.keys(req.body || {}) }, userId: req.user.id, req });
  res.json({ ...profile, data: merged });
});

app.post('/api/profile/avatar', authMiddleware, async (req, res) => {
  const avatar = req.body?.avatar;
  if (typeof avatar !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/i.test(avatar)) return res.status(400).json({ error: 'Use a PNG, JPEG, or WebP image.' });
  if (Buffer.byteLength(avatar, 'utf8') > 7 * 1024 * 1024) return res.status(413).json({ error: 'Profile image must be 5 MB or smaller.' });
  const profile = await prisma.ownerProfile.upsert({ where: { userId: req.user.id }, update: { avatar }, create: { userId: req.user.id, avatar } });
  await auditCrud({ action: 'update', table_name: 'owner_profiles', item_id: profile.id, details: 'Updated profile picture', userId: req.user.id, req });
  res.json({ avatar });
});

app.get('/api/locations', authMiddleware, async (req, res) => {
  res.json(await prisma.locationPoint.findMany({ where: { userId: req.user.id }, orderBy: { capturedAt: 'desc' }, take: 500 }));
});

app.post('/api/locations', authMiddleware, async (req, res) => {
  const latitude = Number(req.body?.latitude), longitude = Number(req.body?.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return res.status(400).json({ error: 'Valid coordinates are required.' });
  const requestedDate = req.body?.capturedAt ? new Date(req.body.capturedAt) : new Date();
  if (Number.isNaN(requestedDate.getTime())) return res.status(400).json({ error: 'Capture time is invalid.' });
  const accuracy = Number(req.body?.accuracyM);
  const source = String(req.body?.source || 'browser').slice(0, 32);
  const point = await prisma.locationPoint.create({ data: { userId: req.user.id, latitude, longitude, accuracyM: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null, source, capturedAt: requestedDate } });
  await auditCrud({ action: 'create', table_name: 'location_points', item_id: point.id, details: 'Saved location timeline point', userId: req.user.id, req });
  res.json(point);
});

app.get('/api/custom-tables', authMiddleware, async (req, res) => {
  const rows = await prisma.customTable.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'asc' } });
  res.json(rows.map(row => ({ ...row, fields: parseStoredJson(row.schema, []), rows: parseStoredJson(row.rows, []) })));
});

app.put('/api/custom-tables', authMiddleware, async (req, res) => {
  const tables = Array.isArray(req.body) ? req.body : [];
  if (tables.length > 100 || jsonSize(tables) > 2 * 1024 * 1024) return res.status(413).json({ error: 'Custom database payload is too large.' });
  const incomingIds = tables.map(table => String(table.id)).filter(Boolean);
  const conflicting = incomingIds.length ? await prisma.customTable.findFirst({ where: { id: { in: incomingIds }, userId: { not: req.user.id } }, select: { id: true } }) : null;
  if (conflicting) return res.status(403).json({ error: 'A custom table identifier is not owned by this account.' });
  await prisma.customTable.deleteMany({ where: { userId: req.user.id, ...(incomingIds.length ? { id: { notIn: incomingIds } } : {}) } });
  const saved = [];
  for (const table of tables) {
    const id = String(table.id || crypto.randomUUID());
    const fields = Array.isArray(table.fields) ? table.fields.slice(0, 100) : [];
    const rows = Array.isArray(table.rows) ? table.rows.slice(0, 10_000) : [];
    const data = { name: String(table.name || 'Untitled').trim().slice(0, 100) || 'Untitled', schema: JSON.stringify(fields), rows: JSON.stringify(rows) };
    saved.push(await prisma.customTable.upsert({ where: { id }, update: data, create: { id, userId: req.user.id, ...data } }));
  }
  await auditCrud({ action: 'update', table_name: 'custom_tables', item_id: 'bulk', details: `Saved ${saved.length} custom tables`, userId: req.user.id, req });
  res.json({ success: true, count: saved.length });
});

app.get('/api/preferences', authMiddleware, async (req, res) => {
  const preference = await prisma.userPreference.upsert({ where: { userId: req.user.id }, update: {}, create: { userId: req.user.id } });
  res.json({ ...preference, navigationOrder: parseStoredJson(preference.navigationOrder, []), navigationTabOrder: parseStoredJson(preference.navigationTabOrder, {}) });
});

app.put('/api/preferences', authMiddleware, async (req, res) => {
  const allowed = ['theme', 'palette', 'sidebarCollapsed', 'onboardingComplete', 'reducedMotion'];
  const data = Object.fromEntries(allowed.filter(key => req.body[key] !== undefined).map(key => [key, req.body[key]]));
  if (req.body.navigationOrder !== undefined) data.navigationOrder = JSON.stringify(req.body.navigationOrder);
  if (req.body.navigationTabOrder !== undefined) data.navigationTabOrder = JSON.stringify(req.body.navigationTabOrder);
  const preference = await prisma.userPreference.upsert({ where: { userId: req.user.id }, update: data, create: { userId: req.user.id, ...data } });
  res.json({ ...preference, navigationOrder: parseStoredJson(preference.navigationOrder, []), navigationTabOrder: parseStoredJson(preference.navigationTabOrder, {}) });
});

app.get('/api/body-profile', authMiddleware, async (req, res) => {
  const profile = await prisma.bodyProfile.findUnique({ where: { userId: req.user.id } });
  res.json(profile || {});
});

app.put('/api/body-profile', authMiddleware, async (req, res) => {
  const allowed = [...bodyNumberFields, 'targetWeightKg', 'targetBodyFatPct', 'targetChestCm', 'targetWaistCm', 'targetShouldersCm', 'targetArmsCm', 'targetThighsCm', 'skinTone'];
  const data = Object.fromEntries(allowed.filter(key => req.body[key] !== undefined).map(key => {
    const value = req.body[key];
    if (key === 'skinTone') return [key, value === '' ? null : value];
    const parsed = Number(value);
    return [key, value === '' || value == null || !Number.isFinite(parsed) ? null : parsed];
  }));
  const profile = await prisma.bodyProfile.upsert({ where: { userId: req.user.id }, update: data, create: { userId: req.user.id, ...data } });
  res.json(profile);
});

app.get('/api/social-profiles', authMiddleware, async (req, res) => {
  res.json(await prisma.socialProfile.findMany({ where: { userId: req.user.id }, orderBy: { sortOrder: 'asc' } }));
});

app.put('/api/social-profiles', authMiddleware, async (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : [];
  const result = [];
  for (const [index, row] of rows.entries()) {
    if (!row.provider) continue;
    result.push(await prisma.socialProfile.upsert({ where: { userId_provider: { userId: req.user.id, provider: String(row.provider) } }, update: { profileUrl: row.profileUrl || null, followers: Number(row.followers || 0), avgLikes: Number(row.avgLikes || 0), avgViews: Number(row.avgViews || 0), enabled: row.enabled !== false, sortOrder: index }, create: { userId: req.user.id, provider: String(row.provider), profileUrl: row.profileUrl || null, followers: Number(row.followers || 0), avgLikes: Number(row.avgLikes || 0), avgViews: Number(row.avgViews || 0), enabled: row.enabled !== false, sortOrder: index } }));
  }
  res.json(result);
});

app.get('/api/state', authMiddleware, async (req, res) => {
  const [user, ownerProfile, preference, bodyProfile, healthProfile, socialProfiles, tasks, finance, budgets, metric_logs, nutrition_logs, workout_sessions, shopping, timesheet, entertainment, notes, goals, sleep_logs, documents, habits, subscriptions, moodLogs, vitalsLogs, medications, customTables, configRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user.id } }),
    prisma.ownerProfile.findUnique({ where: { userId: req.user.id } }),
    prisma.userPreference.findUnique({ where: { userId: req.user.id } }),
    prisma.bodyProfile.findUnique({ where: { userId: req.user.id } }),
    prisma.healthProfile.findUnique({ where: { userId: req.user.id } }),
    prisma.socialProfile.findMany({ where: { userId: req.user.id }, orderBy: { sortOrder: 'asc' } }),
    prisma.task.findMany({ where: { userId: req.user.id } }), prisma.transaction.findMany({ where: { userId: req.user.id } }), prisma.budget.findMany({ where: { userId: req.user.id } }), prisma.metricLog.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } }), prisma.nutritionLog.findMany({ where: { userId: req.user.id } }), prisma.workoutSession.findMany({ where: { userId: req.user.id } }), prisma.shoppingItem.findMany({ where: { userId: req.user.id } }), prisma.timesheetSession.findMany({ where: { userId: req.user.id } }), prisma.entertainmentMedia.findMany({ where: { userId: req.user.id } }), prisma.note.findMany({ where: { userId: req.user.id } }), prisma.goal.findMany({ where: { userId: req.user.id } }), prisma.sleepLog.findMany({ where: { userId: req.user.id } }), prisma.document.findMany({ where: { userId: req.user.id } }), prisma.habit.findMany({ where: { userId: req.user.id } }), prisma.subscriptionItem.findMany({ where: { userId: req.user.id } }), prisma.moodLog.findMany({ where: { userId: req.user.id } }), prisma.vitalsLog.findMany({ where: { userId: req.user.id } }), prisma.medication.findMany({ where: { userId: req.user.id } }), prisma.customTable.findMany({ where: { userId: req.user.id } }), prisma.appSetting.findMany(),
  ]);
  const profileBaseline = metric_logs.find(row => row.source === 'profile' && row.metric === 'profile_baseline');
  res.json({
    user: {
      id: user.id, email: user.email, name: user.fullName, fullName: user.fullName,
      ...mapDatabaseFields(ownerProfile, ownerFieldMap),
      ...mapDatabaseFields(bodyProfile, bodyFieldMap),
      ...parseStoredJson(profileBaseline?.data, {}),
      socialLinks: socialProfiles.map(profile => ({ id: profile.id, platform: profile.provider, url: profile.profileUrl || '' })),
      trainingPlan: parseStoredJson(user.trainingPlan), nutritionStrategy: parseStoredJson(user.nutritionStrategy), lifestyleTips: parseStoredJson(user.lifestyleTips, []),
      medicalData: parseStoredJson(user.medicalData), physiqueTargets: parseStoredJson(user.physiqueTargets), assessmentQA: parseStoredJson(user.assessmentQA, []),
      skills: parseStoredJson(user.skills, []), calendar_events: parseStoredJson(user.calendarEvents, []), wellnessData: parseStoredJson(user.wellnessData), healthExtras: parseStoredJson(user.healthExtras),
    },
    preference: preference ? { ...preference, navigationOrder: parseStoredJson(preference.navigationOrder, []), navigationTabOrder: parseStoredJson(preference.navigationTabOrder, {}) } : null,
    bodyProfile, healthProfile: parseStoredJson(healthProfile?.data, {}), socialProfiles, tasks, finance, budgets, metric_logs: metric_logs.map(metricToClient), nutrition_logs, workout_sessions, shopping, timesheet, entertainment, notes, goals, sleep_logs, documents, habits, subscriptions, moodLogs, vitalsLogs, medications,
    databases: customTables.map(table => ({ ...table, fields: parseStoredJson(table.schema, []), rows: parseStoredJson(table.rows, []) })),
    config: Object.fromEntries(configRows.map(row => [row.key, parseStoredJson(row.value, row.value)])),
  });
});


// Update user singletons
app.post('/api/user', authMiddleware, async (req, res) => {
  try {
    const data = req.body;
    const updateData = {};
    const singletonFields = ['trainingPlan', 'nutritionStrategy', 'lifestyleTips', 'medicalData', 'physiqueTargets', 'assessmentQA', 'skills', 'calendarEvents', 'wellnessData', 'healthExtras'];

    singletonFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = typeof data[field] === 'object' ? JSON.stringify(data[field]) : data[field];
      }
    });

    if (Object.keys(updateData).length) await prisma.user.update({ where: { id: req.user.id }, data: updateData });

    const ownerData = mapClientFields(data, ownerFieldMap, ownerNumberFields, ownerBooleanFields);
    if (Object.keys(ownerData).length) {
      await prisma.ownerProfile.upsert({ where: { userId: req.user.id }, update: ownerData, create: { userId: req.user.id, ...ownerData } });
    }

    const bodyClientData = Object.fromEntries(Object.keys(bodyFieldMap).filter(key => data[key] !== undefined).map(key => [key, data[key]]));
    if (Object.keys(bodyClientData).length) {
      const existingBaseline = await prisma.metricLog.findFirst({ where: { userId: req.user.id, source: 'profile', metric: 'profile_baseline' }, orderBy: { createdAt: 'desc' } });
      const payload = metricPayload({ ...parseStoredJson(existingBaseline?.data, {}), ...bodyClientData, date: new Date().toISOString().slice(0, 10), metric: 'profile_baseline', source: 'profile' });
      if (existingBaseline) await prisma.metricLog.update({ where: { id: existingBaseline.id }, data: payload });
      else await prisma.metricLog.create({ data: { ...payload, userId: req.user.id } });
    }

    if (Array.isArray(data.socialLinks)) {
      await prisma.socialProfile.deleteMany({ where: { userId: req.user.id } });
      const links = data.socialLinks.filter(link => link?.platform).map((link, index) => ({
        userId: req.user.id,
        provider: String(link.platform),
        profileUrl: String(link.url || ''),
        sortOrder: index,
      }));
      if (links.length) await prisma.socialProfile.createMany({ data: links });
    }

    res.json({ success: true });
  } catch (error) {
    sendInternalError(res, error, 'User profile update');
  }
});

// Single endpoints mapping to user JSON fields
const singletons = [
  'training_plan', 'nutrition_strategy', 'lifestyle_tips', 'medical_data', 
  'physique_targets', 'assessment_qa', 'skills', 'calendar_events', 'wellness_data', 'health_extras'
];

singletons.forEach(route => {
  app.post(`/api/${route}`, authMiddleware, async (req, res) => {
    try {
      const camelCaseField = route.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { [camelCaseField]: typeof req.body === 'object' ? JSON.stringify(req.body) : req.body }
      });
      res.json(user);
    } catch(e) { sendInternalError(res, e, `${route} update`); }
  });
  
  app.put(`/api/${route}`, authMiddleware, async (req, res) => {
    try {
      const camelCaseField = route.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { [camelCaseField]: typeof req.body === 'object' ? JSON.stringify(req.body) : req.body }
      });
      res.json(user);
    } catch(e) { sendInternalError(res, e, `${route} update`); }
  });
});

// Domain endpoints that adapt specialized module payloads to the canonical
// local tables. This keeps modules interconnected without duplicate storage.
app.get('/api/hydration/logs', authMiddleware, async (req, res) => {
  const rows = await prisma.metricLog.findMany({ where: { userId: req.user.id, metric: 'hydration' }, orderBy: { createdAt: 'desc' }, take: 1000 });
  res.json(rows.map(metricToClient));
});

app.post('/api/hydration/log', authMiddleware, async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || Math.abs(amount) > 5000) return res.status(400).json({ error: 'Hydration amount is invalid.' });
  const at = req.body?.at ? new Date(req.body.at) : new Date();
  if (Number.isNaN(at.getTime())) return res.status(400).json({ error: 'Hydration time is invalid.' });
  const payload = metricPayload({ metric: 'hydration', source: 'manual', date: at.toISOString().slice(0, 10), value: amount, amount, at: at.toISOString() });
  const row = await prisma.metricLog.create({ data: { ...payload, userId: req.user.id } });
  await auditCrud({ action: 'create', table_name: 'metric_logs', item_id: row.id, details: 'Logged hydration', userId: req.user.id, req });
  res.json(metricToClient(row));
});

app.get('/api/notifications', authMiddleware, async (req, res) => {
  const rows = await prisma.auditLog.findMany({ where: { user_id: req.user.id, category: 'crud' }, orderBy: { timestamp: 'desc' }, take: 50 });
  res.json(rows.map(row => ({ id: row.id, type: 'system', title: `${row.action || 'Updated'} ${row.table_name || 'record'}`, message: row.details || 'Local data changed.', createdAt: row.timestamp })));
});

app.post('/api/health/sync/apple', authMiddleware, (_req, res) => {
  res.status(501).json({ error: 'Apple Health requires an approved native HealthKit connector; browser-only sync is not available.' });
});

const parseCsvRow = line => {
  const cells = []; let value = ''; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { cells.push(value.trim()); value = ''; }
    else value += char;
  }
  cells.push(value.trim());
  return cells;
};
const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;

app.post('/api/finance/import/csv', authMiddleware, async (req, res) => {
  const content = String(req.body?.content || '');
  if (!content || Buffer.byteLength(content, 'utf8') > 2 * 1024 * 1024) return res.status(413).json({ error: 'CSV must be between 1 byte and 2 MB.' });
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2 || lines.length > 5001) return res.status(400).json({ error: 'CSV needs a header and up to 5,000 rows.' });
  const headers = parseCsvRow(lines[0]).map(header => header.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
  const allowed = new Set(['amount', 'type', 'category', 'method', 'date', 'note']);
  const rows = lines.slice(1).map(parseCsvRow).map(cells => Object.fromEntries(headers.map((header, index) => [header, cells[index]]).filter(([header]) => allowed.has(header)))).map(row => ({
    userId: req.user.id,
    amount: Number.isFinite(Number(row.amount)) ? Number(row.amount) : null,
    type: row.type || null, category: row.category || null, method: row.method || null, date: row.date || null, note: row.note || null,
  })).filter(row => row.amount != null);
  if (!rows.length) return res.status(400).json({ error: 'No valid transaction rows were found.' });
  await prisma.transaction.createMany({ data: rows });
  await auditCrud({ action: 'create', table_name: 'finance', item_id: 'csv-import', details: `Imported ${rows.length} transactions`, userId: req.user.id, req });
  res.json({ imported: rows.length });
});

app.get('/api/finance/export', authMiddleware, async (req, res) => {
  const rows = await prisma.transaction.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
  const headers = ['amount', 'type', 'category', 'method', 'date', 'note'];
  const csv = [headers.join(','), ...rows.map(row => headers.map(header => csvCell(row[header])).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="growthtrack-finance.csv"');
  res.send(csv);
});

app.post('/api/finance/sync/bank', authMiddleware, (_req, res) => {
  res.status(501).json({ error: 'Bank sync needs an approved provider connection. CSV import is available now.' });
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
  app.get(`/api/${name}`, authMiddleware, async (req, res) => {
    try {
      const items = await model.findMany({ where: { userId: req.user.id } });
      res.json(name === 'metric_logs' ? items.map(metricToClient) : items);
    } catch (e) { sendInternalError(res, e, `${name} list`); }
  });

  // POST create new
  app.post(`/api/${name}`, authMiddleware, async (req, res) => {
    try {
      const { id, ...rawData } = req.body;
      const data = name === 'metric_logs' ? metricPayload(rawData) : stripProtectedFields(rawData);
      
      // Clean up relations or arrays that might be in the payload
      Object.keys(data).forEach(k => {
        if (typeof data[k] === 'object' && data[k] !== null) {
          data[k] = JSON.stringify(data[k]);
        }
      });
      
      const item = await model.create({
        data: { ...data, userId: req.user.id, id: id || undefined }
      });
      await auditCrud({ action: 'create', table_name: name, item_id: item.id, details: `Created ${name} record`, userId: req.user.id, req });
      res.json(name === 'metric_logs' ? metricToClient(item) : item);
    } catch (e) { sendInternalError(res, e, `${name} create`); }
  });

  // PUT/PATCH update. Both methods use the same ownership and field guards so
  // module clients cannot accidentally bypass persistence or reassign records.
  const updateItem = async (req, res) => {
    try {
      let data = stripProtectedFields(req.body);
      if (name === 'metric_logs') {
        const current = await model.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!current) return res.status(404).json({ error: 'Record not found.' });
        data = metricPayload({ ...parseStoredJson(current?.data, {}), ...req.body });
      }
      Object.keys(data).forEach(k => {
        if (typeof data[k] === 'object' && data[k] !== null) {
          data[k] = JSON.stringify(data[k]);
        }
      });
      
      const item = await model.updateMany({
        where: { id: req.params.id, userId: req.user.id },
        data
      });
      if (!item.count) return res.status(404).json({ error: 'Record not found.' });
      await auditCrud({ action: 'update', table_name: name, item_id: req.params.id, details: { fields: Object.keys(req.body) }, userId: req.user.id, req });
      res.json({ success: true, count: item.count });
    } catch (e) { sendInternalError(res, e, `${name} update`); }
  };
  app.put(`/api/${name}/:id`, authMiddleware, updateItem);
  app.patch(`/api/${name}/:id`, authMiddleware, updateItem);

  // DELETE 
  app.delete(`/api/${name}/:id`, authMiddleware, async (req, res) => {
    try {
      const item = await model.deleteMany({
        where: { id: req.params.id, userId: req.user.id }
      });
      if (!item.count) return res.status(404).json({ error: 'Record not found.' });
      await auditCrud({ action: 'delete', table_name: name, item_id: req.params.id, details: `Deleted ${name} record`, userId: req.user.id, req });
      res.json({ success: true, count: item.count });
    } catch (e) { sendInternalError(res, e, `${name} delete`); }
  });
});

app.get('/api/database/tables', authMiddleware, async (req, res) => {
  const userTables = await Promise.all(collections.map(async ({ name, model }) => {
    const [count, rows] = await Promise.all([
      model.count({ where: { userId: req.user.id } }),
      model.findMany({ where: { userId: req.user.id }, take: 10, orderBy: { createdAt: 'desc' } }),
    ]);
    return { name, count, rows: name === 'metric_logs' ? rows.map(metricToClient) : rows };
  }));
  const [healthProfile, ownerProfile, locations, settings, providers] = await Promise.all([
    prisma.healthProfile.findUnique({ where: { userId: req.user.id } }),
    prisma.ownerProfile.findUnique({ where: { userId: req.user.id } }),
    prisma.locationPoint.findMany({ where: { userId: req.user.id }, take: 10, orderBy: { capturedAt: 'desc' } }),
    prisma.appSetting.findMany({ orderBy: { key: 'asc' } }),
    prisma.integrationProvider.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);
  res.json([
    ...userTables,
    { name: 'health_profiles', count: healthProfile ? 1 : 0, rows: healthProfile ? [{ ...healthProfile, data: parseStoredJson(healthProfile.data, {}) }] : [] },
    { name: 'owner_profiles', count: ownerProfile ? 1 : 0, rows: ownerProfile ? [ownerProfile] : [] },
    { name: 'location_points', count: await prisma.locationPoint.count({ where: { userId: req.user.id } }), rows: locations },
    { name: 'app_settings', count: settings.length, rows: settings.map(row => ({ ...row, value: parseStoredJson(row.value, row.value) })) },
    { name: 'integration_providers', count: providers.length, rows: providers },
  ]);
});

// Nested entities overrides
app.post('/api/workout_sessions/:id/exercises', authMiddleware, async (req, res) => {
  try {
    const session = await prisma.workoutSession.findFirst({ where: { id: req.params.id, userId: req.user.id }, select: { id: true } });
    if (!session) return res.status(404).json({ error: 'Workout session not found.' });
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
  } catch(e) { sendInternalError(res, e, 'Workout exercise create'); }
});

app.get('/api/workout_sessions/:id/exercises', authMiddleware, async (req, res) => {
  try {
    const session = await prisma.workoutSession.findFirst({ where: { id: req.params.id, userId: req.user.id }, select: { id: true } });
    if (!session) return res.status(404).json({ error: 'Workout session not found.' });
    const items = await prisma.workoutExercise.findMany({ where: { sessionId: req.params.id } });
    res.json(items);
  } catch(e) { sendInternalError(res, e, 'Workout exercise list'); }
});

app.post('/api/habit_logs', authMiddleware, async (req, res) => {
  try {
    const data = req.body; 
    const habitId = data.habit_id;
    const date = data.date;
    const habit = await prisma.habit.findFirst({ where: { id: habitId, userId: req.user.id }, select: { id: true } });
    if (!habit) return res.status(404).json({ error: 'Habit not found.' });
    const existing = await prisma.habitLog.findFirst({ where: { habitId, date }});
    if (existing) {
       await prisma.habitLog.delete({ where: { id: existing.id } });
       res.json({ success: true, deleted: true });
    } else {
       const log = await prisma.habitLog.create({ data: { habitId, date } });
       res.json(log);
    }
  } catch(e) { sendInternalError(res, e, 'Habit log create'); }
});

app.get('/api/habit_logs/:habitId', authMiddleware, async (req, res) => {
  try {
    const habit = await prisma.habit.findFirst({ where: { id: req.params.habitId, userId: req.user.id }, select: { id: true } });
    if (!habit) return res.status(404).json({ error: 'Habit not found.' });
    const items = await prisma.habitLog.findMany({ where: { habitId: req.params.habitId } });
    res.json(items);
  } catch(e) { sendInternalError(res, e, 'Habit log list'); }
});

app.listen(PORT, () => {
  logToFile('info', `GrowthTrack server started`, { port: PORT, env: process.env.NODE_ENV || 'development' });
  console.log(`Local Auth Server running on http://localhost:${PORT}`);
});
