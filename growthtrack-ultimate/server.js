import { registerOperationsRoutes } from './server/domains/operations.js';
import { registerIntegrationRoutes } from './server/domains/integrations.js';
import { registerGithubRoutes } from './server/domains/github.js';
import { registerStreamingRoutes } from './server/domains/streaming.js';
import { createServerCloser } from './server/lifecycle.js';
import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
import Stripe from 'stripe';
import { createDatabaseClient } from './server/database.js';
import path from 'path';
import fs from 'fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import { logToFile } from './logger.js';
import { createSecurity } from './server/security.js';
import { createBackupScheduler, createEncryptedSQLiteBackup } from './server/domains/scheduledBackups.js';
import { localDatabaseFile } from './server/domains/sqliteBackup.js';
import BaseController from './server/controllers/BaseController.js';
import { legacyNotesModel } from './server/domains/legacyNotes.js';
import { registerNotesRoutes } from './server/domains/notes.js';
import { collectionToClient } from './server/collectionPayload.js';
import MetricLogController from './server/controllers/MetricLogController.js';
import GoalProgressController from './server/controllers/GoalProgressController.js';
import { enabledIdentityProviders } from './server/identityProviders.js';
import { createEventLogger } from './server/eventLogger.js';
import { BODY_METRIC_RANGES, validateBodyMetric } from './src/lib/bodyMetricContract.js';
import { appleHealthSetupRequired, metricToClient } from './server/domains/providers.js';
import { metricPayload, METRIC_INCLUDE } from './server/domains/metricPayload.js';
import { collectionInclude } from './server/domains/collectionChildren.js';
import { HEALTH_PROFILE_INCLUDE, healthProfileData, registerHealthProfileRoutes } from './server/domains/healthProfile.js';
import { USER_STRUCTURES, prepareUserStructures, saveUserStructures, loadUserStructures } from './server/domains/userStructures.js';
import { PLAN_DOCUMENTS, preparePlanDocuments, loadPlanDocuments } from './server/domains/planDocuments.js';
import { registerFinanceRoutes } from './server/domains/finance.js';
import { registerCustomerAdminRoutes } from './server/domains/customerAdmin.js';
import { registerNativeModuleRoutes } from './server/domains/nativeModules.js';
import { registerFamilyBridge } from './server/domains/familyBridge.js';
import { nativeEntryDestination } from './src/config/nativeEntries.js';
import { registerFileRoutes } from './server/domains/files.js';
import { registerWorkoutRoutes } from './server/domains/workouts.js';
import { saveSocialProfiles } from './server/domains/socialProfiles.js';
import { publicSettingsWhere } from './server/domains/settingsVisibility.js';
import { isCompletedWorkout } from './server/domains/workoutMetadata.js';
import { createPrivateStorage } from './server/domains/privateStorage.js';
import { createEncryptedPrivateStorage } from './server/domains/encryptedPrivateStorage.js';
import { createCapabilitiesHandler } from './server/domains/capabilities.js';
import { registerLocationRoutes } from './server/domains/locations.js';
import { registerFrontend } from './server/frontend.js';
import createAgentsRouter from './server/agents/router.js';
import createNotificationsRouter from './server/notifications/router.js';
import { normalizePortfolioPayload, PORTFOLIO_MAX_BYTES } from './server/domains/portfolio.js';
import { loadServerConfig } from './server/config.js';
import { createJsonErrorHandler } from './server/domains/errors.js';
import { createSyncEngine, registerSyncRoutes, startSyncScheduler } from './server/domains/sync/engine.js';
import { createSealer } from './server/domains/sync/sealer.js';
import { createConnectors } from './server/domains/sync/connectors.js';
import { createRecordServices, legacyWriteRetired, registerRecordRoutes } from './server/domains/records.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);
require('dotenv').config({ path: path.join(__dirname, '.env') });
// Every tunable setting is validated once here; see server/config.js.
const config = loadServerConfig(process.env);
const { prisma, databaseUrl } = await createDatabaseClient(__dirname);
const notesV1Enabled = config.features.notesV1;
if (notesV1Enabled) {
  try {
    await prisma.$queryRawUnsafe('SELECT "revision", "kind", "pinned", "starred", "deletedAt" FROM "Note" WHERE 1=0');
    await prisma.$queryRawUnsafe('SELECT "noteId" FROM "NoteRevision" WHERE 1=0');
    await prisma.$queryRawUnsafe('SELECT "mutationId" FROM "NoteMutation" WHERE 1=0');
    await prisma.$queryRawUnsafe('SELECT "sequence" FROM "NoteChange" WHERE 1=0');
  } catch { throw new Error('GROWTHTRACK_NOTES_V1 requires the reviewed Notes migration. Run npm run migrate:notes to rehearse it first.'); }
}
const notesModel = notesV1Enabled ? prisma.note : legacyNotesModel(prisma, { typedFields: true });
// Calendar events and holdings move from User JSON documents to revisioned rows
// only after `npm run migrate:records -- --apply` and GROWTHTRACK_RECORD_ROWS=1.
const recordRowsEnabled = config.features.recordRows;
if (recordRowsEnabled) {
  try {
    for (const table of ['calendar_events', 'portfolio_holdings', 'record_mutations', 'record_changes']) await prisma.$queryRawUnsafe(`SELECT 1 FROM "${table}" WHERE 1=0`);
  } catch { throw new Error('GROWTHTRACK_RECORD_ROWS requires the reviewed record migration. Run npm run migrate:records to rehearse it first.'); }
}
const recordServices = createRecordServices(prisma, config.records);
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const app = express();
const PORT = config.server.port;
const APP_URL = config.server.appUrl;
const eventLogger = createEventLogger({ prisma, logToFile });
const security = createSecurity({ prisma, logToFile, writeEvent: eventLogger.write, config });
// No backup or key configuration is changed on an existing installation.
const backupSource = config.backup.enabled ? localDatabaseFile(__dirname, { DATABASE_URL: databaseUrl }) : null;
const backupScheduler = createBackupScheduler({
  ...config.backup,
  backup: () => createEncryptedSQLiteBackup({ source: backupSource, directory: path.resolve(__dirname, config.backup.directory), keyHex: config.security.encryptionKey }),
  onError: error => logToFile('error', 'scheduled_backup_failed', { code: /^[A-Z0-9_]+$/.test(error.code || '') ? error.code : 'BACKUP_FAILED' }),
});
async function cleanupExpiredLogs() {
  const cutoff = new Date(Date.now() - config.logs.retentionDays * 24 * 60 * 60 * 1000);
  try {
    await Promise.all([
      prisma.auditLog.deleteMany({ where: { timestamp: { lt: cutoff } } }),
      prisma.sessionLog.deleteMany({ where: { timestamp: { lt: cutoff } } }),
      prisma.loginLog.deleteMany({ where: { timestamp: { lt: cutoff } } }),
    ]);
  } catch (error) { logToFile('warning', 'log_retention_cleanup_failed', { error: String(error?.message || error) }); }
}
let logCleanupTimer;
if (config.logs.cleanupEnabled) {
  void cleanupExpiredLogs();
  logCleanupTimer = setInterval(cleanupExpiredLogs, config.logs.cleanupIntervalMs);
  logCleanupTimer.unref?.();
}
const authMiddleware = security.authenticate;
app.disable('x-powered-by');
app.set('trust proxy', config.server.trustProxy ? 1 : false);
app.use(security.headers);
app.use((req, res, next) => {
  const destination = req.method === 'GET' ? nativeEntryDestination(req.path) : null;
  if (destination) return res.redirect(302, destination);
  next();
});
app.use((req, res, next) => {
  req.requestId = String(req.headers['x-request-id'] || crypto.randomUUID());
  res.setHeader('X-Request-Id', req.requestId);
  next();
});
app.use(cors(security.corsOptions));
app.use('/api', security.apiRateLimit);
app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }));
app.use('/api/integrations/streaming/:provider/webhook/:owner', express.raw({ type: 'application/json', limit: '64kb' }));
app.use(express.json({ limit: config.server.jsonBodyLimit }));
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

