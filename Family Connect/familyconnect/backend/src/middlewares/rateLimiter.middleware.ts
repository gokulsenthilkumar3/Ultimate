import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';
import { ultimateIdentity } from '../services/ultimateIdentity';

export function familyRateLimitKey(req: Request) {
  try { return 'ultimate:' + ultimateIdentity(req).id; }
  catch { return 'ip:' + ipKeyGenerator(req.ip || '127.0.0.1'); }
}

/** 200 req / 15 min per IP — applied to all routes */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  keyGenerator: familyRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

/** 10 req / 15 min per IP — applied only to /auth/* routes */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});
