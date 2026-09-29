import { domainError } from './errors.js';

const TYPES = new Set(['Stock', 'ETF', 'Mutual Fund', 'Crypto', 'Gold', 'Real Estate', 'Bond', 'FD', 'Cash', 'Other']);
const MAX_BYTES = 512 * 1024;
const MAX_PRICE = 1e12;
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const DATE_FIELDS = new Set(['date', 'buyDate', 'priceDate', 'currentPriceDate', 'snapshotDate', 'asOf', 'asOfDate', 'recordedAt', 'capturedAt', 'timestamp', 'updatedAt', 'createdAt', 'priceUpdatedAt']);
const CURRENCY_FIELDS = new Set(['currency', 'baseCurrency', 'priceCurrency', 'buyCurrency', 'purchaseCurrency', 'valuationCurrency']);
const PRICE_FIELDS = new Set(['price', 'buyPrice', 'currentPrice', 'manualPrice', 'unitPrice']);
const SNAPSHOT_FIELDS = new Set(['snapshot', 'currentSnapshot', 'currentPriceSnapshot']);
const HISTORY_FIELDS = new Set(['snapshots', 'history', 'priceHistory', 'valuationHistory']);
const BASE_FIELDS = new Set(['id', 'name', 'symbol', 'type', 'units', 'buyPrice', 'currentPrice', 'buyDate']);

function invalid(path, message) {
  throw domainError(400, 'INVALID_PORTFOLIO', `${path}: ${message}`);
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

function number(value, path, { min = 0, max = MAX_PRICE, nullable = false } = {}) {
  if (nullable && (value == null || value === '')) return null;
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '') invalid(path, 'A finite number is required.');
  const result = Number(value);
  if (!Number.isFinite(result) || result < min || result > max) invalid(path, `Use a number between ${min} and ${max}.`);
  return result;
}

function date(value, path, nullable = true) {
  if (nullable && (value === '' || value === null)) return value;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) invalid(path, 'Use a valid date or ISO timestamp.');
  const day = value.slice(0, 10);
  const parsed = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== day
    || (value.length > 10 && !Number.isFinite(Date.parse(value)))) invalid(path, 'Use a real calendar date.');
  return value; // Preserve the submitted observation date, including its timezone.
}

function currency(value, path) {
  if (value === null || value === '') return value;
  if (typeof value !== 'string' || !/^[a-z]{3,10}$/i.test(value.trim())) invalid(path, 'Use a currency code.');
  return value.trim().toUpperCase();
}

function metadata(value, path, depth = 0) {
  if (depth > 6) invalid(path, 'Metadata is nested too deeply.');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > 4000) invalid(path, 'Text cannot exceed 4,000 characters.');
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) invalid(path, 'Numbers must be finite.');
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 1000) throw domainError(413, 'PORTFOLIO_LIMIT', `${path}: At most 1,000 observations are allowed.`);
    return value.map((entry, index) => metadata(entry, `${path}[${index}]`, depth + 1));
  }
  if (!plainObject(value)) invalid(path, 'Use plain JSON metadata.');
  const entries = Object.entries(value);
  if (entries.length > 100) invalid(path, 'Too many metadata fields.');
  return Object.fromEntries(entries.map(([key, entry]) => {
    if (UNSAFE_KEYS.has(key) || key.length > 80) invalid(path, 'Unsafe metadata field.');
    const fieldPath = `${path}.${key}`;
    if (DATE_FIELDS.has(key)) return [key, date(entry, fieldPath)];
    if (CURRENCY_FIELDS.has(key)) return [key, currency(entry, fieldPath)];
    if (PRICE_FIELDS.has(key)) return [key, number(entry, fieldPath, { nullable: true })];
    return [key, metadata(entry, fieldPath, depth + 1)];
  }));
}

function snapshot(value, path, dateKey) {
  if (!plainObject(value)) invalid(path, 'A snapshot must be an object.');
  const result = metadata(value, path);
  const observationDate = [...DATE_FIELDS].some(field => typeof result[field] === 'string' && result[field] !== '');
  if (!observationDate && !dateKey) invalid(path, 'A recorded observation date is required.');
  return result;
}