// Root path is reserved for the frontend (dist/index.html)

registerOperationsRoutes(app, { prisma, config, backupScheduler, authMiddleware, root: __dirname, version: require('./package.json').version, databaseUrl });
app.get('/api/auth/providers', (req, res) => res.json({ providers: enabledIdentityProviders() }));
app.get('/api/capabilities', authMiddleware, createCapabilitiesHandler({
  prisma, version: require('./package.json').version,
  checkoutAvailable: () => Boolean(stripe && process.env.STRIPE_PRICE_ID),
  notesV1Enabled,
  recordRowsEnabled,
}));
app.use('/api/agents', authMiddleware, createAgentsRouter());
app.use('/api/notifications', authMiddleware, createNotificationsRouter({ prisma, calendarRecords: recordRowsEnabled ? recordServices.calendar : null }));

registerIntegrationRoutes(app, { config, authMiddleware, logToFile });
registerStreamingRoutes(app, authMiddleware, { prisma, config });
registerGithubRoutes(app, authMiddleware, { prisma, config, audit: event => eventLogger.write({ source: 'github', ...event }) });

// Keep CRUD auditing at the API boundary so every module is covered, including
// modules whose client-side store does not import the logger directly.
async function auditCrud({ action, table_name, item_id, details, userId, req }) {
  req.auditWritten = true;
  await eventLogger.write({ category: 'audit', source: 'crud-boundary', action, table_name, item_id, details, user_id: userId, metadata: { privacy: 'redacted' } }, { requestId: req.requestId });
}

function sendInternalError(res, error, context) {
  if ([400, 413].includes(error.status)) return res.status(error.status).json({ error: error.message, code: error.code });
  console.error(`[${context}]`, error);
  return res.status(500).json({ error: 'Internal server error.' });
}

function categoryWhere(query = {}, kind, userId) {
  const where = userId ? { user_id: userId } : {};
  if (query.action) where.action = String(query.action);
  if (query.source) where.source = String(query.source);
  if (query.from || query.to) where.timestamp = { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) };
  
  if (query.category && query.category !== 'all' && kind === 'audit' && !['auth', 'session'].includes(query.category)) {
    where.category = String(query.category);
  }

  if (kind === 'audit') { if (query.severity) where.severity = String(query.severity); if (query.q) where.OR = [{ action: { contains: String(query.q) } }, { details: { contains: String(query.q) } }, { table_name: { contains: String(query.q) } }]; }
  if (kind === 'auth' && query.q) where.OR = [{ action: { contains: String(query.q) } }, { email: { contains: String(query.q) } }, { failure_reason: { contains: String(query.q) } }];
  if (kind === 'session' && query.q) where.details = { contains: String(query.q) };
  return where;
}
function unified(row, category) {
  return { ...row, category: row.category || category, source: row.source || 'ultimate-api', user_id: row.user_id || null, user_name: row.actor_name || null, user_email: row.actor_email || row.email || null, request_id: row.request_id || null, actor_ip: row.actor_ip || row.ip_address || null, timestamp: row.timestamp || row.createdAt };
}
async function readUnifiedLogs(req, fixedCategory) {
  const page = Math.max(1, Number(req.query.page || 1)); const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50))); const query = req.query;
  const targetCategory = fixedCategory || (query.category && query.category !== 'all' ? String(query.category) : null);
  const categories = targetCategory ? [targetCategory] : ['auth', 'session', 'audit', 'crud', 'system', 'request'];
  const [auth, sessions, audits] = await Promise.all([
    categories.includes('auth') ? prisma.loginLog.findMany({ where: categoryWhere(query, 'auth', req.user.id), orderBy: { timestamp: 'desc' }, take: 500 }) : [],
    categories.includes('session') ? prisma.sessionLog.findMany({ where: categoryWhere(query, 'session', req.user.id), orderBy: { timestamp: 'desc' }, take: 500 }) : [],
    categories.some(c => !['auth', 'session'].includes(c)) ? prisma.auditLog.findMany({ where: categoryWhere(query, 'audit', req.user.id), orderBy: { timestamp: 'desc' }, take: 500 }) : [],
  ]);
  const all = [...auth.map(x => unified(x, 'auth')), ...sessions.map(x => unified(x, 'session')), ...audits.map(x => unified(x, x.category || 'audit'))].filter(x => !targetCategory || x.category === targetCategory).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  const total = all.length; return { logs: all.slice((page - 1) * limit, page * limit), total, page, limit, diagnostics: eventLogger.diagnostics };
}
app.get('/api/logs', authMiddleware, async (req, res) => { try { res.json(await readUnifiedLogs(req)); } catch (err) { console.error('[Logs Error]', err); res.status(500).json({ error: 'Unable to read logs.', requestId: req.requestId }); } });
app.get('/api/logs/summary', authMiddleware, async (req, res) => { try { const [audit, session, auth] = await Promise.all([prisma.auditLog.count({ where: { user_id: req.user.id } }), prisma.sessionLog.count({ where: { user_id: req.user.id } }), prisma.loginLog.count({ where: { user_id: req.user.id } })]); res.json({ counts: { audit, session, auth, total: audit + session + auth }, diagnostics: eventLogger.diagnostics }); } catch { res.status(500).json({ error: 'Unable to read log summary.' }); } });
app.get('/api/logs/diagnostics', authMiddleware, async (req, res) => {
  try {
    const [audit, session, auth] = await Promise.all([prisma.auditLog.count({ where: { user_id: req.user.id } }), prisma.sessionLog.count({ where: { user_id: req.user.id } }), prisma.loginLog.count({ where: { user_id: req.user.id } })]);
    res.json({ status: 'healthy', database: { status: 'connected', writable: true }, counts: { audit, session, auth, total: audit + session + auth }, diagnostics: { ...eventLogger.diagnostics, requestId: req.requestId } });
  } catch { res.status(503).json({ status: 'degraded', database: { status: 'unavailable', writable: false }, error: 'Logging database unavailable.', requestId: req.requestId }); }
});
app.post('/api/logs/diagnostics/self-test', authMiddleware, async (req, res) => {
  const id = await eventLogger.write({ category: 'system', source: 'logging-diagnostics', action: 'logging_self_test', severity: 'info', user_id: req.user.id, user_name: req.user.fullName, user_email: req.user.email, details: 'Authenticated logging self-test' }, req);
  if (!id) return res.status(503).json({ status: 'degraded', error: 'Logging database unavailable.', requestId: req.requestId });
  res.json({ status: 'healthy', eventId: id, requestId: req.requestId });
});
for (const [pathName, category] of [['sessions', 'session'], ['auth', 'auth'], ['audit', 'audit']]) app.get(`/api/logs/${pathName}`, authMiddleware, async (req, res) => { try { res.json(await readUnifiedLogs(req, category)); } catch { res.status(500).json({ error: 'Unable to read logs.' }); } });

