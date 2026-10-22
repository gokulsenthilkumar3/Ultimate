'use client'
import { useMarketStatus } from '@/hooks/useMarketStatus'

export function MarketHeader() {
  const { isOpen, nextEvent } = useMarketStatus()

  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">NiftyLens 📈</h1>
        <p className="text-sm text-gray-400">Real-time NSE/BSE Dashboard</p>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`h-2 w-2 rounded-full ${
            isOpen ? 'bg-green-400 animate-pulse' : 'bg-red-400'
          }`}
        />
        <span className={isOpen ? 'text-green-400' : 'text-red-400'}>
          {isOpen ? 'Market Open' : 'Market Closed'}
        </span>
        {nextEvent && <span className="text-gray-500">· {nextEvent}</span>}
      </div>
    </header>
  )
}
