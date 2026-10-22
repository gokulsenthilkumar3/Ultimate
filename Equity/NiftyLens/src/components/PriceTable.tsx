'use client'
import { useLivePrices } from '@/hooks/useLivePrices'
import { PriceRow } from '@/components/PriceRow'
import { PriceTableSkeleton } from '@/components/PriceTableSkeleton'

const COLUMNS = ['Symbol', 'LTP', 'Change', 'Change %', 'Open', 'High', 'Low', 'Volume']

export function PriceTable() {
  const { prices, loading, error } = useLivePrices()

  if (loading) return <PriceTableSkeleton />
  if (error) return <p className="text-red-400 text-sm">⚠ {error}</p>

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900">
            {COLUMNS.map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {prices.map((stock) => (
            <PriceRow key={stock.symbol} stock={stock} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