app.post('/api/logs', authMiddleware, async (req, res) => {
  try {
    const { action, table_name, item_id, details, category, severity } = req.body;
    
    await eventLogger.write({ action, table_name, item_id, details, category: category || 'system', user_id: req.user.id, user_name: req.user.fullName, user_email: req.user.email, severity: severity || 'info' }, req);
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

    await eventLogger.write({ category: 'session', action, details, user_id: req.user.id, user_name: req.user.fullName, user_email: req.user.email }, req);
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

// Legacy exchange exposed provider credentials to the browser. Projects now
// validates and seals credentials server-side without returning the secret.
app.post('/auth/github/exchange', authMiddleware, (_req, res) => {
  res.status(410).json({ code: 'GITHUB_LEGACY_FLOW_RETIRED', error: 'Reconnect from Projects > GitHub connection. Provider tokens are no longer returned to the browser.' });
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
  } catch {
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
  } catch {
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

const ownerFieldMap = {
  avatar: 'avatar', phone: 'phone', bio: 'bio', dob: 'dateOfBirth', gender: 'gender', bloodType: 'bloodType',
  location_name: 'locationName', country: 'country', state: 'state', city: 'city', nationality: 'nationality', language: 'language', timezone: 'timezone',
  occupation: 'occupation', education: 'education', maritalStatus: 'maritalStatus', incomeBracket: 'incomeBracket', livingSituation: 'livingSituation',
  dietaryPreference: 'dietaryPreference', emergencyContactName: 'emergencyContactName', emergencyContactPhone: 'emergencyContactPhone',
  medicalConditions: 'medicalConditions', allergies: 'allergies', restingHeartRate: 'restingHeartRate', activityLevel: 'activityLevel',
  maintenanceCalories: 'maintenanceCalories', trainingStyle: 'trainingStyle', baseCurrency: 'baseCurrency', isdCode: 'isdCode', netWorth: 'netWorth',
  primaryBank: 'primaryBank', passportNationality: 'passportNationality', dateFormat: 'dateFormat', numberFormat: 'numberFormat', measurementSystem: 'measurementSystem',
  textDirection: 'textDirection', motherLanguage: 'motherLanguage', motherLanguageProficiency: 'motherLanguageProficiency', privacyLevel: 'privacyLevel',
  emailNotifications: 'emailNotifications', smsNotifications: 'smsNotifications', notifications: 'notifications', primaryGoal: 'primaryGoal',
};
const ownerNumberFields = new Set(['incomeBracket', 'restingHeartRate', 'maintenanceCalories', 'netWorth']);
const ownerBooleanFields = new Set(['emailNotifications', 'smsNotifications', 'notifications']);

const bodyFieldMap = {
  height: 'heightCm', weight: 'weightKg', bodyFat: 'bodyFatPct', leanMass: 'leanMassKg', skeletalMuscle: 'skeletalMuscleKg',
  bodyWater: 'bodyWaterPct', boneMass: 'boneMassKg', visceralFat: 'visceralFatLevel', chest: 'chestCm', waist: 'waistCm', shoulders: 'shouldersCm',
  arms: 'armsCm', forearm: 'forearmsCm', hips: 'hipsCm', thighs: 'thighsCm', calves: 'calvesCm', neck: 'neckCm', glutes: 'glutesCm',
  ankle: 'ankleCm', wrist: 'wristCm', elbow: 'elbowCm', underbust: 'underbustCm', highHip: 'highHipCm', chestDepth: 'chestDepthCm',
  shoulderBreadth: 'shoulderBreadthCm', bideltoidBreadth: 'bideltoidBreadthCm', pelvicBreadth: 'pelvicBreadthCm', torsoLength: 'torsoLengthCm',
  sittingHeight: 'sittingHeightCm', upperArm: 'upperArmCm', lowerArm: 'lowerArmCm', handLength: 'handLengthCm', legLength: 'legLengthCm',
  upperLegLength: 'upperLegLengthCm', lowerLegLength: 'lowerLegLengthCm', inseam: 'inseamCm', neckLength: 'neckLengthCm', footLength: 'footLengthCm', headCirc: 'headCircCm',
  leftShoulder: 'leftShoulderCm', rightShoulder: 'rightShoulderCm', leftUpperArm: 'leftUpperArmCircumferenceCm', rightUpperArm: 'rightUpperArmCircumferenceCm',
  leftForearm: 'leftForearmCm', rightForearm: 'rightForearmCm', leftWrist: 'leftWristCm', rightWrist: 'rightWristCm', leftThigh: 'leftThighCm',
  rightThigh: 'rightThighCm', leftCalf: 'leftCalfCm', rightCalf: 'rightCalfCm', leftHip: 'leftHipCm', rightHip: 'rightHipCm',
  headTiltAngle: 'headTiltAngle', pelvicTilt: 'pelvicTilt', shoulderRounding: 'shoulderRounding', shoulderTilt: 'shoulderTiltDeg',
  spineCurvature: 'spineCurvatureDeg', hipRotation: 'hipRotationDeg', kneeAlignment: 'kneeAlignmentDeg', leftKneeAngle: 'leftKneeAngleDeg',
  rightKneeAngle: 'rightKneeAngleDeg', leftFootRotation: 'leftFootRotationDeg', rightFootRotation: 'rightFootRotationDeg', faceWidth: 'faceWidthCm',
  faceHeight: 'faceHeightCm', eyeSpacing: 'eyeSpacingCm', earLength: 'earLengthCm', earWidth: 'earWidthCm', noseLength: 'noseLengthCm', noseWidth: 'noseWidthCm',
  brow_depth: 'browDepth', nose_bridge_width: 'noseBridgeWidth', nose_tip_size: 'noseTipSize', ear_prominence: 'earProminence', jaw_width: 'jawWidth',
  chin_projection: 'chinProjection', lip_fullness: 'lipFullness', eye_size: 'eyeSize',
  biologicalSex: 'biologicalSex', modelPreset: 'modelPreset', skinTone: 'skinTone', skinFitzpatrickIndex: 'skinFitzpatrickIndex',
  skinUndertone: 'skinUndertone', skinColorHex: 'skinColorHex', skinTextureVariant: 'skinTextureVariant', skinFreckleDensity: 'skinFreckleDensity', skinFeatureMap: 'skinFeatureMap', hairStyle: 'hairStyle', hairColorHex: 'hairColorHex',
  hairTexture: 'hairTexture', hairlineStyle: 'hairlineStyle', hairPart: 'hairPart', hairDensity: 'hairDensity', hairLength: 'hairLengthCm', facialHairStyle: 'facialHairStyle', facialHairColorHex: 'facialHairColorHex', facialHairDensity: 'facialHairDensity',
  eyebrowStyle: 'eyebrowStyle', eyebrowColorHex: 'eyebrowColorHex', eyeColorHex: 'eyeColorHex', eyePattern: 'eyePattern', eyelidShape: 'eyelidShape', eyelashStyle: 'eyelashStyle', scleraColorHex: 'scleraColorHex', irisLimbalRing: 'irisLimbalRing', lipColorHex: 'lipColorHex',
  bodyHairPattern: 'bodyHairPattern', bodyHairColorHex: 'bodyHairColorHex', bodyHairTexture: 'bodyHairTexture', bodyHairDensity: 'bodyHairDensity', nailColorHex: 'nailColorHex', nailShape: 'nailShape', nailLengthMm: 'nailLengthMm', avatarAsset: 'avatarAsset', tattooAsset: 'tattooAsset',
  anatomyPreset: 'anatomyPreset', anatomyVisibility: 'anatomyVisibility', anatomyRevealConsent: 'anatomyRevealConsent', morphOverrides: 'morphOverrides',
  facialMorphs: 'facialMorphs', bodyProportions: 'bodyProportions', skinTones: 'skinTones', skinDetails: 'skinDetails', hairProperties: 'hairProperties', eyeProperties: 'eyeProperties',
  targetWeight: 'targetWeightKg', targetBodyFat: 'targetBodyFatPct', targetLeanMass: 'targetLeanMassKg', targetSkeletalMuscle: 'targetSkeletalMuscleKg',
  targetChest: 'targetChestCm', targetWaist: 'targetWaistCm', targetShoulders: 'targetShouldersCm', targetArms: 'targetArmsCm', targetThighs: 'targetThighsCm',
  targetHips: 'targetHipsCm', targetGlutes: 'targetGlutesCm', targetCalves: 'targetCalvesCm',
};
const bodyStringFields = new Set([
  'biologicalSex', 'modelPreset', 'skinTone', 'skinUndertone', 'skinColorHex', 'skinTextureVariant', 'skinFeatureMap', 'hairStyle', 'hairColorHex',
  'hairTexture', 'hairlineStyle', 'hairPart', 'facialHairStyle', 'facialHairColorHex', 'eyebrowStyle', 'eyebrowColorHex', 'eyeColorHex', 'eyePattern', 'eyelidShape', 'eyelashStyle', 'scleraColorHex', 'lipColorHex',
  'bodyHairPattern', 'bodyHairColorHex', 'bodyHairTexture', 'nailColorHex', 'nailShape', 'avatarAsset', 'tattooAsset', 'anatomyPreset', 'anatomyVisibility', 'morphOverrides', 'facialMorphs', 'bodyProportions',
  'skinTones', 'skinDetails', 'hairProperties', 'eyeProperties',
].map(key => bodyFieldMap[key]));
const bodyBooleanFields = new Set(['anatomyRevealConsent', 'irisLimbalRing'].map(key => bodyFieldMap[key]));
const bodyIntegerFields = new Set(['skinFitzpatrickIndex'].map(key => bodyFieldMap[key]));
const bodyNumberFields = new Set(Object.values(bodyFieldMap).filter(field => !bodyStringFields.has(field) && !bodyBooleanFields.has(field)));
const bodyProfileFields = new Set(Object.values(bodyFieldMap));
const appearanceColorFields = new Set(['skinColorHex', 'hairColorHex', 'facialHairColorHex', 'eyebrowColorHex', 'eyeColorHex', 'scleraColorHex', 'lipColorHex', 'bodyHairColorHex', 'nailColorHex'].map(key => bodyFieldMap[key]));
const bodyJsonFields = new Set(['morphOverrides', 'facialMorphs', 'bodyProportions', 'skinTones', 'skinDetails', 'hairProperties', 'eyeProperties'].map(key => bodyFieldMap[key]));
const bodyMetricKeyByDatabaseField = new Map(Object.entries(bodyFieldMap).flatMap(([clientField, databaseField]) => {
  const targetCandidate = clientField.startsWith('target')
    ? `${clientField.slice(6, 7).toLowerCase()}${clientField.slice(7)}`
    : null;
  const metricKey = BODY_METRIC_RANGES[clientField] ? clientField : BODY_METRIC_RANGES[targetCandidate] ? targetCandidate : null;
  return metricKey ? [[databaseField, metricKey]] : [];
}));

const invalidBodyMeasurements = (source, { databaseFields = false } = {}) => Object.entries(source || {}).flatMap(([field, value]) => {
  const targetCandidate = field.startsWith('target')
    ? `${field.slice(6, 7).toLowerCase()}${field.slice(7)}`
    : null;
  const metricKey = databaseFields
    ? bodyMetricKeyByDatabaseField.get(field)
    : BODY_METRIC_RANGES[field] ? field : BODY_METRIC_RANGES[targetCandidate] ? targetCandidate : null;
  if (!metricKey || value === '' || value == null) return [];
  const result = validateBodyMetric(metricKey, value, { allowEmpty: false });
  return result.valid ? [] : [{ field, metric: metricKey, value, message: result.reason }];
});

const normalizeBodyField = (databaseField, value) => {
  if (bodyNumberFields.has(databaseField)) {
    const parsed = Number(value);
    if (value === '' || value == null || !Number.isFinite(parsed)) return null;
    return bodyIntegerFields.has(databaseField) ? Math.round(parsed) : parsed;
  }
  if (bodyBooleanFields.has(databaseField)) return value === true || value === 1 || value === '1' || value === 'true';
  if (appearanceColorFields.has(databaseField)) {
    const color = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : null;
  }
  if (bodyStringFields.has(databaseField)) {
    if (value === '' || value == null) return null;
    if (bodyJsonFields.has(databaseField) && typeof value === 'object') return JSON.stringify(value);
    return String(value).trim().slice(0, 500) || null;
  }
  return undefined;
};

const normalizeBodyProfilePayload = source => Object.fromEntries(
  [...bodyProfileFields].filter(field => source?.[field] !== undefined).map(field => [field, normalizeBodyField(field, source[field])]),
);

const mapClientFields = (source, mapping, numberFields = new Set(), booleanFields = new Set()) => Object.fromEntries(
  Object.entries(mapping).filter(([clientField]) => source[clientField] !== undefined).map(([clientField, databaseField]) => {
    const value = source[clientField];
    if (bodyProfileFields.has(databaseField)) return [databaseField, normalizeBodyField(databaseField, value)];
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
    prisma.appSetting.findMany({ where: publicSettingsWhere(), orderBy: { key: 'asc' }, select: { key: true, value: true, valueType: true, category: true } }),
    prisma.integrationProvider.findMany({ where: { enabled: true }, select: { providerKey: true, displayName: true, category: true, authType: true, enabled: true, icon: true, documentationUrl: true, sortOrder: true }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] }),
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
  const editableKeys = new Set(['navigation', 'appCatalog', 'portfolioUrl', 'aiAgent', 'weatherUrl', 'newsSources']);
  if (!editableKeys.has(key)) return res.status(403).json({ error: 'This setting cannot be changed from the application.' });
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

registerHealthProfileRoutes(app, { prisma, authMiddleware, auditCrud, sendInternalError });

app.post('/api/profile/avatar', authMiddleware, async (req, res) => {
  const avatar = req.body?.avatar;
  if (typeof avatar !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/i.test(avatar)) return res.status(400).json({ error: 'Use a PNG, JPEG, or WebP image.' });
  if (Buffer.byteLength(avatar, 'utf8') > 7 * 1024 * 1024) return res.status(413).json({ error: 'Profile image must be 5 MB or smaller.' });
  const profile = await prisma.ownerProfile.upsert({ where: { userId: req.user.id }, update: { avatar }, create: { userId: req.user.id, avatar } });
  await auditCrud({ action: 'update', table_name: 'owner_profiles', item_id: profile.id, details: 'Updated profile picture', userId: req.user.id, req });
  res.json({ avatar });
});

registerLocationRoutes(app, authMiddleware, { prisma, auditCrud });

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
  const normalized = tables.map((table) => {
    const id = String(table.id || crypto.randomUUID());
    const fields = Array.isArray(table.fields) ? table.fields.slice(0, 100) : [];
    const rows = Array.isArray(table.rows) ? table.rows.slice(0, 10_000) : [];
    return { id, data: { name: String(table.name || 'Untitled').trim().slice(0, 100) || 'Untitled', schema: JSON.stringify(fields), rows: JSON.stringify(rows) } };
  });
  const saved = await prisma.$transaction(async (tx) => {
    await tx.customTable.deleteMany({ where: { userId: req.user.id, ...(incomingIds.length ? { id: { notIn: incomingIds } } : {}) } });
    return Promise.all(normalized.map(({ id, data }) => tx.customTable.upsert({ where: { id }, update: data, create: { id, userId: req.user.id, ...data } })));
  });
  await auditCrud({ action: 'update', table_name: 'custom_tables', item_id: 'bulk', details: `Saved ${saved.length} custom tables`, userId: req.user.id, req });
  res.json({ success: true, count: saved.length });
});

app.get('/api/preferences', authMiddleware, async (req, res) => {
  const preference = await prisma.userPreference.upsert({ where: { userId: req.user.id }, update: {}, create: { userId: req.user.id, theme: 'system', palette: 'forest' } });
  res.json({ ...preference, navigationOrder: parseStoredJson(preference.navigationOrder, []), navigationTabOrder: parseStoredJson(preference.navigationTabOrder, {}) });
});

app.put('/api/preferences', authMiddleware, async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ error: 'Preferences must be an object.' });
  if (req.body.theme !== undefined && !['light', 'dark', 'amoled', 'system'].includes(req.body.theme)) return res.status(400).json({ error: 'Theme must be light, dark, amoled, or system.' });
  const allowed = ['theme', 'palette', 'sidebarCollapsed', 'onboardingComplete', 'reducedMotion'];
  const data = Object.fromEntries(allowed.filter(key => req.body[key] !== undefined).map(key => [key, req.body[key]]));
  if (req.body.density !== undefined) data.density = req.body.density === 'compact' ? 'compact' : 'comfortable';
  if (req.body.navigationOrder !== undefined) data.navigationOrder = JSON.stringify(req.body.navigationOrder);
  if (req.body.navigationTabOrder !== undefined) data.navigationTabOrder = JSON.stringify(req.body.navigationTabOrder);
  const preference = await prisma.userPreference.upsert({ where: { userId: req.user.id }, update: data, create: { userId: req.user.id, theme: 'system', palette: 'forest', ...data } });
  res.json({ ...preference, navigationOrder: parseStoredJson(preference.navigationOrder, []), navigationTabOrder: parseStoredJson(preference.navigationTabOrder, {}) });
});

app.get('/api/body-profile', authMiddleware, async (req, res) => {
  const profile = await prisma.bodyProfile.findUnique({ where: { userId: req.user.id } });
  res.json(profile || {});
});

app.put('/api/body-profile', authMiddleware, async (req, res) => {
  const invalidMeasurements = invalidBodyMeasurements(req.body, { databaseFields: true });
  if (invalidMeasurements.length) {
    return res.status(400).json({ error: 'One or more body measurements are outside the supported range.', fields: invalidMeasurements });
  }
  const data = normalizeBodyProfilePayload(req.body);
  const existing = await prisma.bodyProfile.findUnique({ where: { userId: req.user.id }, select: { id: true } });
  const profile = await prisma.bodyProfile.upsert({ where: { userId: req.user.id }, update: data, create: { userId: req.user.id, ...data } });
  await auditCrud({ action: existing ? 'update' : 'create', table_name: 'body_profiles', item_id: profile.id, details: { fields: Object.keys(data) }, userId: req.user.id, req });
  res.json(profile);
});

app.get('/api/social-profiles', authMiddleware, async (req, res) => {
  res.json(await prisma.socialProfile.findMany({ where: { userId: req.user.id }, orderBy: { sortOrder: 'asc' } }));
});

app.put('/api/social-profiles', authMiddleware, async (req, res) => {
  try {
    const result = await saveSocialProfiles(prisma, req.user.id, req.body);
    await auditCrud({ action: 'update', table_name: 'social_profiles', item_id: 'manual-profiles', details: { fields: ['profileUrl', 'followers', 'avgLikes', 'avgViews'], count: result.length }, userId: req.user.id, req }).catch(() => {});
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message, code: error.code });
    if (error.code === 'P2002') return res.status(409).json({ error: 'A social profile changed on another device. Refresh before saving.', code: 'SOCIAL_PROFILE_CONFLICT' });
    return sendInternalError(res, error, 'social-profiles');
  }
});

