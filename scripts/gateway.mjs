import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { PRODUCTS } from '../growthtrack-ultimate/src/config/products.js';

export const PORT = Number(process.env.GATEWAY_PORT || 3000);
// API target ports must match what workspace.mjs assigns to each product.
// Products without a standalone backend (FinSync web-only, NiftyLens) use
// their UI port since that's where the Next.js API routes live.
const targets = {
  ultimate: process.env.ULTIMATE_API_URL || 'http://127.0.0.1:3001',
  agent:    process.env.AGENT_API_URL    || 'http://127.0.0.1:11434',
  finsync:  process.env.FINSYNC_API_URL  || 'http://127.0.0.1:5101',
  oxfin:    process.env.OXFIN_API_URL    || 'http://127.0.0.1:5102',
  family:   process.env.FAMILY_API_URL   || 'http://127.0.0.1:5104',
  equity:   process.env.EQUITY_API_URL   || 'http://127.0.0.1:5105',
  forex:    process.env.FOREX_API_URL    || 'http://127.0.0.1:8501',
};
// Human-readable names for health response
const productNames = { ultimate: 'Ultimate', agent: 'Agent (Ollama)', finsync: 'FinSync', oxfin: 'OxFin', family: 'Family Connect', equity: 'Equity/NiftyLens', forex: 'Forex' };

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(body));
};

async function probe(id, target) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);
  const name = productNames[id] || id;
  try {
    const probePath = id === 'agent' ? '/api/tags' : '/api/health';
    const response = await fetch(`${target}${probePath}`, { signal: controller.signal });
    return { id, name, online: response.ok, status: response.status };
  } catch { return { id, name, online: false, status: null }; }
  finally { clearTimeout(timer); }
}

function resolveRoute(pathname) {
  const match = pathname.match(/^\/api\/(ultimate|agent|family|finsync|oxfin|forex|equity)(\/.*)?$/);
  if (match) return { id: match[1], path: match[2] || '/' };
  // Backwards-compatible Ultimate API contract for the existing frontend.
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) return { id: 'ultimate', path: pathname };
  return null;
}

function proxy(req, res, route) {
  const upstream = new URL(route.path, targets[route.id]);
  upstream.search = new URL(req.url, 'http://gateway.local').search;
  const requestId = req.headers['x-request-id'] || randomUUID();
  const upstreamRequest = http.request(upstream, {
    method: req.method,
    headers: { ...req.headers, host: upstream.host, 'x-request-id': requestId, 'x-forwarded-host': req.headers.host || '' },
  }, upstreamResponse => {
    res.writeHead(upstreamResponse.statusCode || 502, { ...upstreamResponse.headers, 'x-request-id': requestId });
    upstreamResponse.pipe(res);
  });
  upstreamRequest.setTimeout(12_000, () => upstreamRequest.destroy(new Error('upstream timeout')));
  upstreamRequest.on('error', () => json(res, 503, { error: 'Service unavailable', service: route.id, requestId }));
  req.pipe(upstreamRequest);
}

export function createGateway() {
  return http.createServer(async (req, res) => {
    const origin = String(req.headers.origin || '');
    if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) res.setHeader('access-control-allow-origin', origin);
    res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type,x-csrf-token');
    res.setHeader('vary', 'Origin');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const url = new URL(req.url, 'http://gateway.local');
    if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/api/gateway/health')) {
      const services = await Promise.all(Object.entries(targets).map(([id, target]) => probe(id, target)));
      // Expose product UI metadata alongside service health so AppLauncher
      // can render the full product card without a separate /api/products call.
      return json(res, 200, {
        status: 'online',
        gateway: { port: PORT },
        services,
        products: PRODUCTS.map(({ id, name, icon, color, uiUrl, apiPrefix, description }) => ({ id, name, icon, color, uiUrl, apiPrefix, description })),
      });
    }
    if (req.method === 'GET' && (url.pathname === '/api/products' || url.pathname === '/api/gateway/products')) {
      return json(res, 200, { products: PRODUCTS });
    }
    const route = resolveRoute(url.pathname);
    if (!route) return json(res, 404, { error: 'Gateway route not found' });
    proxy(req, res, route);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createGateway().listen(PORT, '127.0.0.1', () => console.log(`[gateway] http://localhost:${PORT}`));
}
