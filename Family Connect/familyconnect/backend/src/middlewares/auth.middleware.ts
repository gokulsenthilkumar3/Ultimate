import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/environment';
import { ultimateIdentity } from '../services/ultimateIdentity';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.headers['x-ultimate-assertion']) {
    try { const identity = ultimateIdentity(req); req.user = { id: identity.id, email: identity.email }; next(); }
    catch { res.status(401).json({ error: 'Unauthorized: Invalid Ultimate session' }); }
    return;
  }
  if (process.env.ULTIMATE_BRIDGE_SECRET) {
    res.status(401).json({ error: 'Sign in through Ultimate to access Family.' });
    return;
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as { id: string; email: string };
    if (typeof decoded.id !== 'string' || !decoded.id || typeof decoded.email !== 'string') throw new Error('Invalid principal');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
