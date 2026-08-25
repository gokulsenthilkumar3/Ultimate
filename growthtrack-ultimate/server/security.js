import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const COOKIE_NAME = 'growthtrack_session';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SESSION_HOURS = Number(process.env.SESSION_HOURS || 12);
const LOGIN_WINDOW_MS = Number(process.env.LOGIN_WINDOW_MS || 15 * 60 * 1000);
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);

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

export function createSecurity({ prisma, logToFile }) {
  const attempts = new Map();
  const isProduction = process.env.NODE_ENV === 'production';
  const configuredOrigins = (process.env.APP_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  const localOrigins = ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:5173', 'http://127.0.0.1:5173'];
  const allowedOrigins = new Set(configuredOrigins.length ? configuredOrigins : (isProduction ? [] : localOrigins));

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
    res.setHeader('Cache-Control', req.path.startsWith('/api/auth') ? 'no-store' : 'private, no-cache');
    next();
  };

  async function writeLoginLog({ userId, email, action, failureReason, req }) {
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

    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!valid) {
      attempts.set(bucketKey, [...bucket, now]);
      await writeLoginLog({ userId: user?.id, email, action: 'login_failed', failureReason: 'invalid_credentials', req });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    attempts.delete(bucketKey);
    const sessionToken = randomToken();
    const csrfToken = randomToken();
    const expiresAt = new Date(now + SESSION_HOURS * 60 * 60 * 1000);
    const session = await prisma.authSession.create({ data: { userId: user.id, tokenHash: sha256(sessionToken), csrfHash: sha256(csrfToken), ipAddress: req.ip, userAgent: req.headers['user-agent'], expiresAt } });
    await prisma.sessionLog.create({ data: { user_id: user.id, action: 'start', details: `Session ${session.id} created`, ip_address: req.ip, user_agent: req.headers['user-agent'] } });
    await writeLoginLog({ userId: user.id, email, action: 'login_success', req });

    res.cookie(COOKIE_NAME, sessionToken, { httpOnly: true, secure: isProduction, sameSite: 'strict', path: '/', maxAge: SESSION_HOURS * 60 * 60 * 1000 });
    return res.json({ user: publicUser(user), csrfToken, expiresAt });
  };

  const authenticate = async (req, res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies[COOKIE_NAME];
    if (!sessionToken) return res.status(401).json({ error: 'Authentication required.' });
    const session = await prisma.authSession.findUnique({ where: { tokenHash: sha256(sessionToken) }, include: { user: true } });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      res.clearCookie(COOKIE_NAME, { path: '/', sameSite: 'strict', secure: isProduction });
      return res.status(401).json({ error: 'Session expired.' });
    }
    if (!SAFE_METHODS.has(req.method)) {
      const csrfToken = req.headers['x-csrf-token'];
      if (!csrfToken || sha256(String(csrfToken)) !== session.csrfHash) return res.status(403).json({ error: 'Invalid CSRF token.' });
    }
    req.user = session.user;
    req.authSession = session;
    await prisma.authSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
    res.on('finish', () => {
      prisma.auditLog.create({ data: { action: `${req.method} ${req.path}`, table_name: 'http_request', item_id: session.id, details: JSON.stringify({ status: res.statusCode, queryKeys: Object.keys(req.query || {}) }), actor_name: session.user.fullName, actor_email: session.user.email, actor_ip: req.ip, category: 'request', user_id: session.user.id, user_agent: req.headers['user-agent'], severity: res.statusCode >= 400 ? 'warning' : 'info' } }).catch(() => {});
    });
    next();
  };

  const me = async (req, res) => res.json({ user: publicUser(req.user), csrfToken: null, expiresAt: req.authSession.expiresAt });

  const csrf = async (req, res) => {
    const csrfToken = randomToken();
    await prisma.authSession.update({ where: { id: req.authSession.id }, data: { csrfHash: sha256(csrfToken) } });
    res.json({ csrfToken });
  };

  const logout = async (req, res) => {
    await prisma.authSession.update({ where: { id: req.authSession.id }, data: { revokedAt: new Date() } });
    await prisma.sessionLog.create({ data: { user_id: req.user.id, action: 'end', details: `Session ${req.authSession.id} revoked`, ip_address: req.ip, user_agent: req.headers['user-agent'] } });
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
    if (newPassword && newPassword.length < 12) return res.status(400).json({ error: 'New password must be at least 12 characters.' });
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

  return { corsOptions, headers, login, authenticate, me, csrf, logout, updateProfile };
}