app.get('/api/state', authMiddleware, async (req, res) => {
  const [user, ownerProfile, preference, bodyProfile, healthProfile, socialProfiles, tasks, finance, budgets, metric_logs, nutrition_logs, workout_sessions, shopping, timesheet, entertainment, notes, goals, sleep_logs, documents, habits, subscriptions, moodLogs, vitalsLogs, medications, customTables, configRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.user.id } }),
    prisma.ownerProfile.findUnique({ where: { userId: req.user.id } }),
    prisma.userPreference.findUnique({ where: { userId: req.user.id } }),
    prisma.bodyProfile.findUnique({ where: { userId: req.user.id } }),
    prisma.healthProfile.findUnique({ where: { userId: req.user.id }, include: HEALTH_PROFILE_INCLUDE }),
    prisma.socialProfile.findMany({ where: { userId: req.user.id }, orderBy: { sortOrder: 'asc' } }),
    prisma.task.findMany({ where: { userId: req.user.id }, include: collectionInclude('tasks') }), prisma.transaction.findMany({ where: { userId: req.user.id } }), prisma.budget.findMany({ where: { userId: req.user.id } }), prisma.metricLog.findMany({ include: METRIC_INCLUDE, where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } }), prisma.nutritionLog.findMany({ where: { userId: req.user.id } }), prisma.workoutSession.findMany({ where: { userId: req.user.id }, include: { exercises: true } }), prisma.shoppingItem.findMany({ where: { userId: req.user.id }, include: collectionInclude('shopping') }), prisma.timesheetSession.findMany({ where: { userId: req.user.id } }), prisma.entertainmentMedia.findMany({ where: { userId: req.user.id, OR: [{ progress: null }, { progress: { not: 'streaming-watch-event-v1' } }] } }), notesModel.findMany({ where: { userId: req.user.id, ...(notesV1Enabled ? { deletedAt: null } : {}) } }), prisma.goal.findMany({ where: { userId: req.user.id }, include: collectionInclude('goals') }), prisma.sleepLog.findMany({ where: { userId: req.user.id } }), prisma.document.findMany({ where: { userId: req.user.id } }), prisma.habit.findMany({ where: { userId: req.user.id }, include: collectionInclude('habits') }), prisma.subscriptionItem.findMany({ where: { userId: req.user.id } }), prisma.moodLog.findMany({ where: { userId: req.user.id } }), prisma.vitalsLog.findMany({ where: { userId: req.user.id } }), prisma.medication.findMany({ where: { userId: req.user.id } }), prisma.customTable.findMany({ where: { userId: req.user.id } }), prisma.appSetting.findMany({ where: publicSettingsWhere() }),
  ]);
  const [rowEvents, rowHoldings] = recordRowsEnabled
    ? await Promise.all([recordServices.calendar.listAll(req.user.id), recordServices.holdings.listAll(req.user.id)]) : [null, null];
  const structuredUser = await loadUserStructures(prisma, req.user.id, user);
  const structuredPlans = await loadPlanDocuments(prisma, req.user.id, user);
  const profileBaseline = metric_logs.find(row => row.source === 'profile' && row.metric === 'profile_baseline');
  const githubProfile = socialProfiles.find(profile => String(profile.provider || '').toLowerCase() === 'github');
  res.json({
    // Tells clients to write calendar events and holdings through /api/v1.
    recordRows: recordRowsEnabled,
    user: {
      id: user.id, email: user.email, name: user.fullName, fullName: user.fullName,
      ...mapDatabaseFields(ownerProfile, ownerFieldMap),
      ...Object.fromEntries(Object.entries(metricToClient(profileBaseline) || {}).filter(([key]) => key in bodyFieldMap)),
      // The normalized tables are authoritative; the baseline log remains a
      // compatibility snapshot and must never overwrite the latest profile.
      ...mapDatabaseFields(bodyProfile, bodyFieldMap),
      socialLinks: socialProfiles.map(profile => ({ id: profile.id, platform: profile.provider, url: profile.profileUrl || '' })),
      // Keep the public GitHub login available to older clients while the
      // canonical value remains the SocialProfile row above.
      githubUsername: githubProfile?.profileUrl || '',
      manualProjects: parseStoredJson(user.manualProjects, []),
      repoNotes: parseStoredJson(user.repoNotes, {}),
      trainingPlan: parseStoredJson(user.trainingPlan), nutritionStrategy: parseStoredJson(user.nutritionStrategy), lifestyleTips: parseStoredJson(user.lifestyleTips, []),
      medicalData: parseStoredJson(user.medicalData), physiqueTargets: parseStoredJson(user.physiqueTargets), assessmentQA: parseStoredJson(user.assessmentQA, []),
      skills: parseStoredJson(user.skills, []), calendar_events: rowEvents ?? parseStoredJson(user.calendarEvents, []), wellnessData: parseStoredJson(user.wellnessData), healthExtras: parseStoredJson(user.healthExtras), portfolio: rowHoldings ?? parseStoredJson(user.portfolio, []),
      ...structuredUser,
      ...structuredPlans,
    },
    preference: preference ? { ...preference, navigationOrder: parseStoredJson(preference.navigationOrder, []), navigationTabOrder: parseStoredJson(preference.navigationTabOrder, {}) } : null,
    bodyProfile, healthProfile: healthProfileData(healthProfile), socialProfiles, finance, budgets, metric_logs: metric_logs.map(metricToClient), workout_sessions: workout_sessions.map(row => collectionToClient('workout_sessions', row)),
    ...Object.fromEntries(Object.entries({ tasks, nutrition_logs, shopping, timesheet, entertainment, notes, goals, sleep_logs, documents, habits, subscriptions }).map(([name, rows]) => [name, rows.map(row => collectionToClient(name, row))])),
    moodLogs: moodLogs.map(row => collectionToClient('mood_logs', row)),
    vitalsLogs: vitalsLogs.map(row => collectionToClient('vitals_logs', row)),
    medications: medications.map(row => collectionToClient('medications', row)),
    databases: customTables.map(table => ({ ...table, fields: parseStoredJson(table.schema, []), rows: parseStoredJson(table.rows, []) })),
    config: Object.fromEntries(configRows.map(row => [row.key, parseStoredJson(row.value, row.value)])),
  });
});


