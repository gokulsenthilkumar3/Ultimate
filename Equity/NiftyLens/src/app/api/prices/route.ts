import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// BFF proxy — fetches from price_cache and returns JSON
export async function GET() {
  const { data, error } = await supabase
    .from('price_cache')
    .select('symbol, ltp, open, high, low, volume, updated_at')
    .order('symbol')
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
