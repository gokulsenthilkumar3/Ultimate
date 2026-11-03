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
4. Review the checked-in [`firestore.rules`](firestore.rules), then publish that
   exact file through the Firebase Console when ready to deploy database rules.
   [`firebase.json`](firebase.json) points the Firebase CLI to the same file.

The rules allow public reads of `price_cache` and reserve its writes for the
Admin SDK pipeline. Watchlists, holdings and alerts require the authenticated
owner and their documented field types. Clients can create and delete alerts;
only the Admin SDK pipeline can mark them as triggered.
Holding quantities, average prices and alert thresholds have a maximum of
1,000,000,000,000, which also rejects infinite values. Holding and alert symbols
must contain between 1 and 128 characters.

These are the current Firestore collections. The historical `supabase/migrations`
folder remains available for legacy SQL consumers, including the prices BFF.
Replay its migrations in numeric order on a separate Supabase installation; SQL
migrations do not update Firestore rules or documents. Review and resolve any
existing invalid records before applying integrity constraints.

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
