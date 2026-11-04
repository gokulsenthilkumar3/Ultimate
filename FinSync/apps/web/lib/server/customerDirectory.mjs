import { timingSafeEqual } from 'node:crypto';

export function serviceAuthorized(header, configured) {
  if (!/^[a-f0-9]{64}$/i.test(configured || '')) return false;
  const supplied = header?.match(/^Bearer ([a-f0-9]{64})$/i)?.[1];
  return Boolean(supplied && timingSafeEqual(Buffer.from(supplied), Buffer.from(configured)));
}

export function directoryInput(url) {
  const params = new URL(url).searchParams;
  if ([...params.keys()].some(key => !['q', 'status', 'plan', 'offset', 'limit'].includes(key))
    || [...params.keys()].some(key => params.getAll(key).length !== 1)) throw new Error('INVALID_FILTER');
  const limit = Number(params.get('limit') || 25), offset = Number(params.get('offset') || 0);
  const q = params.get('q') || '', status = params.get('status') || '', plan = params.get('plan') || '';
  if (![25, 50, 100].includes(limit) || !Number.isSafeInteger(offset) || offset < 0 || offset > 10000 || q.length > 200 || status.length > 40 || plan.length > 100) throw new Error('INVALID_FILTER');
  return { limit, offset, q, status, plan };
}

export async function firebaseDirectory(auth, input) {
  const users = []; let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users); pageToken = page.pageToken;
    if (pageToken && users.length >= 10000) throw new Error('DIRECTORY_CAPACITY');
  } while (pageToken);
  const rows = users.map(user => ({ id: user.uid, product: 'finsync', name: String(user.displayName || '').slice(0, 500), email: String(user.email || '').slice(0, 500), status: user.disabled ? 'inactive' : 'active', plan: 'unavailable', lastActiveAt: user.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toISOString() : null }))
    .filter(row => (!input.q || `${row.name} ${row.email}`.toLowerCase().includes(input.q.toLowerCase())) && (!input.status || row.status === input.status) && (!input.plan || row.plan === input.plan))
    .sort((a, b) => a.id.localeCompare(b.id));
  return { product: 'finsync', limit: input.limit, offset: input.offset, total: rows.length, rows: rows.slice(input.offset, input.offset + input.limit) };
}
