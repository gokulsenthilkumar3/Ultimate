# Firebase Setup Guide for FinSync Super

**Last Updated**: November 1, 2025  
**Estimated Setup Time**: 30-45 minutes

---

## Overview

Firebase will serve as the backbone for:
- **Authentication**: Multi-factor auth, biometrics, OAuth
- **Database**: Firestore (transactions) + Realtime DB (live balances)
- **Functions**: Serverless backend (SMS parsing, AI categorization)
- **Hosting**: Web app deployment
- **Analytics**: User behavior tracking
- **Cloud Storage**: Document/receipt storage

---

## Prerequisites

- Google account (for Firebase Console access)
- Node.js 22.0+ installed
- npm/yarn package manager
- Firebase CLI installed globally

```bash
npm install -g firebase-tools
```

---

## Part 1: Firebase Console Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. **Project name**: `finsync-super`
4. **Google Analytics**: Enable (recommended for tracking user flows)
5. **Analytics account**: Create new or use existing
6. Click **"Create project"** (takes ~30 seconds)

### Step 2: Configure Billing (Required for Cloud Functions)

1. In Firebase Console, click ⚙️ (Settings) → **"Usage and billing"**
2. Click **"Modify plan"** → Select **"Blaze (Pay as you go)"**
3. Set up payment method (Google Cloud Billing)
4. **IMPORTANT**: Set budget alerts to avoid surprises
   - Go to Google Cloud Console → Billing → Budgets & alerts
   - Set budget: $50/month for MVP phase
   - Alert thresholds: 50%, 75%, 90%, 100%

**Free Tier Limits (Always Free):**
- Firestore: 50K reads, 20K writes, 1GB storage per day
- Functions: 2M invocations, 400K GB-seconds per month
- Hosting: 10GB storage, 360MB/day bandwidth
- Realtime DB: 1GB storage, 10GB/month bandwidth

---

## Part 2: Enable Firebase Services

### Step 3: Enable Authentication

1. In Firebase Console → **"Authentication"**
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Enable the following providers:

**Email/Password:**
- Click Email/Password → Toggle **"Enable"** → Save
- Enable **"Email link (passwordless sign-in)"** for magic links

**Google:**
- Click Google → Toggle **"Enable"**
- Public-facing name: `FinSync Super`
- Support email: your-email@example.com → Save

**Microsoft (for work/school emails):**
- Click Microsoft → Toggle **"Enable"**
- Application (client) ID: [Get from Azure AD - see below]
- Application (client) secret: [From Azure AD]

**Phone (for OTP):**
- Click Phone → Toggle **"Enable"**
- Test phone numbers (for development):
  - +91 9876543210 → Code: 123456

### Step 4: Configure Advanced Auth Settings

1. Go to **"Settings"** tab in Authentication
2. **Authorized domains**: Add your domains
   - `localhost` (auto-added)
   - `finsync-super.vercel.app` (add later after deploying)
   - `finsync-super.firebaseapp.com`

3. **User account management**:
   - Email enumeration protection: **Enable** (security best practice)
   - One account per email: **Enable**

4. **Multi-factor authentication**:
   - Click **"Upgrade"** (requires Blaze plan)
   - Enable SMS second factor
   - Enable TOTP (Time-based One-Time Password)

---

### Step 5: Enable Firestore Database

1. In Firebase Console → **"Firestore Database"**
2. Click **"Create database"**
3. **Security rules**: Start in **"Production mode"** (we'll customize later)
4. **Location**: Choose closest to target users
   - For India: `asia-south1 (Mumbai)`
   - For global: `us-central1 (Iowa)`
5. Click **"Enable"**

**Initial Security Rules** (update after testing):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User data - only authenticated users can read/write their own
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Subcollections inherit parent permissions
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Public data (e.g., app config)
    match /config/{document} {
      allow read: if true;
      allow write: if false; // Only via admin SDK
    }
  }
}
```

**Set up indexes** (for complex queries):
- Go to Firestore → **"Indexes"** tab
- Composite indexes will be created on-demand when you run queries
- Example: Transactions by category + date (descending)

---

### Step 6: Enable Realtime Database

1. In Firebase Console → **"Realtime Database"**
2. Click **"Create Database"**
3. **Location**: Same as Firestore (`asia-south1`)
4. **Security rules**: Start in **"Locked mode"**
5. Click **"Enable"**

**Security Rules**:
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        "balances": {
          ".validate": "newData.hasChildren(['savings', 'checking', 'lastUpdated'])"
        }
      }
    }
  }
}
```

