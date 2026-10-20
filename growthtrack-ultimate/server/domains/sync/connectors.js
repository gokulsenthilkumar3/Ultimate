import { domainError } from '../errors.js';
import { normalizeFeedUrl } from './safeFetch.js';
import { readCalendarFeed } from './icsFeed.js';
import { DEFAULT_CONFIG } from '../../config.js';

// Each connector pulls observations from one documented public API. Portfolio
// connectors return dated quotes keyed by holding id; they never invent a price
// or a date, and holdings they cannot match are reported, not changed.
const COINGECKO_IDS = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple', ADA: 'cardano',
  DOGE: 'dogecoin', DOT: 'polkadot', MATIC: 'matic-network', POL: 'polygon-ecosystem-token', LTC: 'litecoin', AVAX: 'avalanche-2',
  LINK: 'chainlink', TRX: 'tron', USDT: 'tether', USDC: 'usd-coin', SHIB: 'shiba-inu', TON: 'the-open-network', ATOM: 'cosmos' };

const hostOf = base => new URL(base).hostname;
const isoDay = date => date.toISOString().slice(0, 10);
const positivePrice = value => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number < 1e12 ? number : null;
};
const text = (value, max = 120) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export function mutualFundCode(holding) {
  const code = String(holding?.schemeCode ?? (holding?.type === 'Mutual Fund' ? holding?.symbol : '') ?? '').trim();
  return /^\d{3,7}$/.test(code) ? code : null;
}

export function coingeckoId(holding) {
  if (holding?.type !== 'Crypto') return null;
  const explicit = text(holding.coingeckoId, 80).toLowerCase();
  if (/^[a-z0-9-]{2,80}$/.test(explicit)) return explicit;
  return COINGECKO_IDS[String(holding.symbol || '').trim().toUpperCase()] || null;
}

export function stockSymbol(holding) {
  if (!['Stock', 'ETF'].includes(holding?.type)) return null;
  const symbol = String(holding.symbol || '').trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9.&_-]{0,31}$/.test(symbol) ? symbol : null;
}

const mfapi = sync => ({
  key: 'mfapi', target: 'portfolio', domain: 'finance', label: 'Mutual fund NAV',
  provider: 'mfapi.in', docsUrl: 'https://www.mfapi.in/',
  description: 'Daily NAV for Indian mutual funds. Set a holding’s type to Mutual Fund and its symbol to the AMFI scheme code.',
  autoSyncMinutes: sync.intervals.mfapi, fields: [],
  normalize: () => ({ config: {}, secret: null }),
  async quotes({ holdings, fetchJson }) {
    const quotes = new Map(); const unmatched = [];
    for (const holding of holdings) {
      const code = mutualFundCode(holding);
      if (!code) { if (holding.type === 'Mutual Fund') unmatched.push({ id: holding.id, name: holding.name, reason: 'Add the AMFI scheme code as the symbol.' }); continue; }
      if (quotes.size >= sync.perRun.mfapi) { unmatched.push({ id: holding.id, name: holding.name, reason: 'Run limit reached; the next sync continues.' }); continue; }
      try {
        const body = await fetchJson(`${sync.providers.mfapi}/mf/${code}/latest`, { allowHosts: [hostOf(sync.providers.mfapi)] });
        const latest = Array.isArray(body?.data) ? body.data[0] : null;
        const [day, month, year] = String(latest?.date || '').split('-');
        const date = /^\d{2}$/.test(day || '') && /^\d{2}$/.test(month || '') && /^\d{4}$/.test(year || '') ? `${year}-${month}-${day}` : null;
        const price = positivePrice(latest?.nav);
        if (!price || !date || !Number.isFinite(Date.parse(date))) { unmatched.push({ id: holding.id, name: holding.name, reason: `Scheme ${code} returned no NAV.` }); continue; }
        quotes.set(holding.id, { price, date, currency: 'INR', source: 'mfapi.in', reference: `AMFI ${code}`, label: text(body?.meta?.scheme_name, 160) });
      } catch (error) { unmatched.push({ id: holding.id, name: holding.name, reason: error.message }); }
    }
    return { quotes, unmatched };
  },
});

