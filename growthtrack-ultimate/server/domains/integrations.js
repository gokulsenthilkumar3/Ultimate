import crypto from 'node:crypto';

export function registerIntegrationRoutes(app, { config, authMiddleware, logToFile }) {
  // Production requires HANDOFF_SECRET (enforced in config). Locally an ephemeral
  // secret works for one process; say so instead of failing silently later.
  const handoffSecret = config.security.handoffSecret || crypto.randomBytes(32).toString('hex');
  if (!config.security.handoffSecret) logToFile('warning', 'handoff_secret_ephemeral', { detail: 'Set HANDOFF_SECRET for a stable signing identity. Outstanding handoffs remain process-local.' });
  const handoffNonces = new Map();
  const productCallbacks = Object.freeze(Object.fromEntries(config.gateway.companions.map(product => [product.id, product.callbackUrl])));
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const signHandoff = payload => { const body = encode(payload); return `${body}.${crypto.createHmac('sha256', handoffSecret).update(body).digest('base64url')}`; };
  const verifyHandoff = token => {
    const [body, signature] = String(token || '').split('.'); if (!body || !signature) return null;
    const expected = crypto.createHmac('sha256', handoffSecret).update(body).digest(); const received = Buffer.from(signature, 'base64url');
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
    try { return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return null; }
  };
  
  app.post('/api/integrations/handoff', authMiddleware, (req, res) => {
    const productId = String(req.body?.productId || ''); const callback = productCallbacks[productId];
    if (!callback) return res.status(400).json({ error: 'Unknown product.' });
    const now = Math.floor(Date.now() / 1000); const jti = crypto.randomUUID();
    const payload = { iss: 'ultimate-local', aud: productId, sub: req.user.id, email: req.user.email, name: req.user.fullName, iat: now, exp: now + 60, jti };
    for (const [nonce, expires] of handoffNonces) if (expires <= now) handoffNonces.delete(nonce);
    handoffNonces.set(jti, payload.exp); const token = signHandoff(payload); const separator = callback.includes('?') ? '&' : '?';
    return res.json({ token, expiresAt: payload.exp, launchUrl: `${callback}${separator}ultimate_handoff=${encodeURIComponent(token)}` });
  });
  app.post('/api/integrations/consume', (req, res) => {
    const productId = String(req.body?.productId || ''); const payload = verifyHandoff(req.body?.token); const now = Math.floor(Date.now() / 1000);
    if (!payload || payload.aud !== productId || payload.exp <= now || !handoffNonces.has(payload.jti)) return res.status(401).json({ error: 'Invalid or expired handoff.' });
    handoffNonces.delete(payload.jti);
    return res.json({ user: { id: payload.sub, email: payload.email, name: payload.name }, provider: payload.iss });
  });
  

}
