/** Read-only product adapters. Missing service identities remain explicitly unavailable. */
export function registerCustomerAdminRoutes(app, authMiddleware, { environment = process.env, fetchImpl = fetch, writeEvent } = {}) {
  const products = new Set(['finsync', 'oxfin']);
  app.get('/api/admin/products/:product/customers', authMiddleware, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!products.has(req.params.product)) return res.status(404).json({ code: 'UNKNOWN_ADMIN_PRODUCT', error: 'Product not found.' });
    const product = req.params.product, prefix = `CUSTOMER_ADMIN_${product.toUpperCase()}`;
    const base = environment[`${prefix}_URL`], token = environment[`${prefix}_TOKEN`];
    const unavailable = () => res.status(503).json({ code: 'ADMIN_ADAPTER_NOT_CONFIGURED', product, capabilities: { read: false, write: false }, error: 'Customer administration is not connected.' });
    if (!base || !/^[a-f0-9]{64}$/i.test(token || '') || !writeEvent) return unavailable();
    if (environment.CUSTOMER_ADMIN_FINSYNC_TOKEN && environment.CUSTOMER_ADMIN_FINSYNC_TOKEN === environment.CUSTOMER_ADMIN_OXFIN_TOKEN) return unavailable();
    let target;
    try {
      const url = new URL(base);
      if (url.username || url.password || url.search || url.hash || !['https:', 'http:'].includes(url.protocol)
        || (url.protocol !== 'https:' && (environment.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) return unavailable();
      target = new URL(`${url.href.replace(/\/$/, '')}/api/admin/customers`);
    } catch { return unavailable(); }
    const audit = async (result, count = 0) => Boolean(await writeEvent({ category: 'customer-admin', action: 'customers.read', user_id: req.user?.id, details: { product, result, count } }));
    const readers = String(environment[`${prefix}_READERS`] || '').split(',').map(id => id.trim()).filter(Boolean);
    if (!req.user?.id || !readers.includes(String(req.user.id))) {
      try { await audit('denied'); } catch { /* Access stays denied if audit storage fails. */ }
      return res.status(403).json({ code: 'ADMIN_SCOPE_DENIED', error: 'Product access denied.' });
    }
    const allowed = ['q', 'status', 'plan', 'limit', 'offset'];
    const query = req.query;
    if (Object.keys(query).some(key => !allowed.includes(key))) return res.status(400).json({ code: 'INVALID_FILTER', error: 'Invalid customer filter.' });
    const { q = '', status = '', plan = '', limit: limitText = '25', offset: offsetText = '0' } = query;
    // Narrow each captured value before using it. Express query parameters can
    // also be arrays/objects, and req.query may be parsed afresh on each access.
    if (typeof q !== 'string' || typeof status !== 'string' || typeof plan !== 'string'
      || typeof limitText !== 'string' || typeof offsetText !== 'string') return res.status(400).json({ code: 'INVALID_FILTER', error: 'Invalid customer filter.' });
    const limit = Number(limitText || 25), offset = Number(offsetText || 0);
    if (![25, 50, 100].includes(limit) || !Number.isSafeInteger(offset) || offset < 0 || offset > 10000
      || q.length > 200 || status.length > 40 || plan.length > 100) return res.status(400).json({ code: 'INVALID_FILTER', error: 'Invalid customer filter.' });
    for (const [key, value] of Object.entries({ q, status, plan, limit: String(limit), offset: String(offset) })) target.searchParams.set(key, value);
    try {
      const response = await fetchImpl(target, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(10_000), redirect: 'error', cache: 'no-store' });
      if (!response.ok) { await response.body?.cancel(); throw new Error('DOWNSTREAM_UNAVAILABLE'); }
      const reader = response.body.getReader(); const chunks = []; let bytes = 0;
      try {
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          bytes += value.byteLength;
          if (bytes > 256_000) { await reader.cancel(); throw new Error('RESPONSE_LIMIT'); }
          chunks.push(Buffer.from(value));
        }
      } finally { reader.releaseLock(); }
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (data.product !== product || data.limit !== limit || data.offset !== offset || !Number.isSafeInteger(data.total) || data.total < 0
        || !Array.isArray(data.rows) || data.rows.length > limit || (data.rows.length && data.total < offset + data.rows.length)
        || new Set(data.rows.map(row => row.id)).size !== data.rows.length) throw new Error('INVALID_RESPONSE');
      const rows = data.rows.map(row => {
        if (row.product !== product || !['id', 'name', 'email', 'status', 'plan'].every(key => typeof row[key] === 'string' && row[key].length <= 500)
          || !row.id || (row.lastActiveAt != null && (typeof row.lastActiveAt !== 'string' || !Number.isFinite(Date.parse(row.lastActiveAt))))) throw new Error('INVALID_RESPONSE');
        const { id, name, email, status, plan, lastActiveAt = null } = row;
        return { id, product, name, email, status, plan, lastActiveAt };
      });
      if (!await audit('success', rows.length)) throw new Error('AUDIT_UNAVAILABLE');
      return res.json({ product, limit, offset, total: data.total, rows });
    } catch {
      try { await audit('unavailable'); } catch { /* Never expose upstream/private errors. */ }
      return res.status(503).json({ code: 'ADMIN_SERVICE_UNAVAILABLE', error: 'Customer service is unavailable.' });
    }
  });
}
