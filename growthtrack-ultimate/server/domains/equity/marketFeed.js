/** Native Equity's public price-cache adapter. Never reads portfolios or uses admin keys. */
export class MarketFeedError extends Error {
  constructor(message, status = 503, code = 'MARKET_FEED_UNAVAILABLE') { super(message); this.status = status; this.code = code; }
}

const configured = value => typeof value === 'string' && value.length > 5 && !/placeholder|example|disabled|mock/i.test(value);
const number = value => value === null || value === undefined || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
export function normalizeQuote(row) {
  const ltp = number(row.ltp), open = number(row.open);
  if (typeof row.symbol !== 'string' || !row.symbol.trim() || ltp === null || ltp < 0) return null;
  const change = open && open > 0 ? ltp - open : null;
  const timestamp = row.updated_at ?? row.updatedAt;
  return { symbol: row.symbol.slice(0, 80), ltp, open, high: number(row.high), low: number(row.low), volume: number(row.volume), change, changePercent: change === null ? null : change / open * 100, updatedAt: timestamp && Number.isFinite(Date.parse(timestamp)) ? new Date(timestamp).toISOString() : null };
}

function firestoreValue(value) {
  if (!value) return null;
  return value.stringValue ?? value.doubleValue ?? value.integerValue ?? value.timestampValue ?? null;
}

export function createMarketFeed({ environment = {}, fetchImpl = fetch, now = Date.now } = {}) {
  let cache = null, pending = null;
  const env = environment;
  async function load() {
    const supabase = env.NEXT_PUBLIC_SUPABASE_URL, anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const project = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;
    let url, headers = {}, provider;
    if (configured(supabase) && configured(anon)) {
      const base = new URL(supabase);
      if (base.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(base.hostname)) throw new MarketFeedError('Market provider URL is invalid.');
      url = new URL('/rest/v1/price_cache?select=symbol,ltp,open,high,low,volume,updated_at&order=symbol&limit=200', base);
      headers = { apikey: anon, Authorization: `Bearer ${anon}` }; provider = 'NiftyLens · Supabase price cache';
    } else if (configured(project) && configured(apiKey) && /^[a-z0-9-]+$/i.test(project)) {
      url = new URL(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/price_cache`);
      url.searchParams.set('pageSize', '200'); url.searchParams.set('key', apiKey);
      provider = 'NiftyLens · Firebase price cache';
    } else throw new MarketFeedError('Configure the NiftyLens public price-cache connection to load market quotes.', 503, 'MARKET_FEED_NOT_CONFIGURED');
    let response;
    try { response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(8000) }); }
    catch { throw new MarketFeedError('The market provider did not respond. Try again.'); }
    if (!response.ok) throw new MarketFeedError(response.status === 401 || response.status === 403 ? 'The market provider denied access. Review the price-cache read permissions.' : 'The market provider is unavailable. Try again.');
    const body = await response.json();
    const rows = Array.isArray(body) ? body : Array.isArray(body.documents) ? body.documents.map(doc => ({ symbol: doc.name?.split('/').at(-1), ...Object.fromEntries(Object.entries(doc.fields || {}).map(([key, value]) => [key, firestoreValue(value)])) })) : null;
    if (!rows) throw new MarketFeedError('The market provider returned an unexpected response.');
    const quotes = rows.slice(0, 200).map(normalizeQuote).filter(Boolean).sort((a, b) => a.symbol.localeCompare(b.symbol));
    if (rows.length && !quotes.length) throw new MarketFeedError('The market provider returned invalid quotes.');
    return { quotes, provider, fetchedAt: new Date(now()).toISOString(), refreshSeconds: 15, limit: 200, snapshot: true };
  }
  return async function prices() {
    if (cache && now() - cache.time < 10_000) return cache.data;
    if (!pending) pending = load().then(data => { cache = { data, time: now() }; return data; }).finally(() => { pending = null; });
    return pending;
  };
}
