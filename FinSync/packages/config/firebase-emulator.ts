/**
 * Firebase Emulator Connection Helper
 * Automatically connects to local emulators in development mode
 */

import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Emulator configuration
const EMULATOR_CONFIG = {
  auth: { host: 'localhost', port: 9099 },
  firestore: { host: 'localhost', port: 8080 },
  database: { host: 'localhost', port: 9000 },
  storage: { host: 'localhost', port: 9199 },
  functions: { host: 'localhost', port: 5001 },
};

// Track if emulators are already connected
let emulatorsConnected = false;

/**
 * Connect to Firebase emulators for local development
 * Call this once during app initialization
 */
export function connectToEmulators(firebaseApp: any): void {
  // Only connect in development and only once
  if (emulatorsConnected || process.env.NODE_ENV !== 'development') {
    return;
  }

  // Check if we should use emulators
  const useEmulators = 
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' ||
    process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true' ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost');

  if (!useEmulators) {
    console.log('🔥 Using production Firebase');
    return;
  }

  try {
    console.log('🔥 Connecting to Firebase Emulators...');

    // Auth Emulator
    const auth = getAuth(firebaseApp);
    connectAuthEmulator(auth, `http://${EMULATOR_CONFIG.auth.host}:${EMULATOR_CONFIG.auth.port}`, {
      disableWarnings: true,
    });
    console.log('✅ Auth Emulator connected');

    // Firestore Emulator
    const firestore = getFirestore(firebaseApp);
    connectFirestoreEmulator(firestore, EMULATOR_CONFIG.firestore.host, EMULATOR_CONFIG.firestore.port);
    console.log('✅ Firestore Emulator connected');

    // Realtime Database Emulator
    const database = getDatabase(firebaseApp);
    connectDatabaseEmulator(database, EMULATOR_CONFIG.database.host, EMULATOR_CONFIG.database.port);
    console.log('✅ Realtime Database Emulator connected');

    // Storage Emulator
    const storage = getStorage(firebaseApp);
    connectStorageEmulator(storage, EMULATOR_CONFIG.storage.host, EMULATOR_CONFIG.storage.port);
    console.log('✅ Storage Emulator connected');

    // Functions Emulator
    const functions = getFunctions(firebaseApp);
    connectFunctionsEmulator(functions, EMULATOR_CONFIG.functions.host, EMULATOR_CONFIG.functions.port);
    console.log('✅ Functions Emulator connected');

    emulatorsConnected = true;
    console.log('🎉 All Firebase Emulators connected successfully!');
  } catch (error) {
    console.error('❌ Error connecting to Firebase Emulators:', error);
    console.log('Make sure emulators are running: firebase emulators:start');
  }
}

/**
 * Check if emulators are currently connected
 */
export function areEmulatorsConnected(): boolean {
  return emulatorsConnected;
}

/**
 * Get emulator UI URL
 */
export function getEmulatorUIUrl(): string {
  return 'http://localhost:4000';
}

/**
 * Get emulator endpoint for a specific service
 */
export function getEmulatorEndpoint(service: keyof typeof EMULATOR_CONFIG): string {
  const config = EMULATOR_CONFIG[service];
  return `http://${config.host}:${config.port}`;
}
