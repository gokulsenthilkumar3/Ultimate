# Firebase Setup Guide for NiftyLens

## 1. Frontend `.env.local`

Create `.env.local` in the root of the project:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAkSj0de46GqMZsxWfq-ARO3kF7XtVChaQ
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=niftylens-e75c5.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=niftylens-e75c5
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=niftylens-e75c5.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=609686963123
NEXT_PUBLIC_FIREBASE_APP_ID=1:609686963123:web:603e098900bf373059c1c6
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-6DPB6Y49LS
```

## 2. Enable Firebase Auth

1. Firebase Console → Authentication → Get Started
2. Enable **Email/Password** provider
3. (Optional later) Enable **Google** provider

## 3. Create Firestore Database

1. Firebase Console → Firestore Database → Create database
2. Choose **production mode**
3. Region: `asia-south1` (Mumbai — closest to you)
4. Paste these security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // price_cache — public read, no client writes
    match /price_cache/{symbol} {
      allow read: if true;
      allow write: if false;
    }

    // watchlists — only owner
    match /watchlists/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // portfolios — only owner
    match /portfolios/{uid}/holdings/{holdingId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // alerts — only owner
    match /alerts/{uid}/items/{alertId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## 4. Firebase Admin SDK (Python pipeline)

1. Firebase Console → Project Settings → Service Accounts
2. Click **Generate new private key** → downloads a JSON file
3. Minify the JSON to a single line and set it as:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` env var on Render

## 5. Run locally

```bash
npm install
npm run dev
```
