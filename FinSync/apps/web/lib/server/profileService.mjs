import { createCipheriv, randomBytes } from 'node:crypto';

export class ProfileError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}

export function profileKey(environment = process.env) {
  const value = environment.FINSYNC_PROFILE_ENCRYPTION_KEY;
  const version = environment.FINSYNC_PROFILE_KEY_VERSION;
  if (!/^[a-f0-9]{64}$/i.test(value || '') || !/^[a-zA-Z0-9_-]{1,64}$/.test(version || '')) {
    throw new ProfileError(503, 'PROFILE_ENCRYPTION_NOT_CONFIGURED');
  }
  return { key: Buffer.from(value, 'hex'), version };
}

export function encryptProfile(uid, input, { key, version }) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(JSON.stringify(['finsync-profile', uid, version])));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(input), 'utf8'), cipher.final()]);
  return { format: 'aes-256-gcm-v1', keyVersion: version, iv: iv.toString('base64'), ciphertext: ciphertext.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}

export function validateProfile(input, today = new Date()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).some(key => !['name', 'pan', 'dob', 'phone', 'income', 'familySize'].includes(key))) throw new ProfileError(400, 'INVALID_PROFILE');
  for (const key of ['name', 'pan', 'dob', 'phone', 'income', 'familySize']) {
    if (!['string', 'number'].includes(typeof input[key]) || String(input[key]).length > 200) throw new ProfileError(400, 'INVALID_PROFILE');
  }
  const name = String(input.name).trim(), pan = String(input.pan).trim().toUpperCase();
  const phone = String(input.phone).replace(/\D/g, '');
  const dob = String(input.dob), date = new Date(`${dob}T00:00:00Z`);
  const incomeText = String(input.income), familyText = String(input.familySize);
  const income = Number(incomeText), familySize = Number(familyText);
  if (!name || name.length > 120 || !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan) || !/^[6-9]\d{9}$/.test(phone)
    || !/^\d{4}-\d{2}-\d{2}$/.test(dob) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dob
    || !/^\d+(?:\.\d{1,2})?$/.test(incomeText) || income > 1_000_000_000
    || !/^\d{1,2}$/.test(familyText) || !Number.isInteger(familySize) || familySize < 1 || familySize > 20) throw new ProfileError(400, 'INVALID_PROFILE');
  const cutoff = new Date(today); cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 18);
  if (date > cutoff) throw new ProfileError(400, 'INVALID_PROFILE');
  return { name, pan, dob, phone: `+91${phone}`, income, familySize };
}

export async function boundedJson(request, maxBytes = 16_384) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new ProfileError(415, 'JSON_REQUIRED');
  const reader = request.body?.getReader();
  if (!reader) throw new ProfileError(400, 'INVALID_JSON');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new ProfileError(413, 'PROFILE_TOO_LARGE'); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ProfileError(400, 'INVALID_JSON'); }
}

export function createProfileHandler({ verifyToken, save, environment = process.env, budget, now = () => new Date() }) {
  return async request => {
    const headers = { 'Cache-Control': 'no-store' };
    try {
      const expected = environment.FINSYNC_APP_ORIGIN || (environment.NODE_ENV !== 'production' ? new URL(request.url).origin : null);
      if (!expected || new URL(expected).origin !== expected) throw new ProfileError(503, 'PROFILE_ORIGIN_NOT_CONFIGURED');
      if (request.headers.get('origin') && request.headers.get('origin') !== expected) throw new ProfileError(403, 'ORIGIN_DENIED');
      const token = request.headers.get('authorization')?.match(/^Bearer ([^\s]{1,8192})$/)?.[1];
      if (!token) throw new ProfileError(401, 'AUTH_REQUIRED');
      let identity;
      try { identity = await verifyToken(token); } catch { throw new ProfileError(401, 'AUTH_REQUIRED'); }
      if (!identity?.uid) throw new ProfileError(401, 'AUTH_REQUIRED');
      if (budget && !budget(identity.uid)) throw new ProfileError(429, 'PROFILE_RATE_LIMIT');
      const key = profileKey(environment);
      const profile = validateProfile(await boundedJson(request), now());
      await save(identity.uid, profile, encryptProfile(identity.uid, profile, key));
      return Response.json({ success: true }, { headers });
    } catch (error) {
      const known = error instanceof ProfileError;
      return Response.json({ code: known ? error.code : 'PROFILE_SAVE_FAILED', error: 'Profile could not be saved.' }, { status: known ? error.status : 503, headers });
    }
  };
}
