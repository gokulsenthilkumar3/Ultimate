import { createBrowserClient } from '@supabase/ssr'

// Browser Supabase client — use this everywhere in client components
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Keep the standalone UI renderable before an external Supabase project is
// configured. API callers receive a normal unavailable-data response.
export const supabase: any = url && key
  ? createBrowserClient(url, key)
  : { from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: null, error: { message: 'Supabase is not configured locally.' } }) }) }) }) }
