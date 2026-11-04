import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export function firebaseAdmin() {
  if (process.env.NODE_ENV === 'production' && (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST)) {
    throw new Error('Firebase emulators are not permitted in production.');
  }
  const name = 'finsync-server';
  const app = getApps().find(item => item.name === name) || initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  }, name);
  return { auth: getAuth(app), database: getFirestore(app) };
}
