import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, isSupported } from 'firebase/analytics'

const rawApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
const apiKey = rawApiKey?.trim()
const firebaseConfigured = Boolean(apiKey && apiKey.length > 20 && !/mock|example|placeholder|disabled/i.test(apiKey))
export { firebaseConfigured }
const firebaseConfig = {
  apiKey: apiKey || 'disabled',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Prevent duplicate app initialization in Next.js dev (HMR)
const app = firebaseConfigured ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]) : null

export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null

// Analytics only runs in browser
export const analyticsPromise =
  typeof window !== 'undefined'
    ? isSupported().then((yes) => (yes && app ? getAnalytics(app) : null))
    : Promise.resolve(null)

export default app
