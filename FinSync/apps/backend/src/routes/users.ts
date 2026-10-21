/**
 * User Profile Routes
 * Handles user profile CRUD operations
 */

import { Router, Request, Response } from 'express';
import { adminDb, FieldValue } from '../config/firebase-admin';
import { verifyAuth, verifyOwnership } from '../middleware/auth';

const router = Router();

/**
 * GET /api/v1/users/me
 * Get current user's profile
 */
router.get('/me', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    
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
      email: req.user!.email,
      profile: userData?.profile || {},
      budget: userData?.budget || null,
      settings: userData?.settings || {},
      createdAt: userData?.createdAt,
      updatedAt: userData?.updatedAt,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'InternalError',
      message: 'Failed to fetch profile',
    });
  }
});

/**
 * PATCH /api/v1/users/me
 * Update current user's profile
 */
router.patch('/me', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    const updates = req.body;
    
    // Don't allow updating certain fields
    delete updates.uid;
    delete updates.email;
    delete updates.createdAt;
    
    // Add updatedAt timestamp
    updates.updatedAt = FieldValue.serverTimestamp();
    
    await adminDb.collection('users').doc(uid).update(updates);
    
    res.status(200).json({
      message: 'Profile updated successfully',
      updates,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'InternalError',
      message: 'Failed to update profile',
    });
  }
});

/**
 * POST /api/v1/users/me/onboarding
 * Save onboarding data (profile + budget)
 */
router.post('/me/onboarding', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    const { profile, budget } = req.body;
    
    // Validation
    if (!profile || !profile.name || !profile.pan || !profile.dob) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Missing required profile fields (name, pan, dob)',
      });
      return;
    }
    
    // Update user document with onboarding data
    await adminDb.collection('users').doc(uid).set({
      profile: {
        ...profile,
        onboarded: true,
      },
      budget: budget || null,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    
    res.status(200).json({
      message: 'Onboarding completed successfully',
      onboarded: true,
    });
  } catch (error) {
    console.error('Onboarding save error:', error);
    res.status(500).json({
      error: 'InternalError',
      message: 'Failed to save onboarding data',
    });
  }
});

/**
 * GET /api/v1/users/:userId
 * Get another user's public profile (future: for family sharing)
 */
router.get('/:userId', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      res.status(404).json({
        error: 'UserNotFound',
        message: 'User not found',
      });
      return;
    }
    
    const userData = userDoc.data();
    
    // Return only public fields
    res.status(200).json({
      uid: userId,
      displayName: userData?.profile?.name || 'Anonymous',
      // Don't expose sensitive data (PAN, DOB, etc.)
    });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({
      error: 'InternalError',
      message: 'Failed to fetch user',
    });
  }
});

/**
 * PATCH /api/v1/users/me/settings
 * Update user settings (notifications, theme, etc.)
 */
router.patch('/me/settings', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    const settings = req.body;
    
    await adminDb.collection('users').doc(uid).update({
      settings,
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    res.status(200).json({
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({
      error: 'InternalError',
      message: 'Failed to update settings',
    });
  }
});

/**
 * GET /api/v1/users/me/stats
 * Get user statistics (transactions count, budget adherence, etc.)
 */
router.get('/me/stats', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { uid } = req.user!;
    
    // Fetch transaction count
    const transactionsSnapshot = await adminDb
      .collection('users')
      .doc(uid)
      .collection('transactions')
      .count()
      .get();
    
    // Fetch account count
    const accountsSnapshot = await adminDb
      .collection('users')
      .doc(uid)
      .collection('accounts')
      .count()
      .get();
    
    // Fetch budget
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.data();
    
    res.status(200).json({
      transactionCount: transactionsSnapshot.data().count,
      accountCount: accountsSnapshot.data().count,
      hasBudget: !!userData?.budget,
      onboarded: userData?.profile?.onboarded || false,
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({
      error: 'InternalError',
      message: 'Failed to fetch stats',
    });
  }
});

export default router;
