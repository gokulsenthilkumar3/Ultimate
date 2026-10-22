'use client'
import { useEffect, useRef, useState } from 'react'
import { StockPrice } from '@/types/stock'
import { formatVolume, formatINR } from '@/lib/formatters'

interface Props { stock: StockPrice }

export function PriceRow({ stock }: Props) {
  const prevLtp = useRef(stock.ltp)
  const [flashClass, setFlashClass] = useState('')

  useEffect(() => {
    if (stock.ltp === prevLtp.current) return
    const cls = stock.ltp > prevLtp.current ? 'flash-gain' : 'flash-loss'
    setFlashClass(cls)
    prevLtp.current = stock.ltp
    const t = setTimeout(() => setFlashClass(''), 650)
    return () => clearTimeout(t)
  }, [stock.ltp])

  const changePositive = stock.change >= 0

  return (
    <tr className={`transition-colors hover:bg-gray-900/60 ${flashClass}`}>
      <td className="px-4 py-3 font-mono font-semibold text-white">{stock.symbol}</td>
      <td className="px-4 py-3 font-mono">{formatINR(stock.ltp)}</td>
      <td className={`px-4 py-3 font-mono ${changePositive ? 'text-green-400' : 'text-red-400'}`}>
        {changePositive ? '+' : ''}{formatINR(stock.change)}
      </td>
      <td className={`px-4 py-3 font-mono ${changePositive ? 'text-green-400' : 'text-red-400'}`}>
        {changePositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
      </td>
      <td className="px-4 py-3 font-mono text-gray-300">{formatINR(stock.open)}</td>
      <td className="px-4 py-3 font-mono text-gray-300">{formatINR(stock.high)}</td>
      <td className="px-4 py-3 font-mono text-gray-300">{formatINR(stock.low)}</td>
      <td className="px-4 py-3 font-mono text-gray-400">{formatVolume(stock.volume)}</td>
    </tr>
  )
}