// Update user singletons
app.post('/api/user', authMiddleware, async (req, res) => {
  try {
    const data = { ...req.body };
    // Profile saves send the whole cached user; after migration its copies of
    // these documents are stale and must never overwrite the rows.
    if (recordRowsEnabled) { delete data.portfolio; delete data.calendarEvents; delete data.calendar_events; }
    const invalidMeasurements = invalidBodyMeasurements(data);
    if (invalidMeasurements.length) {
      return res.status(400).json({ error: 'One or more body measurements are outside the supported range.', fields: invalidMeasurements });
    }
    const updateData = {};
    const structured = prepareUserStructures(data);
    const previousUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    const plans = preparePlanDocuments(data, await loadPlanDocuments(prisma, req.user.id, previousUser));
    const singletonFields = ['trainingPlan', 'nutritionStrategy', 'lifestyleTips', 'medicalData', 'physiqueTargets', 'assessmentQA', 'skills', 'calendarEvents', 'wellnessData', 'healthExtras', 'manualProjects', 'repoNotes', 'portfolio'];

    if (data.portfolio !== undefined) {
      if (!Array.isArray(data.portfolio)) return res.status(400).json({ error: 'Portfolio must be an array.' });
      if (jsonSize(data.portfolio) > PORTFOLIO_MAX_BYTES) return res.status(413).json({ error: 'Portfolio is too large.' });
      const portfolio = normalizePortfolioPayload(data.portfolio);
      if (jsonSize(portfolio) > PORTFOLIO_MAX_BYTES) return res.status(413).json({ error: 'Portfolio is too large.' });
      updateData.portfolio = JSON.stringify(portfolio);
    }

    singletonFields.filter(field => field !== 'portfolio' && !USER_STRUCTURES[field] && !PLAN_DOCUMENTS[field]).forEach(field => {
      if (data[field] !== undefined) {
        const value = data[field];
        updateData[field] = typeof value === 'object' ? JSON.stringify(value) : value;
      }
    });

    if (Object.keys(updateData).length || Object.keys(structured).length || Object.keys(plans).length) await saveUserStructures(prisma, req.user.id, structured, updateData, plans);

    const ownerData = mapClientFields(data, ownerFieldMap, ownerNumberFields, ownerBooleanFields);
    if (Object.keys(ownerData).length) {
      await prisma.ownerProfile.upsert({ where: { userId: req.user.id }, update: ownerData, create: { userId: req.user.id, ...ownerData } });
    }

    const bodyProfileData = mapClientFields(data, bodyFieldMap, bodyNumberFields, bodyBooleanFields);
    if (Object.keys(bodyProfileData).length) {
      await prisma.bodyProfile.upsert({ where: { userId: req.user.id }, update: bodyProfileData, create: { userId: req.user.id, ...bodyProfileData } });
    }

    const bodyClientData = Object.fromEntries(Object.keys(bodyFieldMap).filter(key => data[key] !== undefined).map(key => [key, data[key]]));
    if (Object.keys(bodyClientData).length) {
      const existingBaseline = await prisma.metricLog.findFirst({ include: METRIC_INCLUDE, where: { userId: req.user.id, source: 'profile', metric: 'profile_baseline' }, orderBy: { createdAt: 'desc' } });
      const payload = metricPayload({ ...bodyClientData, date: new Date().toISOString().slice(0, 10), metric: 'profile_baseline', source: 'profile' }, existingBaseline);
      if (existingBaseline) await prisma.metricLog.update({ where: { id: existingBaseline.id }, data: payload });
      else await prisma.metricLog.create({ data: { ...payload, userId: req.user.id }, include: METRIC_INCLUDE });
    }

    if (Array.isArray(data.socialLinks)) {
      await prisma.socialProfile.deleteMany({ where: { userId: req.user.id } });
      const seenProviders = new Set();
      const links = data.socialLinks.reduce((result, link) => {
        const provider = String(link?.platform || '').trim();
        const providerKey = provider.toLowerCase();
        if (!provider || seenProviders.has(providerKey)) return result;
        seenProviders.add(providerKey);
        result.push({
          userId: req.user.id,
          provider,
          profileUrl: String(link.url || '').trim(),
          sortOrder: result.length,
        });
        return result;
      }, []);
      if (links.length) await prisma.socialProfile.createMany({ data: links });
    }

    res.json({ success: true });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message, code: error.code });
    sendInternalError(res, error, 'User profile update');
  }
});

