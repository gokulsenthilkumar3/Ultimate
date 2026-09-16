#!/usr/bin/env node

/**
 * Firebase Setup Verification Script
 * Checks if Firebase is properly configured for local development
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

const log = {
  success: (msg) => console.log(`${COLORS.green}✅ ${msg}${COLORS.reset}`),
  error: (msg) => console.log(`${COLORS.red}❌ ${msg}${COLORS.reset}`),
  warning: (msg) => console.log(`${COLORS.yellow}⚠️  ${msg}${COLORS.reset}`),
  info: (msg) => console.log(`${COLORS.blue}ℹ️  ${msg}${COLORS.reset}`),
};

console.log('\n🔥 Firebase Setup Verification\n');

let hasErrors = false;
let hasWarnings = false;

// Check 1: Firebase CLI installed
try {
  const { execSync } = require('child_process');
  const version = execSync('firebase --version', { encoding: 'utf-8' }).trim();
  log.success(`Firebase CLI installed (${version})`);
} catch (error) {
  log.error('Firebase CLI not installed');
  log.info('Install with: npm install -g firebase-tools');
  hasErrors = true;
}

// Check 2: firebase.json exists
if (fs.existsSync('firebase.json')) {
  log.success('firebase.json exists');
  
  // Validate firebase.json structure
  try {
    const config = JSON.parse(fs.readFileSync('firebase.json', 'utf-8'));
    if (config.emulators) {
      log.success('Emulator configuration found');
      console.log('   Emulator UI: http://localhost:' + config.emulators.ui.port);
      console.log('   Firestore: http://localhost:' + config.emulators.firestore.port);
      console.log('   Functions: http://localhost:' + config.emulators.functions.port);
    } else {
      log.warning('Emulator configuration missing in firebase.json');
      hasWarnings = true;
    }
  } catch (error) {
    log.error('Invalid firebase.json format');
    hasErrors = true;
  }
} else {
  log.error('firebase.json not found');
  log.info('Run: firebase init');
  hasErrors = true;
}

// Check 3: .firebaserc exists
if (fs.existsSync('.firebaserc')) {
  log.success('.firebaserc exists');
  
  try {
    const config = JSON.parse(fs.readFileSync('.firebaserc', 'utf-8'));
    if (config.projects && config.projects.default) {
      log.info(`Default project: ${config.projects.default}`);
    } else {
      log.warning('No default project configured');
      hasWarnings = true;
    }
  } catch (error) {
    log.error('Invalid .firebaserc format');
    hasErrors = true;
  }
} else {
  log.error('.firebaserc not found');
  log.info('Run: firebase init');
  hasErrors = true;
}

// Check 4: Firestore rules
if (fs.existsSync('firestore.rules')) {
  log.success('Firestore security rules exist');
} else {
  log.warning('firestore.rules not found');
  hasWarnings = true;
}

// Check 5: Firestore indexes
if (fs.existsSync('firestore.indexes.json')) {
  log.success('Firestore indexes configuration exists');
} else {
  log.warning('firestore.indexes.json not found');
  hasWarnings = true;
}

// Check 6: Storage rules
if (fs.existsSync('storage.rules')) {
  log.success('Storage security rules exist');
} else {
  log.warning('storage.rules not found');
  hasWarnings = true;
}

// Check 7: Environment variables
const envFiles = ['.env', '.env.local', '.env.development'];
let envFileFound = false;

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    envFileFound = true;
    log.success(`Environment file found: ${envFile}`);
    
    // Check for required Firebase variables
    const content = fs.readFileSync(envFile, 'utf-8');
    const requiredVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    ];
    
    const missingVars = requiredVars.filter(v => !content.includes(v));
    if (missingVars.length > 0) {
      log.warning(`Missing Firebase variables: ${missingVars.join(', ')}`);
      hasWarnings = true;
    } else {
      log.success('All required Firebase environment variables present');
    }
    break;
  }
}

if (!envFileFound) {
  log.warning('No environment file found (.env, .env.local, .env.development)');
  log.info('Copy .env.example to .env.local and fill in your Firebase config');
  hasWarnings = true;
}

// Check 8: Functions directory
if (fs.existsSync('functions')) {
  log.success('Firebase Functions directory exists');
  
  if (fs.existsSync('functions/package.json')) {
    log.success('Functions package.json exists');
  } else {
    log.warning('functions/package.json not found');
    hasWarnings = true;
  }
} else {
  log.warning('functions/ directory not found');
  log.info('Firebase Functions not initialized yet');
  hasWarnings = true;
}

// Check 9: Firebase packages in package.json
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  
  if (allDeps['firebase']) {
    log.success('Firebase SDK installed');
  } else {
    log.warning('Firebase SDK not installed');
    log.info('Run: npm install firebase');
    hasWarnings = true;
  }
  
  if (allDeps['firebase-admin']) {
    log.success('Firebase Admin SDK installed');
  } else {
    log.info('Firebase Admin SDK not installed (optional for client apps)');
  }
}

// Check 10: Emulator data directory
if (fs.existsSync('emulator-data')) {
  log.info('Emulator data directory exists (persisted data)');
} else {
  log.info('No emulator data directory (will be created on first run with --export-on-exit)');
}

// Summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  log.error('Setup has errors - please fix them before proceeding');
  process.exit(1);
} else if (hasWarnings) {
  log.warning('Setup has warnings - everything should work but some features may be missing');
  console.log('\n✨ You can start Firebase emulators with:');
  console.log('   npm run firebase:emulators\n');
  process.exit(0);
} else {
  log.success('Firebase setup looks good!');
  console.log('\n✨ You can start Firebase emulators with:');
  console.log('   npm run firebase:emulators');
  console.log('\n✨ Or start the full stack with:');
  console.log('   npm run dev:full\n');
  process.exit(0);
}
