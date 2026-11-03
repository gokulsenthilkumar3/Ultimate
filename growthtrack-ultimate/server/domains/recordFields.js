// Shared record projection for Prisma writes, legacy migration and API reads.
// Only custom/nested observations remain JSON; null presence is structural
// metadata so omitted optional fields and an explicit clear stay distinct.
export const RECORD_NULLS = '__recordNulls';
const strings = names => Object.fromEntries(names.split(' ').map(name => [name, 'String']));
export const RECORD_FIELDS = Object.freeze({
  calendar: Object.freeze({ ...strings('title date endDate startTime endTime timeZone recurrence type description location color icsUid syncLabel'), allDay: 'Boolean' }),
  holdings: Object.freeze({ ...strings('name symbol type buyDate date priceDate currentPriceDate snapshotDate asOf asOfDate recordedAt capturedAt timestamp priceUpdatedAt currency baseCurrency priceCurrency buyCurrency purchaseCurrency valuationCurrency schemeCode coingeckoId'), units: 'Float', buyPrice: 'Float', currentPrice: 'Float' }),
});
export const RECORD_TABLES = Object.freeze({ calendar: 'calendar_events', holdings: 'portfolio_holdings' });
export function parseRecordPayload(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}
function supported(value, type) {
  return type === 'String' ? typeof value === 'string'
    : type === 'Boolean' ? typeof value === 'boolean'
      : typeof value === 'number' && Number.isFinite(value);
}
export function recordStorageData(collection, payload) {
  const fields = RECORD_FIELDS[collection];
  const columns = Object.fromEntries(Object.keys(fields).map(key => [key, null]));
  const extras = {}; const nulls = [];
  for (const [key, value] of Object.entries(payload)) {
    if (key === RECORD_NULLS || value === undefined) continue;
    if (!Object.hasOwn(fields, key)) extras[key] = value;
    else if (value === null) nulls.push(key);
    else if (supported(value, fields[key])) columns[key] = value;
    else extras[key] = value; // Preserve unconvertible legacy values for review.
  }
  if (nulls.length) extras[RECORD_NULLS] = nulls;
  return { ...columns, data: JSON.stringify(extras) };
}
export function recordPayload(row, collection) {
  const extras = parseRecordPayload(row.data);
  const result = { ...extras };
  delete result[RECORD_NULLS];
  const fields = RECORD_FIELDS[collection] || {};
  for (const [key, type] of Object.entries(fields)) {
    if (row[key] != null) result[key] = type === 'Boolean' ? Boolean(row[key]) : row[key];
  }
  for (const key of Array.isArray(extras[RECORD_NULLS]) ? extras[RECORD_NULLS] : []) {
    if (Object.hasOwn(fields, key) && row[key] == null) result[key] = null;
  }
  return result;
}
const sqlType = type => type === 'Float' ? 'REAL' : type === 'Boolean' ? 'BOOLEAN' : 'TEXT';
export function recordColumnStatements(collection) {
  return Object.entries(RECORD_FIELDS[collection]).map(([field, type]) => `ALTER TABLE "${RECORD_TABLES[collection]}" ADD COLUMN "${field}" ${sqlType(type)};`);
}
// SQLite JSON functions only inspect verified objects. Non-JSON/non-object
// legacy payloads remain untouched; only an exactly typed property is moved.
export function recordBackfillStatements(collection) {
  const table = RECORD_TABLES[collection];
  return Object.entries(RECORD_FIELDS[collection]).map(([field, type]) => {
    const json = `CASE WHEN json_valid("data") THEN CASE WHEN json_type("data")='object' THEN "data" ELSE '{}' END ELSE '{}' END`;
    const kind = `json_type(${json}, '$.${field}')`;
    const accepts = type === 'Float' ? `${kind} IN ('integer','real') AND abs(json_extract(${json}, '$.${field}')) <= 1.7976931348623157e308`
      : type === 'Boolean' ? `${kind} IN ('true','false')` : `${kind}='text'`;
    return `UPDATE "${table}" SET "${field}"=json_extract("data", '$.${field}'), "data"=json_remove("data", '$.${field}') WHERE "${field}" IS NULL AND ${accepts};`;
  });
}