// Preserve singleton API shapes while structured entities use typed rows.
async function persistUserSingleton(userId, field, value) {
  if (PLAN_DOCUMENTS[field]) {
    const previous = await prisma.user.findUnique({ where: { id: userId } });
    const current = await loadPlanDocuments(prisma, userId, previous);
    const prepared = preparePlanDocuments({ [field]: value }, current);
    const user = await saveUserStructures(prisma, userId, {}, {}, prepared);
    // Preserve the legacy response envelope; database writes above use rows.
    return { ...user, [field]: JSON.stringify(value) };
  }
  if (USER_STRUCTURES[field]) {
    if (field === 'assessmentQA' && value && !Array.isArray(value) && Array.isArray(value.items)) {
      const previous = await prisma.user.findUnique({ where: { id: userId } });
      value = [...(await loadUserStructures(prisma, userId, previous)).assessmentQA, value];
    }
    const prepared = prepareUserStructures({ [field]: value });
    const user = await saveUserStructures(prisma, userId, prepared);
    return { ...user, [field]: JSON.stringify(value) };
  }
  return prisma.user.update({ where: { id: userId }, data: { [field]: typeof value === 'object' ? JSON.stringify(value) : value } });
}
const singletons = [
  'training_plan', 'nutrition_strategy', 'lifestyle_tips', 'medical_data', 
  'physique_targets', 'assessment_qa', 'skills', 'calendar_events', 'wellness_data', 'health_extras', 'portfolio'
];

