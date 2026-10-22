export interface StockPrice {
  symbol: string
  ltp: number       // Last Traded Price
  open: number
  high: number
  low: number
  volume: number
  change: number
  changePercent: number
  updatedAt: string
}

export interface PriceCacheRow {
  symbol: string
  ltp: number
  open: number
  high: number
  low: number
  volume: number
  updated_at: string
}