const coingecko = sync => ({
  key: 'coingecko', target: 'portfolio', domain: 'finance', label: 'Crypto prices',
  provider: 'CoinGecko', docsUrl: 'https://www.coingecko.com/en/api',
  description: 'Spot prices for Crypto holdings by symbol (BTC, ETH, SOL…) or an explicit CoinGecko id.',
  autoSyncMinutes: sync.intervals.coingecko,
  fields: [{ name: 'currency', label: 'Quote currency', type: 'text', placeholder: 'INR', help: 'Used for holdings without their own currency.' }],
  normalize(input) {
    const currency = text(input?.currency || 'INR', 10).toUpperCase();
    if (!/^[A-Z]{3,5}$/.test(currency)) throw domainError(400, 'INVALID_CONFIG', 'Use a currency code such as INR or USD.');
    return { config: { currency }, secret: null };
  },
  async quotes({ holdings, config, fetchJson }) {
    const quotes = new Map(); const unmatched = [];
    const groups = new Map();
    for (const holding of holdings) {
      if (holding.type !== 'Crypto') continue;
      const id = coingeckoId(holding);
      if (!id) { unmatched.push({ id: holding.id, name: holding.name, reason: 'Use a known symbol or set coingeckoId.' }); continue; }
      const currency = String(holding.currency || holding.priceCurrency || config.currency || 'INR').toLowerCase();
      if (!groups.has(currency)) groups.set(currency, []);
      groups.get(currency).push({ holding, id });
    }
    for (const [currency, entries] of groups) {
      const ids = [...new Set(entries.map(entry => entry.id))].slice(0, 100);
      try {
        const body = await fetchJson(`${sync.providers.coingecko}/api/v3/simple/price?ids=${ids.map(encodeURIComponent).join(',')}&vs_currencies=${encodeURIComponent(currency)}&include_last_updated_at=true`, { allowHosts: [hostOf(sync.providers.coingecko)] });
        for (const { holding, id } of entries) {
          const row = body?.[id];
          const price = positivePrice(row?.[currency]);
          const updated = Number(row?.last_updated_at);
          if (!price || !Number.isFinite(updated)) { unmatched.push({ id: holding.id, name: holding.name, reason: `No ${currency.toUpperCase()} price for ${id}.` }); continue; }
          quotes.set(holding.id, { price, date: isoDay(new Date(updated * 1000)), currency: currency.toUpperCase(), source: 'CoinGecko', reference: id });
        }
      } catch (error) { for (const { holding } of entries) unmatched.push({ id: holding.id, name: holding.name, reason: error.message }); }
    }
    return { quotes, unmatched };
  },
});

