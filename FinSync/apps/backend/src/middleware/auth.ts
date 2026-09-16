/**
 * Authentication Middleware
 * Verifies JWT tokens and protects routes
 */

import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../config/firebase-admin';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        emailVerified: boolean;
      };
    }
  }
}

/**
 * Verify Firebase ID token from Authorization header
 */
export async function verifyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      });
      return;
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify token with Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      emailVerified: decodedToken.email_verified || false,
    };
    
    next();
  } catch (error: any) {
    console.error('Auth verification error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({
        error: 'TokenExpired',
        message: 'Your session has expired. Please log in again.',
      });
      return;
    }
    
    if (error.code === 'auth/argument-error') {
      res.status(401).json({
        error: 'InvalidToken',
        message: 'Invalid authentication token',
      });
      return;
    }
    
    res.status(403).json({
      error: 'Forbidden',
      message: 'Failed to authenticate request',
    });
  }
}

/**
 * Optional auth - sets req.user if token is valid, but doesn't block request
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await adminAuth.verifyIdToken(token);
      
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        emailVerified: decodedToken.email_verified || false,
      };
    }
  } catch (error) {
    // Silently fail - optional auth
    console.warn('Optional auth failed:', error);
  }
  
  next();
}

/**
 * Verify user owns the resource
 */
export function verifyOwnership(resourceUidField: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }
    
    // Check if request params, body, or query contains the resource UID
    const resourceUid = 
      req.params[resourceUidField] || 
      req.body[resourceUidField] || 
      req.query[resourceUidField];
    
    if (!resourceUid) {
      res.status(400).json({
        error: 'BadRequest',
        message: `Missing ${resourceUidField} in request`,
      });
      return;
    }
    
    if (req.user.uid !== resourceUid) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      });
      return;
    }
    
    next();
  };
}

/**
 * Rate limiting middleware (simple in-memory implementation)
 * In production, use Redis or similar
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.user?.uid || req.ip || 'anonymous';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(identifier);
    
    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt: now + windowMs,
      };
      rateLimitStore.set(identifier, entry);
    }
    
    entry.count++;
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', entry.resetAt.toString());
    
    if (entry.count > maxRequests) {
      res.status(429).json({
        error: 'TooManyRequests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
      return;
    }
    
    next();
  };
}

/**
 * Require email verification
 */
export function requireEmailVerification(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }
  
  // Skip in emulator mode
  if (process.env.NODE_ENV === 'development') {
    next();
    return;
  }
  
  if (!req.user.emailVerified) {
    res.status(403).json({
      error: 'EmailNotVerified',
      message: 'Please verify your email address to access this resource',
    });
    return;
  }
  
  next();
}
