/**
 * Firebase Authentication Helpers
 * Handles email/password, OAuth, and MFA flows
 */

import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  User,
  UserCredential,
  MultiFactorResolver,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  getAuth,
} from 'firebase/auth';

export interface AuthResult {
  user?: User;
  mfaRequired?: boolean;
  mfaResolver?: MultiFactorResolver;
  error?: string;
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(auth: any): Promise<AuthResult> {
  try {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.warn('Mock: Using anonymous sign-in for local Google auth dev');
      const result = await signInAnonymously(auth);
      await updateProfile(result.user, { displayName: 'Google Tester' });
      return { user: result.user };
    }

    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/gmail.readonly');

    const result: UserCredential = await signInWithPopup(auth, provider);
    return { user: result.user };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    return { error: error.message || 'Google sign-in failed' };
  }
}

/**
 * Sign in with Microsoft OAuth (for work/school emails)
 */
export async function signInWithMicrosoft(auth: any): Promise<AuthResult> {
  try {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.warn('Mock: Using anonymous sign-in for local Microsoft auth dev');
      const result = await signInAnonymously(auth);
      await updateProfile(result.user, { displayName: 'Microsoft Tester' });
      return { user: result.user };
    }

    const provider = new OAuthProvider('microsoft.com');
    provider.addScope('Mail.Read');
    provider.addScope('offline_access');

    const result: UserCredential = await signInWithPopup(auth, provider);
    return { user: result.user };
  } catch (error: any) {
    console.error('Microsoft sign-in error:', error);
    return { error: error.message || 'Microsoft sign-in failed' };
  }
}

/**
 * Sign in with email and password
 * Returns MFA resolver if MFA is required
 */
export async function signInWithEmail(
  auth: any,
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const result: UserCredential = await signInWithEmailAndPassword(auth, email, password);

    // Check if MFA is enrolled
    if (result.user.multiFactor?.enrolledFactors && result.user.multiFactor.enrolledFactors.length > 0) {
      return { user: result.user, mfaRequired: false }; // MFA verification happens after successful login
    }

    return { user: result.user };
  } catch (error: any) {
    // Check if error is due to MFA requirement
    if (error.code === 'auth/multi-factor-auth-required') {
      return {
        mfaRequired: true,
        mfaResolver: error.resolver as MultiFactorResolver,
      };
    }

    // MOCK LOGIN FOR LOCAL DEVELOPMENT WHEN EMULATORS ARE OFFLINE OR KEYS INVALID
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.warn('Mock: Using anonymous sign-in for local email auth dev. Error was:', error.message);
      try {
        const anonResult = await signInAnonymously(auth);
        await updateProfile(anonResult.user, { displayName: email.split('@')[0] });
        return { user: anonResult.user };
      } catch (anonErr: any) {
        return { error: 'Firebase not configured. Set up .env.local with real Firebase keys.' };
      }
    }

    console.error('Email sign-in error:', error);

    // User-friendly error messages
    const errorMessages: { [key: string]: string } = {
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/invalid-email': 'Invalid email address',
      'auth/user-disabled': 'This account has been disabled',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later',
    };

    return { error: errorMessages[error.code] || 'Sign-in failed. Please try again' };
  }
}

/**
 * Register new user with email and password
 */
export async function registerWithEmail(
  auth: any,
  email: string,
  password: string,
  sendVerification: boolean = true
): Promise<AuthResult> {
  try {
    const result: UserCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Send email verification
    if (sendVerification && result.user) {
      await sendEmailVerification(result.user);
    }

    return { user: result.user };
  } catch (error: any) {
    // MOCK REGISTRATION FOR LOCAL DEVELOPMENT
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.warn('Mock: Using anonymous sign-in for local email registration. Error was:', error.message);
      try {
        const anonResult = await signInAnonymously(auth);
        await updateProfile(anonResult.user, { displayName: email.split('@')[0] });
        return { user: anonResult.user };
      } catch (anonErr: any) {
        return { error: 'Firebase not configured. Set up .env.local with real Firebase keys.' };
      }
    }

    console.error('Registration error:', error);

    const errorMessages: { [key: string]: string } = {
      'auth/email-already-in-use': 'An account with this email already exists',
      'auth/invalid-email': 'Invalid email address',
      'auth/weak-password': 'Password is too weak. Use at least 8 characters',
    };

    return { error: errorMessages[error.code] || 'Registration failed. Please try again' };
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(auth: any, email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    console.error('Password reset error:', error);

    const errorMessages: { [key: string]: string } = {
      'auth/user-not-found': 'No account found with this email',
      'auth/invalid-email': 'Invalid email address',
    };

    return { success: false, error: errorMessages[error.code] || 'Failed to send reset email' };
  }
}

/**
 * Sign out current user
 */
export async function signOut(auth: any): Promise<{ success: boolean; error?: string }> {
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Sign-out error:', error);
    return { success: false, error: 'Failed to sign out' };
  }
}

/**
 * Verify MFA code (SMS/TOTP)
 * This is a simplified version - full MFA implementation would use PhoneMultiFactorGenerator
 */
export async function verifyMFACode(
  resolver: MultiFactorResolver,
  verificationCode: string,
  verificationId: string
): Promise<AuthResult> {
  try {
    // Get the phone credential
    const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
    const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);

    // Complete sign-in with MFA
    const result = await resolver.resolveSignIn(multiFactorAssertion);
    return { user: result.user };
  } catch (error: any) {
    console.error('MFA verification error:', error);

    const errorMessages: { [key: string]: string } = {
      'auth/invalid-verification-code': 'Invalid verification code',
      'auth/code-expired': 'Verification code has expired',
    };

    return { error: errorMessages[error.code] || 'MFA verification failed' };
  }
}

/**
 * Check if user's email is verified
 */
export function isEmailVerified(user: User | null): boolean {
  return user?.emailVerified ?? false;
}

/**
 * Get user display name or email
 */
export function getUserDisplayName(user: User | null): string {
  if (!user) return 'Guest';
  return user.displayName || user.email || 'User';
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }

  return { valid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
