/**
 * Firestore helpers — replaces Supabase DB calls
 * Collections:
 *   price_cache/{symbol}   — written by Python pipeline via Admin SDK
 *   watchlists/{uid}       — user watchlist document
 *   portfolios/{uid}/holdings/{id} — portfolio entries
 *   alerts/{uid}/items/{id}        — price alerts
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { StockPrice } from '@/types/stock'

// ── Price cache (real-time listener) ───────────────────────────
export function subscribeToPriceCache(
  onUpdate: (prices: StockPrice[]) => void
): Unsubscribe {
  if (!db) return () => undefined
  const q = query(collection(db, 'price_cache'), orderBy('symbol'))
  return onSnapshot(q, (snapshot: any) => {
    const prices: StockPrice[] = snapshot.docs.map((d: any) => {
      const row = d.data()
      return {
        symbol: d.id,
        ltp: row.ltp,
        open: row.open,
        high: row.high,
        low: row.low,
        volume: row.volume,
        change: row.ltp - row.open,
        changePercent: ((row.ltp - row.open) / row.open) * 100,
        updatedAt: row.updated_at,
      }
    })
    onUpdate(prices)
  })
}

// ── Watchlist ────────────────────────────────────────────
export async function getWatchlist(uid: string): Promise<string[]> {
  if (!db) return []
  const snap = await getDoc(doc(db, 'watchlists', uid))
  return snap.exists() ? (snap.data().symbols as string[]) : []
}

export async function saveWatchlist(uid: string, symbols: string[]): Promise<void> {
  if (!db) return
  await setDoc(doc(db, 'watchlists', uid), { symbols, updatedAt: serverTimestamp() })
}

// ── Portfolio ───────────────────────────────────────────
export async function getPortfolio(uid: string) {
  if (!db) return []
  const snap = await getDocs(collection(db, 'portfolios', uid, 'holdings'))
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
}

export async function addHolding(uid: string, holding: {
  symbol: string
  qty: number
  avg_price: number
  buy_date: string
}) {
  if (!db) throw new Error('Firebase database is not configured.')
  return addDoc(collection(db, 'portfolios', uid, 'holdings'), {
    ...holding,
    createdAt: serverTimestamp(),
  })
}

export async function deleteHolding(uid: string, holdingId: string) {
  if (!db) throw new Error('Firebase database is not configured.')
  return deleteDoc(doc(db, 'portfolios', uid, 'holdings', holdingId))
}

// ── Alerts ───────────────────────────────────────────────
export async function getAlerts(uid: string) {
  if (!db) return []
  const snap = await getDocs(collection(db, 'alerts', uid, 'items'))
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
}

export async function addAlert(uid: string, alert: {
  symbol: string
  condition: 'above' | 'below'
  threshold: number
  channel: 'email' | 'telegram'
}) {
  if (!db) throw new Error('Firebase database is not configured.')
  return addDoc(collection(db, 'alerts', uid, 'items'), {
    ...alert,
    triggered_at: null,
    createdAt: serverTimestamp(),
  })
}

export async function deleteAlert(uid: string, alertId: string) {
  if (!db) throw new Error('Firebase database is not configured.')
  return deleteDoc(doc(db, 'alerts', uid, 'items', alertId))
}