function history(value, path) {
  if (value === null) return value;
  if (Array.isArray(value)) {
    if (value.length > 1000) throw domainError(413, 'PORTFOLIO_LIMIT', `${path}: At most 1,000 observations are allowed.`);
    return value.map((entry, index) => snapshot(entry, `${path}[${index}]`));
  }
  if (!plainObject(value)) invalid(path, 'History must be an array or snapshot map.');
  const entries = Object.entries(value);
  if (entries.length > 1000) throw domainError(413, 'PORTFOLIO_LIMIT', `${path}: At most 1,000 observations are allowed.`);
  return Object.fromEntries(entries.map(([key, entry]) => {
    if (UNSAFE_KEYS.has(key) || key.length > 160) invalid(path, 'Unsafe snapshot key.');
    // Some clients key a snapshot map by its recorded date rather than adding a
    // date property. Validate that supplied date without inventing a property.
    const dateKey = /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(key) ? date(key, path, false) : null;
    return [key, snapshot(entry, path, dateKey)];
  }));
}

export function normalizePortfolioPayload(source) {
  if (!Array.isArray(source)) invalid('portfolio', 'Portfolio must be an array.');
  if (source.length > 200) throw domainError(413, 'PORTFOLIO_LIMIT', 'Portfolio cannot exceed 200 holdings.');
  let serialized;
  try { serialized = JSON.stringify(source); } catch { invalid('portfolio', 'Use plain JSON data.'); }
  if (Buffer.byteLength(serialized, 'utf8') > MAX_BYTES) throw domainError(413, 'PORTFOLIO_LIMIT', 'Portfolio cannot exceed 512 KB.');
  const ids = new Set();
  return source.map((holding, index) => {
    const path = `portfolio[${index}]`;
    if (!plainObject(holding)) invalid(path, 'A holding must be an object.');
    if (typeof holding.name !== 'string' || !holding.name.trim() || holding.name.trim().length > 120) invalid(`${path}.name`, 'A name up to 120 characters is required.');
    if (holding.id != null && !['string', 'number'].includes(typeof holding.id)) invalid(`${path}.id`, 'Invalid holding identifier.');
    const id = String(holding.id ?? `holding-${index + 1}`).trim();
    if (!id || id.length > 80 || ids.has(id)) invalid(`${path}.id`, 'Holding identifiers must be unique and at most 80 characters.');
    ids.add(id);
    if (holding.symbol != null && (typeof holding.symbol !== 'string' || holding.symbol.trim().length > 32)) invalid(`${path}.symbol`, 'Symbol cannot exceed 32 characters.');
    const units = number(holding.units, `${path}.units`, { max: 1e9 });
    if (units === 0) invalid(`${path}.units`, 'Units must be positive.');
    const result = {
      id, name: holding.name.trim(), symbol: (holding.symbol || '').trim().toUpperCase(),
      type: TYPES.has(holding.type) ? holding.type : 'Other', units,
      buyPrice: number(holding.buyPrice, `${path}.buyPrice`),
      currentPrice: number(holding.currentPrice, `${path}.currentPrice`, { nullable: true }),
      buyDate: holding.buyDate == null ? '' : date(holding.buyDate, `${path}.buyDate`),
    };
    // Keep bounded submitted fields, including provenance, currency and actual
    // observation history. Never synthesize a price, date, source or snapshot.
    for (const [key, value] of Object.entries(holding)) {
      if (BASE_FIELDS.has(key)) continue;
      if (UNSAFE_KEYS.has(key) || key.length > 80) invalid(path, 'Unsafe holding field.');
      const fieldPath = `${path}.${key}`;
      if (DATE_FIELDS.has(key)) result[key] = date(value, fieldPath);
      else if (CURRENCY_FIELDS.has(key)) result[key] = currency(value, fieldPath);
      else if (SNAPSHOT_FIELDS.has(key)) result[key] = value === null ? null : snapshot(value, fieldPath);
      else if (HISTORY_FIELDS.has(key)) result[key] = history(value, fieldPath);
      else result[key] = metadata(value, fieldPath);
    }
    return result;
  });
}
