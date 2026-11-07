import http from 'node:http';
import https from 'node:https';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { classifyFamilyRequest, createFamilyAdmission, FamilyAdmissionError } from './familyAdmission.js';

/** Family sees a short-lived, request-bound server assertion, never the browser's cookies. */
export function registerFamilyBridge(app, authenticate, { baseUrl, secret, requestImpl, admission: admissionOptions } = {}) {
  const circuit = createFamilyCircuitBreaker();
  const admission = createFamilyAdmission(admissionOptions);
  app.use('/api/native/family', authenticate, (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!secret) return res.status(503).json({ code: 'FAMILY_SETUP_REQUIRED', error: 'The shared Family service is not configured.' });
    const incoming = new URL(req.url, 'http://localhost');
    if (!/^\/(?:session|(?:trees|members|relationships|events|documents|notifications|ai)(?:\/[A-Za-z0-9_-]+)*)\/?$/.test(incoming.pathname)) return res.status(404).json({ error: 'Unsupported Family route.' });
    if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || (incoming.pathname === '/session' && req.method !== 'POST')) return res.status(405).json({ error: 'Unsupported Family method.' });
    let destination;
    try {
      destination = new URL(baseUrl);
      if (!['http:', 'https:'].includes(destination.protocol) || destination.username || destination.password || destination.pathname !== '/' || destination.search || destination.hash) throw new Error('origin');
    } catch { return res.status(503).json({ error: 'The Family service URL is invalid.' }); }
    // Peek before admitting so requests refused during an outage consume no account budget,
    // then admit before claiming the single recovery probe so a refused request cannot leak it.
    const recovering = () => { res.set('Retry-After', String(circuit.retryAfter())); return res.status(503).json({ code: 'FAMILY_CIRCUIT_OPEN', error: 'The Family service is recovering. Retry in a few seconds.' }); };
    if (!circuit.available()) return recovering();
    let release;
    try { release = admission.acquire(String(req.user.id), classifyFamilyRequest(req.method, incoming.pathname)); }
    catch (error) {
      if (!(error instanceof FamilyAdmissionError)) throw error;
      res.set('Retry-After', String(error.retryAfter));
      return res.status(error.status).json({ code: error.code, error: error.message });
    }
    res.once('close', release);
    if (!circuit.acquire()) return recovering();
    let settled = false;
    const failure = () => { if (!settled) { settled = true; circuit.failure(); } };
    const success = () => { if (!settled) { settled = true; circuit.success(); } };
    const cancel = () => { if (!settled) { settled = true; circuit.cancel(); } };
    destination.pathname = incoming.pathname === '/session' ? '/api/v1/auth/ultimate-session' : '/api/v1' + incoming.pathname;
    destination.search = incoming.search;
    const assertion = jwt.sign({ name: String(req.user.fullName || req.user.name || 'Ultimate member').slice(0, 160), email: String(req.user.email || '').slice(0, 254), method: req.method, path: destination.pathname + destination.search }, secret, {
      algorithm: 'HS256', issuer: 'growthtrack-ultimate', audience: 'family-api', subject: String(req.user.id), expiresIn: 30, jwtid: randomUUID(),
    });
    const headers = { accept: req.headers.accept || 'application/json', 'x-ultimate-assertion': assertion };
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
    let body;
    if (req.is('application/json') && req.body !== undefined) { body = Buffer.from(JSON.stringify(req.body)); headers['content-length'] = String(body.length); }
    const send = requestImpl || (destination.protocol === 'https:' ? https.request : http.request);
    const upstream = send(destination, { method: req.method, headers }, response => {
      if (response.statusCode === 401) { failure(); response.resume(); return res.status(503).json({ code: 'FAMILY_BRIDGE_REJECTED', error: 'The Family service could not validate the shared session. Review its bridge configuration.' }); }
      response.on('error', () => { failure(); if (!res.destroyed) res.destroy(); });
      response.on('end', () => { if ((response.statusCode || 502) >= 500) failure(); else success(); });
      res.status(response.statusCode || 502);
      for (const name of ['content-type', 'content-disposition', 'content-length', 'content-range', 'accept-ranges']) if (response.headers[name]) res.setHeader(name, response.headers[name]);
      response.pipe(res);
    });
    upstream.setTimeout(20_000, () => upstream.destroy(new Error('timeout')));
    upstream.on('error', () => { failure(); if (res.headersSent) return res.destroy(); if (!res.destroyed) res.status(503).json({ code: 'FAMILY_UNAVAILABLE', error: 'The Family service is unavailable. Start the Family service and retry.' }); });
    req.on('aborted', () => { cancel(); upstream.destroy(); });
    res.on('close', () => { if (!res.writableEnded) { cancel(); upstream.destroy(); } });
    if (body) upstream.end(body); else req.pipe(upstream);
  });
}

/** In-process service protection, never a retry mechanism for writes. */
export function createFamilyCircuitBreaker({ threshold = 3, cooldownMs = 15_000, now = Date.now } = {}) {
  let failures = 0, blockedUntil = 0, probing = false;
  return {
    /** Side-effect-free: whether acquire() would currently succeed. */
    available() { return !blockedUntil || (now() >= blockedUntil && !probing); },
    /** Whole seconds a refused caller should wait, from the remaining cooldown. */
    retryAfter() { return Math.max(1, Math.ceil((blockedUntil - now()) / 1000)); },
    acquire() {
      if (!blockedUntil) return true;
      if (now() < blockedUntil || probing) return false;
      probing = true; return true;
    },
    success() { failures = 0; blockedUntil = 0; probing = false; },
    cancel() { probing = false; },
    failure() { probing = false; if (++failures >= threshold) blockedUntil = now() + cooldownMs; },
  };
}
