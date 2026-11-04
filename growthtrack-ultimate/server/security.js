import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { DEFAULT_CONFIG } from './config.js';
import { contentSecurityPolicy } from './contentSecurityPolicy.js';
import { consumeOwnerCode, csrfDigest, sessionCsrfHash, sessionHasMfa } from './domains/ownerMfa.js';

const COOKIE_NAME = 'growthtrack_session';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const RATE_WINDOW_MS = 60_000;

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const randomToken = () => crypto.randomBytes(48).toString('base64url');

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const index = part.indexOf('=');
    return index < 0 ? [part, ''] : [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
  }));
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    subscriptionTier: user.subscriptionTier,
    user_metadata: { full_name: user.fullName },
  };
}

export function createSecurity({ prisma, logToFile, writeEvent, config = DEFAULT_CONFIG }) {
  const attempts = new Map();
  const apiBuckets = new Map();
  const isProduction = config.production;
  const dummyPasswordHash = bcrypt.hash(randomToken(), 12);
  const { sessionHours: SESSION_HOURS, sessionTouchMs: SESSION_TOUCH_MS, loginWindowMs: LOGIN_WINDOW_MS,
    loginMaxAttempts: LOGIN_MAX_ATTEMPTS, apiRateLimitPerMinute } = config.security;
  const allowedOrigins = new Set(config.security.origins);
  // Throttle buckets are keyed by client and path; expired entries are dropped
  // so the maps cannot grow without bound on a long-running server.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [map, windowMs] of [[apiBuckets, RATE_WINDOW_MS], [attempts, LOGIN_WINDOW_MS]]) {
      for (const [key, times] of map) {
        const recent = times.filter(time => now - time < windowMs);
        if (recent.length) map.set(key, recent); else map.delete(key);
      }
    }
  }, RATE_WINDOW_MS);
  sweep.unref?.();

  const corsOptions = {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, origin || true);
      return callback(new Error('Origin is not allowed'));
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  };

  const headers = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    if (isProduction) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Content-Security-Policy', contentSecurityPolicy(config));
    res.setHeader('Cache-Control', /^\/(?:api\/)?auth(?:\/|$)/.test(req.path) ? 'no-store' : 'private, no-cache');
    next();
  };

  const apiRateLimit = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const now = Date.now();
    const key = `${req.ip || 'unknown'}:${req.path}`;
    const bucket = (apiBuckets.get(key) || []).filter(time => now - time < RATE_WINDOW_MS);
    if (bucket.length >= apiRateLimitPerMinute) return res.status(429).json({ error: 'Too many requests. Try again shortly.' });
    bucket.push(now); apiBuckets.set(key, bucket); return next();
  };

  async function writeLoginLog({ userId, email, action, failureReason, req }) {
    if (writeEvent) return writeEvent({ category: 'auth', action, user_id: userId, user_email: email, details: failureReason, severity: action.includes('failed') || action.includes('blocked') ? 'warning' : 'info' }, req);
    await prisma.loginLog.create({ data: { user_id: userId, email, action, failure_reason: failureReason, ip_address: req.ip, user_agent: req.headers['user-agent'] } });
    logToFile(action === 'login_failed' ? 'warning' : 'info', `auth:${action}`, { user_id: userId, email, failure_reason: failureReason, ip: req.ip, user_agent: req.headers['user-agent'] });
  }

  const login = async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const now = Date.now();
    const bucketKey = req.ip || 'unknown';
    const bucket = (attempts.get(bucketKey) || []).filter(timestamp => now - timestamp < LOGIN_WINDOW_MS);
    if (bucket.length >= LOGIN_MAX_ATTEMPTS) {
      await writeLoginLog({ email, action: 'login_blocked', failureReason: 'rate_limit', req });
      return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
    }
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    // Reserve before asynchronous password checks so concurrent failures cannot
    // all observe the same empty throttle bucket.
    attempts.set(bucketKey, [...bucket, now]);

    const user = await prisma.user.findUnique({ where: { email } });
    const passwordMatches = await bcrypt.compare(password, user?.passwordHash || await dummyPasswordHash);
    const valid = Boolean(user && passwordMatches);
    if (!valid) {
      await writeLoginLog({ userId: user?.id, email, action: 'login_failed', failureReason: 'invalid_credentials', req });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (config.security.mfaSecret) {
      if (!req.body?.otp) return res.status(401).json({ code: 'MFA_REQUIRED', error: 'Enter the six-digit code from your authenticator.' });
      const verified = await consumeOwnerCode({ prisma, secret: config.security.mfaSecret, userId: user.id, code: req.body.otp });
      if (!verified) {
        await writeLoginLog({ userId: user.id, email, action: 'login_failed', failureReason: 'invalid_authenticator', req });
        return res.status(401).json({ code: 'MFA_INVALID', error: 'Invalid or already used authenticator code.' });
      }
    }

    attempts.delete(bucketKey);
    const sessionToken = randomToken();
    const csrfToken = randomToken();
    const expiresAt = new Date(now + SESSION_HOURS * 60 * 60 * 1000);
    const session = await prisma.authSession.create({ data: { userId: user.id, tokenHash: sha256(sessionToken), csrfHash: sessionCsrfHash(sha256(csrfToken), config.security.mfaSecret), ipAddress: req.ip, userAgent: req.headers['user-agent'], expiresAt } });
    if (writeEvent) await writeEvent({ category: 'session', action: 'start', user_id: user.id, user_name: user.fullName, user_email: user.email, item_id: session.id, details: `Session ${session.id} created` }, req);
    await writeLoginLog({ userId: user.id, email, action: 'login_success', req });

    res.cookie(COOKIE_NAME, sessionToken, { httpOnly: true, secure: isProduction, sameSite: 'strict', path: '/', maxAge: SESSION_HOURS * 60 * 60 * 1000 });
    return res.json({ user: publicUser(user), csrfToken, expiresAt });
  };

  const authenticate = async (req, res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies[COOKIE_NAME];
    if (!sessionToken) return res.status(401).json({ error: 'Authentication required.' });
    const session = await prisma.authSession.findUnique({ where: { tokenHash: sha256(sessionToken) }, include: { user: true } });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || (config.security.mfaSecret && !sessionHasMfa(session.csrfHash, config.security.mfaSecret))) {
      res.clearCookie(COOKIE_NAME, { path: '/', sameSite: 'strict', secure: isProduction });
      return res.status(401).json({ error: 'Session expired.' });
    }
    if (!SAFE_METHODS.has(req.method)) {
      const csrfToken = req.headers['x-csrf-token'];
      if (!csrfToken || sha256(String(csrfToken)) !== csrfDigest(session.csrfHash)) return res.status(403).json({ error: 'Invalid CSRF token.' });
    }
    req.user = session.user;
    req.authSession = session;
    // Avoid a SQLite write on every API read. A five-minute activity heartbeat
    // is enough to observe session use without amplifying dashboard traffic.
    if (Date.now() - session.lastSeenAt.getTime() >= SESSION_TOUCH_MS) {
      await prisma.authSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
    }
    res.on('finish', () => {
      // Successful mutations are recorded by the CRUD audit service. Keep a
      // request-level record only for failures so routine reads do not flood
      // the local database or duplicate mutation logs.
      if (res.statusCode >= 400) (writeEvent ? writeEvent({ category: 'request', action: `${req.method} ${req.path}`, table_name: 'http_request', item_id: session.id, details: { status: res.statusCode, queryKeys: Object.keys(req.query || {}) }, user_id: session.user.id, user_name: session.user.fullName, user_email: session.user.email, severity: 'warning' }, req) : Promise.resolve()).catch(() => {});
    });
    next();
  };

  const me = async (req, res) => res.json({ user: publicUser(req.user), csrfToken: null, expiresAt: req.authSession.expiresAt });

  const csrf = async (req, res) => {
    const csrfToken = randomToken();
    await prisma.authSession.update({ where: { id: req.authSession.id }, data: { csrfHash: sessionCsrfHash(sha256(csrfToken), config.security.mfaSecret) } });
    res.json({ csrfToken });
  };

  const logout = async (req, res) => {
    await prisma.authSession.update({ where: { id: req.authSession.id }, data: { revokedAt: new Date() } });
    if (writeEvent) await writeEvent({ category: 'session', action: 'end', user_id: req.user.id, user_name: req.user.fullName, user_email: req.user.email, item_id: req.authSession.id, details: `Session ${req.authSession.id} revoked` }, req);
    res.clearCookie(COOKIE_NAME, { path: '/', sameSite: 'strict', secure: isProduction });
    res.json({ success: true });
  };

  const updateProfile = async (req, res) => {
    const fullName = String(req.body?.name || req.user.fullName).trim();
    const email = String(req.body?.email || req.user.email).trim().toLowerCase();
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    const changesCredentials = email !== req.user.email || Boolean(newPassword);

    if (!fullName || !email) return res.status(400).json({ error: 'Name and email are required.' });
    if (changesCredentials) {
      const valid = currentPassword && await bcrypt.compare(currentPassword, req.user.passwordHash);
      if (!valid) return res.status(403).json({ error: 'Current password is incorrect.' });
    }
    if (newPassword && (newPassword.length < 12 || Buffer.byteLength(newPassword, 'utf8') > 72)) return res.status(400).json({ error: 'New password must be at least 12 characters and at most 72 UTF-8 bytes.' });
    if (email !== req.user.email) {
      const duplicate = await prisma.user.findUnique({ where: { email } });
      if (duplicate && duplicate.id !== req.user.id) return res.status(409).json({ error: 'Email is already in use.' });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        fullName,
        email,
        ...(newPassword ? { passwordHash: await bcrypt.hash(newPassword, 12) } : {}),
      },
    });
    if (newPassword) {
      await prisma.authSession.updateMany({
        where: { userId: req.user.id, id: { not: req.authSession.id }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return res.json({ user: publicUser(updated) });
  };

  return { corsOptions, headers, apiRateLimit, login, authenticate, me, csrf, logout, updateProfile };
}