const alphavantage = sync => ({
  key: 'alphavantage', target: 'portfolio', domain: 'finance', label: 'Stock & ETF quotes',
  provider: 'Alpha Vantage', docsUrl: 'https://www.alphavantage.co/documentation/',
  description: 'End-of-day quotes for Stock and ETF holdings using your own free API key. Use exchange suffixes such as RELIANCE.BSE.',
  autoSyncMinutes: sync.intervals.alphavantage, requiresSecret: true,
  fields: [{ name: 'apiKey', label: 'API key', type: 'secret', required: true, help: `Free keys allow about 25 requests per day; ${sync.perRun.alphavantage} holding${sync.perRun.alphavantage === 1 ? ' is' : 's are'} refreshed per run.` }],
  normalize(input, previousSecret) {
    const apiKey = text(input?.apiKey, 64) || previousSecret?.apiKey || '';
    if (!/^[A-Z0-9]{8,64}$/i.test(apiKey)) throw domainError(400, 'INVALID_CONFIG', 'Enter the Alpha Vantage API key.');
    return { config: {}, secret: { apiKey } };
  },
  async quotes({ holdings, secret, fetchJson }) {
    const quotes = new Map(); const unmatched = [];
    const candidates = holdings.filter(stockSymbol)
      .sort((a, b) => String(a.quote?.fetchedAt || '').localeCompare(String(b.quote?.fetchedAt || '')));
    for (const [index, holding] of candidates.entries()) {
      if (index >= sync.perRun.alphavantage) { unmatched.push({ id: holding.id, name: holding.name, reason: 'Deferred to a later run (provider rate limit).' }); continue; }
      const symbol = stockSymbol(holding);
      try {
        const body = await fetchJson(`${sync.providers.alphavantage}/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(secret.apiKey)}`, { allowHosts: [hostOf(sync.providers.alphavantage)] });
        if (body?.Note || body?.Information) { unmatched.push({ id: holding.id, name: holding.name, reason: 'Provider rate limit reached; retrying later.' }); break; }
        const quote = body?.['Global Quote'] || {};
        const price = positivePrice(quote['05. price']);
        const date = /^\d{4}-\d{2}-\d{2}$/.test(quote['07. latest trading day'] || '') ? quote['07. latest trading day'] : null;
        if (!price || !date) { unmatched.push({ id: holding.id, name: holding.name, reason: `No quote for ${symbol}.` }); continue; }
        quotes.set(holding.id, { price, date, currency: holding.currency || holding.priceCurrency || null, source: 'Alpha Vantage', reference: symbol });
      } catch (error) { unmatched.push({ id: holding.id, name: holding.name, reason: error.message }); }
    }
    return { quotes, unmatched };
  },
});

const icsCalendar = sync => ({
  key: 'ics', target: 'calendar', domain: 'workspace', label: 'Calendar subscription',
  provider: 'iCalendar feed', docsUrl: 'https://support.google.com/calendar/answer/37648',
  description: 'Mirror Google, Outlook or iCloud calendars through their private iCal address. Events stay read-only here and refresh automatically.',
  autoSyncMinutes: sync.intervals.ics, requiresSecret: true,
  fields: [
    { name: 'url', label: 'Secret iCal address', type: 'secret', required: true, placeholder: 'https://calendar.google.com/calendar/ical/…/basic.ics', help: 'Google: Settings → your calendar → Secret address in iCal format.' },
    { name: 'label', label: 'Name', type: 'text', placeholder: 'Work calendar' },
    { name: 'color', label: 'Colour', type: 'color', placeholder: '#0ea5e9' },
  ],
  normalize(input, previousSecret) {
    const raw = text(input?.url, 2048);
    const url = raw ? normalizeFeedUrl(raw).href : previousSecret?.url;
    if (!url) throw domainError(400, 'INVALID_CONFIG', 'Enter the calendar’s iCal address.');
    const color = /^#[\da-f]{6}$/i.test(input?.color || '') ? input.color : '#0ea5e9';
    return { config: { label: text(input?.label, 60) || 'Subscribed calendar', color }, secret: { url } };
  },
  async events({ secret, config, fetchText, idFor, now, timeZone }) {
    const feed = await fetchText(secret.url, { maxBytes: sync.fetch.feedMaxBytes, timeoutMs: sync.fetch.feedTimeoutMs, headers: { Accept: 'text/calendar, */*' } });
    const result = readCalendarFeed(feed, { timeZone, idFor, now, ...sync.calendarWindow });
    return { ...result, events: result.events.map(event => ({ ...event, color: config.color || event.color })) };
  },
});

/** Build the connector set from validated sync settings (server/config.js). */
export function createConnectors(sync = DEFAULT_CONFIG.sync) {
  return Object.freeze([mfapi, coingecko, alphavantage, icsCalendar].map(build => Object.freeze(build(sync))));
}

export const CONNECTORS = createConnectors();
export const connectorByKey = key => CONNECTORS.find(connector => connector.key === key) || null;
