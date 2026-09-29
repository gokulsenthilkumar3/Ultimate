import { parse } from 'csv-parse/browser/esm/sync';
import { validFinanceDate } from './financeModel';

type ShoppingRow = Record<string, string>;
type ExistingItem = { id?: string; importKey?: string };

const headerKey = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const first = (row: ShoppingRow, ...keys: string[]) => keys.map(key => row[key]?.trim()).find(Boolean) || '';

// Stable across retries of the same export. Source order/line position keeps
// otherwise identical line items distinct without trusting retailer IDs alone.
function rowKey(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return `shopping-import-${hash.toString(16).padStart(16, '0')}`;
}

export function previewShoppingCsv(text: string, existing: ExistingItem[] = []) {
  if (text.length > 5_000_000) throw new Error('Choose a CSV smaller than 5 MB.');
  const records = parse(text, {
    bom: true,
    columns: (headers: string[]) => headers.map(headerKey),
    skip_empty_lines: true,
    max_record_size: 65_536,
    relax_column_count: false,
  }) as ShoppingRow[];
  if (records.length > 500) throw new Error('Import up to 500 order rows at a time.');
  const known = new Set(existing.flatMap(item => [item.id, item.importKey].filter(Boolean)));
  const items: Record<string, unknown>[] = [];
  const errors: string[] = [];
  let duplicates = 0;
  for (const [index, record] of records.entries()) {
    const name = first(record, 'item', 'name', 'product', 'title', 'productname', 'itemname');
    if (!name) { errors.push(`Row ${index + 2}: missing item name.`); continue; }
    const rawPrice = first(record, 'price', 'amount', 'itemtotal', 'total', 'mrp');
    const priceText = rawPrice.replace(/[₹$£€\s,]/g, '');
    const price = rawPrice ? Number(priceText) : null;
    if (price != null && (!Number.isFinite(price) || price < 0)) { errors.push(`Row ${index + 2}: invalid price.`); continue; }
    const quantityText = first(record, 'quantity', 'qty') || '1';
    const quantity = Number(quantityText);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1_000_000) { errors.push(`Row ${index + 2}: invalid quantity.`); continue; }
    const orderedAt = first(record, 'orderdate', 'date', 'purchasedate');
    if (orderedAt && !validFinanceDate(orderedAt)) { errors.push(`Row ${index + 2}: use YYYY-MM-DD for the order date.`); continue; }
    const expectedDelivery = first(record, 'deliverydate');
    if (expectedDelivery && !validFinanceDate(expectedDelivery)) { errors.push(`Row ${index + 2}: use YYYY-MM-DD for delivery date.`); continue; }
    const website = first(record, 'website').toLowerCase();
    let source = first(record, 'source') || 'Order import';
    if ('amazonorderid' in record || website.includes('amazon')) source = 'Amazon';
    else if ('flipkart' in record || website.includes('flipkart')) source = 'Flipkart';
    else if ('zepto' in record || website.includes('zepto')) source = 'Zepto';
    else if ('blinkit' in record || website.includes('blinkit')) source = 'Blinkit';
    else if ('instamart' in record || website.includes('instamart')) source = 'Instamart';
    else if ('bigbasket' in record || website.includes('bigbasket')) source = 'Bigbasket';
    const id = rowKey(JSON.stringify([source, first(record, 'orderid', 'amazonorderid'), name, orderedAt, price, quantity, index]));
    if (known.has(id)) { duplicates++; continue; }
    known.add(id);
    const status = first(record, 'status').toLowerCase();
    const stage = status === 'delivered' ? 'purchased' : status === 'shipped' ? 'arriving' : 'ordered';
    items.push({ id, importKey: id, name, source, stage, purchased: stage === 'purchased', estimatedCost: price,
      quantity, orderedAt, expectedDelivery, priority: 'medium', category: first(record, 'category') || 'Other', priceHistory: [] });
  }
  return { items, errors, duplicates, total: records.length };
}
