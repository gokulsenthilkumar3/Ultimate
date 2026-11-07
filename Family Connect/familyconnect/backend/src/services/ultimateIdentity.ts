import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request } from 'express';

export interface UltimateIdentity { id: string; subject: string; email: string; name: string; linked: boolean }

export function ultimateIdentity(req: Pick<Request, 'headers' | 'method' | 'originalUrl'>, env: NodeJS.ProcessEnv = process.env): UltimateIdentity {
  const token = req.headers['x-ultimate-assertion'];
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(env.ULTIMATE_BRIDGE_SECRET || '')) throw new Error('Shared session unavailable');
  const payload = jwt.verify(token, env.ULTIMATE_BRIDGE_SECRET!, { algorithms: ['HS256'], issuer: 'growthtrack-ultimate', audience: 'family-api', maxAge: '30s' });
  if (typeof payload === 'string' || typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 200 || typeof payload.exp !== 'number' || typeof payload.iat !== 'number' || payload.exp - payload.iat > 30 || payload.method !== req.method || payload.path !== req.originalUrl) throw new Error('Invalid shared session');
  if (payload.iat > Math.floor(Date.now() / 1000) + 2 || payload.exp <= payload.iat) throw new Error('Invalid session lifetime');
  if (Boolean(env.ULTIMATE_OWNER_ID) !== Boolean(env.ULTIMATE_FAMILY_USER_ID)) throw new Error('Incomplete owner link');
  const linked = Boolean(env.ULTIMATE_OWNER_ID && payload.sub === env.ULTIMATE_OWNER_ID);
  const id = linked ? env.ULTIMATE_FAMILY_USER_ID! : 'ultimate_' + createHash('sha256').update('growthtrack-ultimate:' + payload.sub).digest('hex').slice(0, 40);
  return { id, subject: payload.sub, linked, email: typeof payload.email === 'string' ? payload.email.slice(0, 254) : '', name: typeof payload.name === 'string' ? payload.name.slice(0, 160) : 'Ultimate member' };
}

/** Preserve explicitly linked accounts; never claim a legacy account by matching an email. */
export async function openUltimateSession(identity: UltimateIdentity, users: { findUnique: Function; upsert: Function }) {
  let user = await users.findUnique({ where: { id: identity.id }, select: { id: true, email: true, name: true } });
  if (!user && identity.linked) throw new Error('The linked Family account does not exist');
  const requestedEmail = identity.email.trim().toLowerCase();
  const conflictingEmail = !user && requestedEmail ? await users.findUnique({ where: { email: requestedEmail }, select: { id: true } }) : null;
  if (!user) user = await users.upsert({ where: { id: identity.id }, update: {}, create: {
    id: identity.id, email: requestedEmail && !conflictingEmail ? requestedEmail : identity.id + '@ultimate.invalid', name: identity.name,
    passwordHash: await bcrypt.hash(randomBytes(48).toString('base64url'), 10),
  }, select: { id: true, email: true, name: true } });
  return { authMode: 'ultimate', user };
}