singletons.forEach(route => {
  const retired = recordRowsEnabled && ['calendar_events', 'portfolio'].includes(route);
  app.post(`/api/${route}`, authMiddleware, async (req, res) => {
    if (retired) return legacyWriteRetired(res);
    try {
      const camelCaseField = route.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      if (route === 'portfolio' && !Array.isArray(req.body)) return res.status(400).json({ error: 'Portfolio must be an array.' });
      if (route === 'portfolio' && jsonSize(req.body) > PORTFOLIO_MAX_BYTES) return res.status(413).json({ error: 'Portfolio is too large.' });
      const value = route === 'portfolio' ? normalizePortfolioPayload(req.body) : req.body;
      if (route === 'portfolio' && jsonSize(value) > PORTFOLIO_MAX_BYTES) return res.status(413).json({ error: 'Portfolio is too large.' });
      const user = await persistUserSingleton(req.user.id, camelCaseField, value);
      res.json(user);
    } catch(e) { if (e.status) return res.status(e.status).json({ error: e.message, code: e.code }); sendInternalError(res, e, `${route} update`); }
  });
  
  app.put(`/api/${route}`, authMiddleware, async (req, res) => {
    if (retired) return legacyWriteRetired(res);
    try {
      const camelCaseField = route.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      if (route === 'portfolio' && !Array.isArray(req.body)) return res.status(400).json({ error: 'Portfolio must be an array.' });
      if (route === 'portfolio' && jsonSize(req.body) > PORTFOLIO_MAX_BYTES) return res.status(413).json({ error: 'Portfolio is too large.' });
      const value = route === 'portfolio' ? normalizePortfolioPayload(req.body) : req.body;
      if (route === 'portfolio' && jsonSize(value) > PORTFOLIO_MAX_BYTES) return res.status(413).json({ error: 'Portfolio is too large.' });
      const user = await persistUserSingleton(req.user.id, camelCaseField, value);
      res.json(user);
    } catch(e) { if (e.status) return res.status(e.status).json({ error: e.message, code: e.code }); sendInternalError(res, e, `${route} update`); }
  });
});

// Domain endpoints that adapt specialized module payloads to the canonical
// local tables. This keeps modules interconnected without duplicate storage.
app.get('/api/hydration/logs', authMiddleware, async (req, res) => {
  const rows = await prisma.metricLog.findMany({ include: METRIC_INCLUDE, where: { userId: req.user.id, metric: 'hydration' }, orderBy: { createdAt: 'desc' }, take: 1000 });
  res.json(rows.map(metricToClient));
});

app.post('/api/hydration/log', authMiddleware, async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || Math.abs(amount) > 5000) return res.status(400).json({ error: 'Hydration amount is invalid.' });
  const at = req.body?.at ? new Date(req.body.at) : new Date();
  if (Number.isNaN(at.getTime())) return res.status(400).json({ error: 'Hydration time is invalid.' });
  const payload = metricPayload({ metric: 'hydration', source: 'manual', date: at.toISOString().slice(0, 10), value: amount, amount, at: at.toISOString() });
  const row = await prisma.metricLog.create({ data: { ...payload, userId: req.user.id }, include: METRIC_INCLUDE });
  await auditCrud({ action: 'create', table_name: 'metric_logs', item_id: row.id, details: 'Logged hydration', userId: req.user.id, req });
  res.json(metricToClient(row));
});

app.post('/api/health/sync/apple', authMiddleware, appleHealthSetupRequired);

registerFinanceRoutes(app, authMiddleware, { prisma, auditCrud });
registerCustomerAdminRoutes(app, authMiddleware, { writeEvent: eventLogger.write });
registerNativeModuleRoutes(app, authMiddleware, { forexUrl: config.nativeModules.forexUrl });
registerFamilyBridge(app, authMiddleware, config.family);
registerRecordRoutes(app, { authMiddleware, services: recordServices, enabled: recordRowsEnabled });
const syncEngine = createSyncEngine({ prisma, records: recordRowsEnabled ? recordServices : null, fetchDefaults: config.sync.fetch, connectors: createConnectors(config.sync), sealer: createSealer(config.security.encryptionKey), logEvent: event => eventLogger.write({ source: 'sync-engine', ...event }) });
registerSyncRoutes(app, authMiddleware, syncEngine);
registerWorkoutRoutes(app, authMiddleware, { prisma, auditCrud });
const privateFileRoot = path.resolve(process.env.FILE_STORAGE_ROOT || path.join(__dirname, 'server', 'private-files'));
for (const publicDirectory of ['public', 'dist']) {
  const relative = path.relative(path.join(__dirname, publicDirectory), privateFileRoot);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) throw new Error('FILE_STORAGE_ROOT must be outside public and dist.');
}
registerFileRoutes(app, authMiddleware, { prisma, auditCrud, storage: createEncryptedPrivateStorage(createPrivateStorage(privateFileRoot), config.security.encryptionKey) });

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
  { name: 'notes', model: notesModel },
  { name: 'goals', model: prisma.goal },
  { name: 'sleep_logs', model: prisma.sleepLog },
  { name: 'documents', model: prisma.document },
  { name: 'habits', model: prisma.habit },
  { name: 'subscriptions', model: prisma.subscriptionItem },
  { name: 'mood_logs', model: prisma.moodLog },
  { name: 'vitals_logs', model: prisma.vitalsLog },
  { name: 'medications', model: prisma.medication },
  { name: 'progress_photos', model: prisma.progressPhoto },
  { name: 'goal_progress_logs', model: prisma.goalProgressLog },
];

