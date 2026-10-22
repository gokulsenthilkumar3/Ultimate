'use client'
import { useEffect, useState } from 'react'
import { StockPrice } from '@/types/stock'
import { subscribeToPriceCache } from '@/lib/firestore'
import { firebaseConfigured } from '@/lib/firebase'

export function useLivePrices() {
  const [prices, setPrices] = useState<StockPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseConfigured) { setLoading(false); setError('Live market data is not configured locally.'); return undefined }
    const unsubscribe = subscribeToPriceCache((incoming) => {
      setPrices(incoming)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return { prices, loading, error }
}
