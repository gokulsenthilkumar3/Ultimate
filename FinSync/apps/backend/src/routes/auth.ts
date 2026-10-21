/**
 * Authentication Routes
 * Handles user registration, token verification, and session management
 */

import { Router, Request, Response } from 'express';
import { adminAuth, adminDb, FieldValue } from '../config/firebase-admin';
import { verifyAuth, optionalAuth } from '../middleware/auth';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Register a new user with email and password
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    
    // Validation
    if (!email || !password) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Email and password are required',
      });
      return;
    }
    
    if (password.length < 8) {
      res.status(400).json({
        error: 'WeakPassword',
        message: 'Password must be at least 8 characters',
      });
      return;
    }
    
    // Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false, // Will be verified via email
    });
    
    // Create user document in Firestore
    await adminDb.collection('users').doc(userRecord.uid).set({
      email: userRecord.email,
      displayName: name || null,
      profile: {
        onboarded: false,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    // Generate custom token for immediate login (emulator mode)
    const customToken = await adminAuth.createCustomToken(userRecord.uid);
    
    res.status(201).json({
      uid: userRecord.uid,
      email: userRecord.email,
      token: customToken,
      message: 'User registered successfully',
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.code === 'auth/email-already-exists') {
      res.status(409).json({
        error: 'EmailExists',
        message: 'An account with this email already exists',
      });
      return;
    }
    
    if (error.code === 'auth/invalid-email') {
      res.status(400).json({
        error: 'InvalidEmail',
        message: 'Invalid email address',
      });
      return;
    }
    
    res.status(500).json({
      error: 'InternalError',
      message: 'Failed to register user',
    });
  }
});

/**
 * POST /api/v1/auth/verify-token
 * Verify Firebase ID token and return user info
 */
router.post('/verify-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Token is required',
      });
      return;
    }
    
    // Verify token
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Fetch user profile from Firestore
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      res.status(404).json({
        error: 'UserNotFound',
        message: 'User profile not found',
      });
      return;
    }
    
    const userData = userDoc.data();
    
    res.status(200).json({
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      profile: userData?.profile || {},
      onboarded: userData?.profile?.onboarded || false,
    });
  } catch (error: any) {
    console.error('Token verification error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({
        error: 'TokenExpired',
        message: 'Token has expired',
      });
      return;
    }
    
    res.status(401).json({
      error: 'InvalidToken',
      message: 'Invalid token',
    });
  }
});

/**
 * POST /api/v1/auth/refresh-token
 * Refresh an expired token (using custom token)
 */
router.post('/refresh-token', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    
    // Generate new custom token
    const customToken = await adminAuth.createCustomToken(uid);
    
    res.status(200).json({
      token: customToken,
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'InternalError',
      message: 'Failed to refresh token',
    });
  }
});

/**
 * GET /api/v1/auth/session
 * Get current session info (requires authentication)
 */
router.get('/session', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { uid, email, emailVerified } = req.user!;
    
    // Fetch user profile
    const userDoc = await adminDb.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      res.status(404).json({
        error: 'UserNotFound',
        message: 'User profile not found',
      });
      return;
    }
    
    const userData = userDoc.data();
    
    res.status(200).json({
      uid,
      email,
      emailVerified,
      profile: userData?.profile || {},
      budget: userData?.budget || null,
      onboarded: userData?.profile?.onboarded || false,
    });
  } catch (error) {
    console.error('Session fetch error:', error);
    res.status(500).json({
      error: 'InternalError',
      message: 'Failed to fetch session',
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Revoke user session (invalidate refresh tokens)
 */
router.post('/logout', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    
    // Revoke all refresh tokens for the user
    await adminAuth.revokeRefreshTokens(uid);
    
    res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'InternalError',
      message: 'Failed to logout',
    });
  }
});

/**
 * DELETE /api/v1/auth/account
 * Delete user account (requires authentication)
 */
router.delete('/account', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    
    // Delete user data from Firestore
    await adminDb.collection('users').doc(uid).delete();
    
    // Delete user from Firebase Auth
    await adminAuth.deleteUser(uid);
    
    res.status(200).json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      error: 'InternalError',
      message: 'Failed to delete account',
    });
  }
});

export default router;