registerNotesRoutes(app, { prisma, authMiddleware, enabled: notesV1Enabled });
collections.forEach(({ name, model }) => {
  if (name === 'notes' && notesV1Enabled) return;
  if (name === 'documents') return; // The file domain owns byte transfers and protected metadata.
  if (name === 'goal_progress_logs') { new GoalProgressController(prisma, auditCrud).registerRoutes(app, authMiddleware); return; }
  if (name === 'metric_logs') {
    const controller = new MetricLogController(model, name, metricPayload, stripProtectedFields, auditCrud, metricToClient, parseStoredJson);
    controller.registerRoutes(app, authMiddleware);
  } else {
    const controller = new BaseController(model, name, null, stripProtectedFields, auditCrud, prisma);
    controller.registerRoutes(app, authMiddleware);
  }
});

app.get('/api/database/tables', authMiddleware, async (req, res) => {
  const userTables = await Promise.all(collections.map(async ({ name, model }) => {
    const [count, rows] = await Promise.all([
      model.count({ where: { userId: req.user.id } }),
      model.findMany({ where: { userId: req.user.id }, take: 10, orderBy: { createdAt: 'desc' }, ...(name === 'metric_logs' ? { include: METRIC_INCLUDE } : collectionInclude(name) ? { include: collectionInclude(name) } : {}) }),
    ]);
    return { name, count, rows: name === 'metric_logs' ? rows.map(metricToClient) : ['documents', 'workout_sessions'].includes(name) ? rows.map(row => collectionToClient(name, row)) : rows };
  }));
  const [healthProfile, ownerProfile, bodyProfile, locations, settings, providers] = await Promise.all([
    prisma.healthProfile.findUnique({ where: { userId: req.user.id }, include: HEALTH_PROFILE_INCLUDE }),
    prisma.ownerProfile.findUnique({ where: { userId: req.user.id } }),
    prisma.bodyProfile.findUnique({ where: { userId: req.user.id } }),
    prisma.locationPoint.findMany({ where: { userId: req.user.id }, take: 10, orderBy: { capturedAt: 'desc' } }),
    prisma.appSetting.findMany({ where: publicSettingsWhere(), orderBy: { key: 'asc' } }),
    prisma.integrationProvider.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);
  res.json([
    ...userTables,
    { name: 'health_profiles', count: healthProfile ? 1 : 0, rows: healthProfile ? [{ ...healthProfile, data: healthProfileData(healthProfile) }] : [] },
    { name: 'owner_profiles', count: ownerProfile ? 1 : 0, rows: ownerProfile ? [ownerProfile] : [] },
    { name: 'body_profiles', count: bodyProfile ? 1 : 0, rows: bodyProfile ? [{ ...bodyProfile, morphOverrides: parseStoredJson(bodyProfile.morphOverrides, {}) }] : [] },
    { name: 'location_points', count: await prisma.locationPoint.count({ where: { userId: req.user.id } }), rows: locations },
    { name: 'app_settings', count: settings.length, rows: settings.map(row => ({ ...row, value: parseStoredJson(row.value, row.value) })) },
    { name: 'integration_providers', count: providers.length, rows: providers },
  ]);
});

// The Ultimate database page is also the entry point for the shared local
// database console. Keep the console's source catalog behind the same
// authenticated API so the UI works both with the direct Core API and through
// the optional workspace gateway (without exposing connection details).
app.get('/api/database/sources', authMiddleware, async (_req, res) => {
  const base = String(process.env.DB_STUDIO_URL || 'http://127.0.0.1:5556').replace(/\/$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(`${base}/api/sources`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Database catalog returned ${response.status}`);
    const sources = await response.json();
    res.json(Array.isArray(sources) ? sources : []);
  } catch (error) {
    res.status(503).json({ error: 'Database source catalog unavailable.', detail: error?.name === 'AbortError' ? 'timeout' : 'unavailable' });
  } finally { clearTimeout(timeout); }
});

// Nested entities overrides
app.post('/api/workout_sessions/:id/exercises', authMiddleware, async (req, res) => {
  try {
    const session = await prisma.workoutSession.findFirst({ where: { id: req.params.id, userId: req.user.id }, include: { exercises: true } });
    if (!session) return res.status(404).json({ error: 'Workout session not found.' });
    if (isCompletedWorkout(session)) return res.status(409).json({ error: 'Completed training sessions cannot be appended to.', code: 'WORKOUT_CONFLICT' });
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

if (config.server.serveFrontend) {
  registerFrontend(app, { distDirectory: path.join(__dirname, 'dist'), frontendBasePath: config.server.frontendBasePath, appUrl: APP_URL, securityConfig: config });
} else {
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/auth/') && req.path !== '/') {
      return res.status(404).json({ error: 'Endpoint not found.' });
    }
    next();
  });
}

// Last resort: malformed JSON, oversized bodies and unexpected failures always
// answer with the standard JSON error shape and never expose a stack trace.
app.use(createJsonErrorHandler({ logToFile }));

export const server = app.listen(PORT, config.server.listenHost, () => {
  logToFile('info', `GrowthTrack server started`, { port: PORT, env: config.env });
  console.log(`Local Auth Server running on http://localhost:${PORT}`);
});

// Connected sources refresh on their own interval; GROWTHTRACK_SYNC_SCHEDULER=off disables background sync.
const stopSyncScheduler = config.sync.scheduler.enabled
  ? startSyncScheduler(syncEngine, { ...config.sync.scheduler, onError: error => logToFile('error', 'sync_scheduler_failure', { error: String(error?.message || error) }) })
  : () => {};

// Graceful shutdown: stop timers, let in-flight requests (including sync
// transactions) finish, then close the database. A deadline prevents hangs.
export const closeServer = createServerCloser({
  server,
  stopScheduling: () => { stopSyncScheduler(); clearInterval(logCleanupTimer); },
  stopBackups: () => backupScheduler.stop(),
  disconnect: () => prisma.$disconnect(),
});
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logToFile('info', 'server_shutdown', { signal });
  const deadline = setTimeout(() => process.exit(1), 10_000);
  deadline.unref?.();
  await closeServer();
  process.exit(0);
}
// Electron owns its own lifecycle; standalone and container runs handle signals.
if (config.env !== 'desktop') for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => void shutdown(signal));
