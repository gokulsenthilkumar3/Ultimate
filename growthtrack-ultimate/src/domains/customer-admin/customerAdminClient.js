import { apiClient } from '../../lib/apiClient';

export const CUSTOMER_PRODUCTS = Object.freeze({ finsync: 'FinSync', oxfin: 'OxFin' });
const boundedText = value => typeof value === 'string' && value.length <= 500;
export function validateCustomerPage(payload, product, { limit = 25, offset = 0 } = {}) {
  if (!Object.hasOwn(CUSTOMER_PRODUCTS, product) || payload?.product !== product || !Array.isArray(payload?.rows)
    || payload.rows.length > limit || payload.limit !== limit || payload.offset !== offset
    || !Number.isSafeInteger(payload.total) || payload.total < 0 || payload.rows.length > 0 && payload.total < offset + payload.rows.length
    || new Set(payload.rows.map(row => row.id)).size !== payload.rows.length) throw new Error('Customer response does not match the requested scope.');
  if (!payload.rows.every(row => row.product === product && boundedText(row.id) && row.id.length > 0 && boundedText(row.name)
    && boundedText(row.email) && boundedText(row.status) && boundedText(row.plan)
    && (row.lastActiveAt == null || typeof row.lastActiveAt === 'string' && Number.isFinite(Date.parse(row.lastActiveAt))))) throw new Error('Invalid customer record.');
  // Keep the presentation boundary minimal, even if a provider returns more fields.
  return { product, total: payload.total, limit, offset, rows: payload.rows.map(({ id, product: source, name, email, status, plan, lastActiveAt }) => ({ id, product: source, name, email, status, plan, lastActiveAt })) };
}
export async function listCustomers(product, { query = '', status = '', plan = '', offset = 0, limit = 25, signal } = {}) {
  if (!Object.hasOwn(CUSTOMER_PRODUCTS, product) || ![25, 50, 100].includes(limit) || !Number.isSafeInteger(offset) || offset < 0) throw new Error('Invalid customer request.');
  const params = new URLSearchParams({ q: query.trim().slice(0, 200), status, plan, offset: String(offset), limit: String(limit) });
  const payload = await apiClient.get(`/api/admin/products/${product}/customers?${params}`, { signal });
  return validateCustomerPage(payload, product, { offset, limit });
}
export function customerErrorState(error) {
  if (error?.status === 403) return 'denied';
  if (error?.status === 401) return 'unauthorized';
  if (error?.payload?.code === 'ADMIN_ADAPTER_NOT_CONFIGURED') return 'setup';
  if ([0, 408, 502, 503, 504].includes(error?.status)) return 'unavailable';
  return 'error';
}