---

### Step 7: Enable Cloud Functions

1. In Firebase Console → **"Functions"**
2. Click **"Get started"** → Automatically enabled with Blaze plan
3. **Runtime**: Node.js 20 (will upgrade to 22 in code)
4. **Region**: Same as Firestore (`asia-south1`)

We'll deploy functions via CLI later.

---

### Step 8: Enable Cloud Storage

1. In Firebase Console → **"Storage"**
2. Click **"Get started"**
3. **Security rules**: Start in **"Production mode"**
4. **Location**: Same as Firestore
5. Click **"Done"**

**Security Rules** (for receipts/documents):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

### Step 9: Enable Analytics

1. In Firebase Console → **"Analytics"**
2. Should be auto-enabled (if selected during project creation)
3. Go to **"Events"** → Review default events:
   - `first_open`, `session_start`, `screen_view`
4. Custom events we'll track:
   - `transaction_parsed`, `budget_created`, `sync_completed`

---

## Part 3: Local Development Setup

### Step 10: Install Firebase CLI & Login

```bash
# Install CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Verify login
firebase projects:list
```

You should see `finsync-super` in the project list.

---

### Step 11: Initialize Firebase in Project

Navigate to your project root:

```bash
cd C:\Users\gokul\CascadeProjects\FinSync-Super
```

Initialize Firebase:

```bash
firebase init
```

**Interactive Prompts:**
1. **Which Firebase features?** (Use spacebar to select)
   - [x] Firestore
   - [x] Functions
   - [x] Hosting
   - [x] Storage
   - [x] Emulators

2. **Select a default Firebase project**: `finsync-super`

3. **Firestore Setup:**
   - Rules file: `firestore.rules` (default)
   - Indexes file: `firestore.indexes.json` (default)

4. **Functions Setup:**
   - Language: **TypeScript**
   - ESLint: **Yes**
   - Install dependencies: **Yes**
   - Directory: `functions` (default)

