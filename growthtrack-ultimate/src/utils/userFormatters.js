import useStore from '../store/useStore';

/**
 * User-facing formatting is resolved from the profile at render time. Data is
 * stored canonically (money in the selected currency, body measurements in
 * cm/kg, timestamps as ISO strings), while these helpers keep every module's
 * presentation consistent with Profile → Appearance → Formatting & Culture.
 */
export const DEFAULT_FORMAT_SETTINGS = Object.freeze({
  baseCurrency: 'INR (₹)',
  numberFormat: 'Auto (from currency)',
  dateFormat: 'DD/MM/YYYY',
  measurementSystem: 'Metric (cm, kg)',
  textDirection: 'LTR (Left to Right)',
});

const CURRENCY_META = {
  USD: { code: 'USD', symbol: '$', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB' },
  INR: { code: 'INR', symbol: '₹', locale: 'en-IN' },
  JPY: { code: 'JPY', symbol: '¥', locale: 'ja-JP' },
  CAD: { code: 'CAD', symbol: 'CA$', locale: 'en-CA' },
  AUD: { code: 'AUD', symbol: 'A$', locale: 'en-AU' },
  AED: { code: 'AED', symbol: 'د.إ', locale: 'ar-AE' },
};

const COUNTRY_CURRENCY = [
  [/india|^in$/i, 'INR'],
  [/united states|^us$|^usa$/i, 'USD'],
  [/united kingdom|^uk$/i, 'GBP'],
  [/europe|germany|france|italy|spain/i, 'EUR'],
  [/japan|^jp$/i, 'JPY'],
  [/canada|^ca$/i, 'CAD'],
  [/australia|^au$/i, 'AUD'],
  [/uae|emirates|dubai/i, 'AED'],
];

const currentUser = (user) => user || useStore.getState()?.user || DEFAULT_FORMAT_SETTINGS;

function currencyCodeFrom(value) {
  const raw = String(value || '').trim();
  const code = raw.match(/\b(USD|EUR|GBP|INR|JPY|CAD|AUD|AED)\b/i)?.[1]?.toUpperCase();
  if (code) return code;
  if (raw.includes('₹')) return 'INR';
  if (raw.includes('€')) return 'EUR';
  if (raw.includes('£')) return 'GBP';
  if (raw.includes('¥')) return 'JPY';
  if (raw.toLowerCase() === 'other') return 'AED';
  return null;
}

export function getCurrencyMeta(user) {
  const profile = currentUser(user);
  const explicit = currencyCodeFrom(profile.baseCurrency);
  const country = String(profile.country || profile.location_name || '').trim();
  const inferred = COUNTRY_CURRENCY.find(([pattern]) => pattern.test(country))?.[1];
  const code = explicit || inferred || 'INR';
  return CURRENCY_META[code] || CURRENCY_META.INR;
}

export function getUserLocale(user) {
  const profile = currentUser(user);
  const numberFormat = String(profile.numberFormat || '').trim();
  if (/1\.234,56/.test(numberFormat)) return 'de-DE';
  if (/1\s234,56/.test(numberFormat)) return 'fr-FR';
  if (/12,34,567/.test(numberFormat)) return 'en-IN';
  if (/1,234\.56/.test(numberFormat)) return 'en-US';
  return getCurrencyMeta(profile).locale;
}

export function getCurrencySymbol(user) {
  return getCurrencyMeta(user).symbol;
}

export function formatNumber(value, user, options = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return options.invalid ?? '—';
  const defaults = { maximumFractionDigits: 2 };
  return new Intl.NumberFormat(getUserLocale(user), { ...defaults, ...options }).format(numeric);
}

export function formatCurrency(value, user, options = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return options.invalid ?? `${getCurrencySymbol(user)}0`;
  const { code } = getCurrencyMeta(user);
  const { invalid: _invalid, ...intlOptions } = options;
  const profile = currentUser(user);
  const explicitDecimalFormat = /(?:[.,]\d{2})/.test(String(profile.numberFormat || ''));
  return new Intl.NumberFormat(getUserLocale(user), {
    style: 'currency',
    currency: code,
    currencyDisplay: 'symbol',
    minimumFractionDigits: explicitDecimalFormat ? 2 : 0,
    maximumFractionDigits: 2,
    ...intlOptions,
  }).format(numeric);
}

function asDate(value) {
  if (value instanceof Date) return value;
  const raw = String(value || '').trim();
  if (!raw) return null;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00`) : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateParts(value) {
  const date = asDate(value);
  if (!date) return null;
  return { date, day: String(date.getDate()).padStart(2, '0'), month: String(date.getMonth() + 1).padStart(2, '0'), year: String(date.getFullYear()) };
}

/** Format a date using the exact numeric order selected in Profile. */
export function formatDate(value, user, options = {}) {
  const parts = dateParts(value);
  if (!parts) return options.invalid ?? '—';
  const profile = currentUser(user);
  const pattern = String(profile.dateFormat || DEFAULT_FORMAT_SETTINGS.dateFormat);
  const monthStyle = options.month || (options.style === 'long' ? 'long' : options.style === 'month' ? 'short' : null);
  if (monthStyle) {
    const month = parts.date.toLocaleString(getUserLocale(profile), { month: monthStyle });
    if (options.weekday) {
      const weekday = parts.date.toLocaleString(getUserLocale(profile), { weekday: options.weekday === true ? 'long' : options.weekday });
      return `${weekday}, ${month} ${Number(parts.day)}, ${parts.year}`;
    }
    if (options.year === false) return `${month} ${Number(parts.day)}`;
    if (pattern.startsWith('YYYY')) return `${month} ${parts.year}`;
    return `${month} ${Number(parts.day)}, ${parts.year}`;
  }
  if (pattern === 'YYYY-MM-DD') return `${parts.year}-${parts.month}-${parts.day}`;
  if (pattern === 'MM/DD/YYYY') return `${parts.month}/${parts.day}/${parts.year}`;
  return `${parts.day}/${parts.month}/${parts.year}`;
}

export function formatDateTime(value, user, options = {}) {
  const date = asDate(value);
  if (!date) return options.invalid ?? '—';
  return `${formatDate(date, user, options)} ${formatTime(date, user)}`;
}

export function formatTime(value, user, options = {}) {
  const raw = String(value || '').trim();
  if (/^\d{1,2}:\d{2}(?::\d{2})?(\s*[AP]M)?$/i.test(raw)) return raw;
  const date = asDate(value);
  if (!date) return options.invalid ?? '—';
  return date.toLocaleTimeString(getUserLocale(user), { hour: '2-digit', minute: '2-digit', ...options });
}

export function isImperial(user) {
  return String(currentUser(user).measurementSystem || '').toLowerCase().startsWith('imperial');
}

export function getMeasurementUnit(unit, user) {
  const normalized = String(unit || '').toLowerCase();
  if (!isImperial(user) && normalized === 'in') return 'cm';
  if (!isImperial(user)) return normalized;
  if (normalized === 'cm') return 'in';
  if (normalized === 'kg') return 'lb';
  if (normalized === 'g') return 'oz';
  return normalized;
}

export function convertMeasurement(value, unit, user) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return numeric;
  const normalized = String(unit || '').toLowerCase();
  if (!isImperial(user) && normalized === 'in') return numeric * 2.54;
  if (!isImperial(user)) return numeric;
  if (normalized === 'cm') return numeric / 2.54;
  if (normalized === 'kg') return numeric / 0.45359237;
  if (normalized === 'g') return numeric / 28.349523125;
  return numeric;
}

export function convertMeasurementToMetric(value, unit, user) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || !isImperial(user)) return numeric;
  const normalized = String(unit || '').toLowerCase();
  if (normalized === 'cm') return numeric * 2.54;
  if (normalized === 'kg') return numeric * 0.45359237;
  if (normalized === 'g') return numeric * 28.349523125;
  return numeric;
}

export function formatMeasurement(value, unit, user, options = {}) {
  const converted = convertMeasurement(value, unit, user);
  if (!Number.isFinite(converted)) return options.invalid ?? '—';
  const decimals = options.maximumFractionDigits ?? 1;
  return `${formatNumber(converted, user, { minimumFractionDigits: options.minimumFractionDigits ?? 0, maximumFractionDigits: decimals })} ${getMeasurementUnit(unit, user)}`;
}

export function formatTemperature(value, user, options = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return options.invalid ?? '—';
  const imperial = isImperial(user);
  const converted = imperial ? (numeric * 9 / 5) + 32 : numeric;
  const decimals = options.maximumFractionDigits ?? 0;
  return `${formatNumber(converted, user, { minimumFractionDigits: options.minimumFractionDigits ?? 0, maximumFractionDigits: decimals })}°${imperial ? 'F' : 'C'}`;
}

export function formatDistance(value, unit = 'km', user, options = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return options.invalid ?? '—';
  const imperial = isImperial(user);
  const converted = imperial && unit === 'km' ? numeric * 0.621371 : numeric;
  const label = imperial && unit === 'km' ? 'mi' : unit;
  return `${formatNumber(converted, user, { maximumFractionDigits: options.maximumFractionDigits ?? 1 })} ${label}`;
}

export function formatSpeed(value, unit = 'km/h', user, options = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return options.invalid ?? '—';
  const imperial = isImperial(user);
  const converted = imperial && unit === 'km/h' ? numeric * 0.621371 : numeric;
  const label = imperial && unit === 'km/h' ? 'mph' : unit;
  return `${formatNumber(converted, user, { maximumFractionDigits: options.maximumFractionDigits ?? 0 })} ${label}`;
}

export function getTextDirection(user) {
  return String(currentUser(user).textDirection || '').toLowerCase().startsWith('rtl') ? 'rtl' : 'ltr';
}

export default {
  formatNumber,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  formatMeasurement,
  formatTemperature,
  formatDistance,
  formatSpeed,
  getMeasurementUnit,
  convertMeasurementToMetric,
  getCurrencyMeta,
  getCurrencySymbol,
  getUserLocale,
  getTextDirection,
};
