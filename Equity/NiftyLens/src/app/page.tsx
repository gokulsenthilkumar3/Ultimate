import { PriceTable } from '@/components/PriceTable'
import { MarketHeader } from '@/components/MarketHeader'

export default function Home() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <MarketHeader />
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-gray-300 mb-3">NSE Top 200 — Live Prices</h2>
        <PriceTable />
      </section>
    </main>
  )
}