5. **Hosting Setup:**
   - Public directory: `apps/web/out` (Next.js export)
   - Single-page app: **Yes**
   - Set up automatic builds: **No** (we'll use Vercel for web)

6. **Storage Setup:**
   - Rules file: `storage.rules` (default)

7. **Emulators Setup:** (Select all for local dev)
   - [x] Authentication Emulator
   - [x] Functions Emulator
   - [x] Firestore Emulator
   - [x] Storage Emulator
   - Ports: Use defaults (9099, 5001, 8080, 9199)
   - Download emulators: **Yes**

---

### Step 12: Configure Firebase in Web App

Create Firebase config file:

**apps/web/lib/firebase.ts:**
```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase configuration (from Console → Project Settings → General)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'asia-south1'); // Match region

// Enable offline persistence (mobile-like behavior on web)
import { enableIndexedDbPersistence } from 'firebase/firestore';
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence enabled in first tab only');
    } else if (err.code === 'unimplemented') {
      console.warn('Browser doesn\'t support offline persistence');
    }
  });
}

export default app;
```

---

### Step 13: Get Firebase Config Values

1. In Firebase Console → ⚙️ Settings → **"Project settings"**
2. Scroll to **"Your apps"** → Click **"Web"** icon (</>) to add web app
3. **App nickname**: `FinSync Web`
4. **Firebase Hosting**: Check if deploying to Firebase (optional for us, using Vercel)
5. Click **"Register app"**
6. Copy the `firebaseConfig` object values

**Create `.env.local` in `apps/web/`:**
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=finsync-super.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=finsync-super
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=finsync-super.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://finsync-super-default-rtdb.asia-south1.firebasedatabase.app

# Environment
NODE_ENV=development
```

**⚠️ IMPORTANT**: Add `.env.local` to `.gitignore`!

---

### Step 14: Configure Firebase in Mobile App

**apps/mobile/config/firebase.ts:**
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  // Same config as web
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);

// Use AsyncStorage for auth persistence (mobile-specific)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export const realtimeDb = getDatabase(app);
export const storage = getStorage(app);

export default app;
```

---

## Part 4: Testing Setup with Emulators

### Step 15: Start Firebase Emulators

```bash
# From project root
firebase emulators:start
```

**Emulator UI**: http://localhost:4000

**Advantages:**
- No costs during development
- Instant data resets
- No internet required
- Faster iteration

**Connect web/mobile apps to emulators:**

```typescript
// apps/web/lib/firebase.ts (add in development)
if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectDatabaseEmulator(realtimeDb, 'localhost', 9000);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

---

## Part 5: Deploy First Cloud Function (Test)

### Step 16: Create Hello World Function

**functions/src/index.ts:**
```typescript
import * as functions from 'firebase-functions';

export const helloWorld = functions.https.onRequest((request, response) => {
  response.send('Hello from FinSync Super! 🚀');
});

// Transaction parsing webhook (placeholder)
export const parseSMS = functions.https.onRequest(async (req, res) => {
  const { body } = req.body;
  // TODO: Integrate OpenAI for parsing
  res.json({ status: 'pending', message: body });
});
```

### Step 17: Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:helloWorld
```

**Test the deployed function:**
- URL: `https://asia-south1-finsync-super.cloudfunctions.net/helloWorld`
- Open in browser or use Postman

---

## Part 6: Security Best Practices

### Step 18: Secure Your Firebase Project

**1. API Key Restrictions:**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- APIs & Services → Credentials
- Find your API key (auto-created by Firebase)
- Click Edit → Application restrictions:
  - HTTP referrers: `https://finsync-super.vercel.app/*`
  - API restrictions: Select Firebase services only

**2. App Check (DDoS protection):**
- Firebase Console → App Check
- Enable for Web/iOS/Android
- Use reCAPTCHA v3 for web
- Use DeviceCheck/Play Integrity for mobile

**3. Audit Logs:**
- Google Cloud Console → Logging
- Set up alerts for suspicious auth attempts
- Monitor function invocations

**4. Secrets Management:**
- Never commit API keys to Git
- Use Firebase Functions config for serverless:
  ```bash
  firebase functions:config:set openai.key="sk-..."
  firebase functions:config:set plaid.secret="..."
  ```

---

## Part 7: Monitoring & Alerts

### Step 19: Set Up Monitoring

**Firebase Console:**
1. Performance Monitoring:
   - Add Firebase Performance SDK to web/mobile
   - Track page load times, API latencies

2. Crashlytics (Mobile):
   - Integrate Crashlytics SDK
   - Get real-time crash reports

**Google Cloud Monitoring:**
- Set alerts for:
  - Function execution errors >1%
  - Database read/write limits approaching
  - Storage quota >80%

---

## Estimated Costs (Monthly)

### MVP Phase (0-1K users)
- **Firestore**: ~$5 (within free tier for reads/writes, minimal storage)
- **Functions**: ~$3 (occasional OpenAI calls, within 2M invocations)
- **Storage**: ~$1 (receipts/documents)
- **Bandwidth**: ~$1
- **Total**: ~$10/month

### Growth Phase (1K-10K users)
- **Firestore**: ~$30 (increased reads for dashboards)
- **Functions**: ~$15 (frequent AI parsing)
- **Storage**: ~$5
- **Total**: ~$50/month

---

## Troubleshooting

**Issue**: `FirebaseError: Missing or insufficient permissions`
- **Fix**: Check Firestore security rules, ensure user is authenticated

**Issue**: Functions deployment fails
- **Fix**: Ensure Blaze plan is active, check `firebase.json` configuration

**Issue**: Emulator won't start
- **Fix**: Kill processes on ports 4000, 5001, 8080, 9099:
  ```bash
  npx kill-port 4000 5001 8080 9099
  ```

---

## Next Steps

- [x] Firebase project created and configured
- [ ] Install dependencies in web/mobile apps
- [ ] Test authentication flow with emulators
- [ ] Create initial Firestore data structure
- [ ] Deploy first Cloud Function
- [ ] Set up CI/CD with Firebase Hosting

---

## Useful Commands Reference

```bash
# Login/logout
firebase login
firebase logout

# List projects
firebase projects:list

# Switch project
firebase use finsync-super

# Start emulators
firebase emulators:start
firebase emulators:exec --only firestore "npm test"

# Deploy
firebase deploy                      # Everything
firebase deploy --only hosting       # Hosting only
firebase deploy --only functions     # Functions only
firebase deploy --only firestore:rules  # Rules only

# View logs
firebase functions:log
firebase functions:log --only helloWorld

# Config management
firebase functions:config:set key="value"
firebase functions:config:get
firebase functions:config:unset key
```

---

**Setup Complete!** 🎉

Your Firebase backend is now ready for FinSync Super. Proceed to integrate with Next.js/React Native apps.

**Document Owner**: DevOps Lead  
**Last Updated**: November 1, 2025
