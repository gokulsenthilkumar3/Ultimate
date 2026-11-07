import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { PRODUCT_UI_ROOT } from '../growthtrack-ultimate/src/config/products.js';

export const NEXT_PRODUCTS = new Set(['finsync', 'oxfin', 'equity']);

export function resolveApiRoute(pathname) {
  if (pathname === '/db' || pathname.startsWith('/db/')) return { id: 'studio', path: pathname.slice(3) || '/' };
  if (pathname.startsWith('/api/db/')) return { id: 'studio', path: '/api/' + pathname.slice(8) };
  // Family's original frontend contract remains valid through the gateway.
  if (pathname.startsWith('/api/v1/') || pathname.startsWith('/uploads/')) return { id: 'family', path: pathname };
  const match = pathname.match(/^\/api\/(ultimate|studio|agent|family|finsync|oxfin|forex|equity)(\/.*)?$/);
  if (match) {
    const [, id, suffix = '/'] = match;
    if (id === 'family') return { id, path: suffix.startsWith('/uploads/') || suffix === '/health' ? suffix : '/api/v1' + (suffix.startsWith('/api/v1') ? suffix.slice(7) : suffix) };
    if (id === 'ultimate') return { id, path: suffix.startsWith('/api/') || suffix.startsWith('/auth/') ? suffix : '/api' + suffix };
    if (NEXT_PRODUCTS.has(id)) return { id, path: `${PRODUCT_UI_ROOT}/${id}/api${suffix.startsWith('/api/') ? suffix.slice(4) : suffix}` };
    return { id, path: suffix };
  }
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) return { id: 'ultimate', path: pathname };
  return null;
}

export function proxyHttp(req, res, target, pathname) {
  // Route input must never replace the configured upstream authority.
  const url = new URL(target);
  if (url.protocol !== 'http:' || url.username || url.password) throw new Error('Invalid HTTP upstream configuration.');
  url.pathname = pathname;
  url.hash = '';
  url.search = new URL(req.url, 'http://localhost').search;
  const requestId = req.headers['x-request-id'] || randomUUID();
  const upstream = http.request(url, {
    method: req.method,
    headers: { ...req.headers, host: url.host, 'x-request-id': requestId, 'x-forwarded-host': req.headers.host || '', 'x-forwarded-proto': 'http' },
  }, response => {
    res.writeHead(response.statusCode || 502, { ...response.headers, 'x-request-id': requestId });
    response.pipe(res);
  });
  upstream.setTimeout(30_000, () => upstream.destroy(new Error('Upstream timeout')));
  upstream.on('error', () => {
    if (res.headersSent) return res.destroy();
    res.writeHead(503, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Service unavailable', requestId }));
  });
  req.on('aborted', () => upstream.destroy());
  req.pipe(upstream);
}

// Vite proxies the product HTML, assets, navigation and development/Streamlit
// WebSockets together. API calls always go through the single API gateway.
export function createUiProxies(env = {}) {
  const gateway = env.GATEWAY_URL || 'http://127.0.0.1:5300';
  const ports = { finsync: 5101, oxfin: 5102, equity: 5105, family: 5104, forex: 8501 };
  const proxies = {};
  for (const [id, port] of Object.entries(ports)) {
    const prefix = `${PRODUCT_UI_ROOT}/${id}`;
    proxies[`${prefix}/api`] = { target: gateway, changeOrigin: false, rewrite: pathname => pathname.replace(`${prefix}/api`, `/api/${id}`) };
    proxies[prefix] = { target: env[`${id.toUpperCase()}_UI_URL`] || `http://127.0.0.1:${port}`, changeOrigin: true, ws: true };
  }
  proxies['/db'] = { target: gateway, changeOrigin: false };
  proxies['/api'] = { target: gateway, changeOrigin: false };
  proxies['/auth'] = { target: gateway, changeOrigin: false };
  return proxies;
}
