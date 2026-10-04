import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { PRODUCTS } from '../growthtrack-ultimate/src/config/products.js';

export const PORT = Number(process.env.GATEWAY_PORT || 3000);
// API target ports must match what workspace.mjs assigns to each product.
const targets = {
  ultimate: process.env.ULTIMATE_API_URL || 'http://127.0.0.1:3001',
  studio:   process.env.STUDIO_API_URL   || 'http://127.0.0.1:5556',
  agent:    process.env.AGENT_API_URL    || 'http://127.0.0.1:11434',
  finsync:  process.env.FINSYNC_API_URL  || 'http://127.0.0.1:5101',
  oxfin:    process.env.OXFIN_API_URL    || 'http://127.0.0.1:5102',
  family:   process.env.FAMILY_API_URL   || 'http://127.0.0.1:5104',
  equity:   process.env.EQUITY_API_URL   || 'http://127.0.0.1:5105',
  forex:    process.env.FOREX_API_URL    || 'http://127.0.0.1:8501',
};

const serviceMeta = {
  ultimate: { name: 'Ultimate Core API', icon: '⚡', port: 3001, desc: 'Central digital twin backend, SQLite persistence & auth', ui: 'http://localhost:5000/Ultimate/' },
  studio:   { name: 'GrowthTrack DB Studio', icon: '🗄️', port: 5556, desc: 'Visual SQLite table browser, schema & SQL runner', ui: 'http://localhost:5556/' },
  agent:    { name: 'Ollama Agent Engine', icon: '🤖', port: 11434, desc: 'Local LLM & autonomous agent orchestration runtime', ui: null },
  finsync:  { name: 'FinSync Super App', icon: '💳', port: 5101, desc: 'Personal finance, banking sync & automated budgets', ui: 'http://localhost:5101' },
  oxfin:    { name: 'OxFin Web App', icon: '🏦', port: 5102, desc: 'Wallets, investment tracking & portfolio analytics', ui: 'http://localhost:5102' },
  family:   { name: 'Family Connect', icon: '🌳', port: 5104, desc: 'Family tree graph, shared archives & private memory vault', ui: 'http://localhost:5104' },
  equity:   { name: 'Equity / NiftyLens', icon: '📊', port: 5105, desc: 'NSE/BSE charts, options matrix & market screener', ui: 'http://localhost:5105' },
  forex:    { name: 'Forex ML Dashboard', icon: '📈', port: 8501, desc: 'Streamlit ensemble forecasting & exchange rate models', ui: 'http://localhost:8501' },
};

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(body));
};

async function probe(id, target) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);
  const meta = serviceMeta[id] || { name: id };
  const t0 = performance.now();
  try {
    const probePath = id === 'agent' ? '/api/tags' : id === 'studio' ? '/api/tables' : '/api/health';
    let response = await fetch(`${target}${probePath}`, { signal: controller.signal });
    if (!response.ok && id !== 'agent') response = await fetch(target, { signal: controller.signal });
    const latency = Math.round(performance.now() - t0);
    return { id, name: meta.name, online: response.ok, status: response.status, latency, checked: response.url };
  } catch {
    const latency = Math.round(performance.now() - t0);
    return { id, name: meta.name, online: false, status: null, latency, checked: target };
  } finally {
    clearTimeout(timer);
  }
}

function resolveRoute(pathname) {
  if (pathname === '/db' || pathname.startsWith('/db/') || pathname.startsWith('/api/db/')) return { id: 'studio', path: pathname };
  const match = pathname.match(/^\/api\/(ultimate|studio|agent|family|finsync|oxfin|forex|equity)(\/.*)?$/);
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

function renderGatewayHtml(services, payload) {
  const onlineCount = services.filter(s => s.online).length;
  const totalCount = services.length;
  const onlineServices = services.filter(service => service.online);
  const avgLatency = onlineServices.length ? Math.round(onlineServices.reduce((acc, service) => acc + service.latency, 0) / onlineServices.length) : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GrowthTrack Gateway — Ecosystem Health & Hub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090d;
      --card-bg: rgba(22, 22, 30, 0.75);
      --card-hover: rgba(30, 30, 42, 0.9);
      --border: rgba(255, 255, 255, 0.08);
      --border-glow: rgba(139, 92, 246, 0.3);
      --text: #f4f4f6;
      --muted: #a1a1aa;
      --primary: #8b5cf6;
      --primary-light: #c084fc;
      --emerald: #10b981;
      --emerald-glow: rgba(16, 185, 129, 0.25);
      --danger: #ef4444;
      --danger-glow: rgba(239, 68, 68, 0.25);
      --font-sans: 'Outfit', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 0%, #15102a 0%, var(--bg) 65%);
      color: var(--text);
      font-family: var(--font-sans);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }
    header {
      background: rgba(13, 13, 18, 0.85);
      -webkit-backdrop-filter: blur(16px);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 2.5rem;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .brand-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--primary), #06b6d4);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
    }
    .brand-title {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: linear-gradient(to right, #fff, #c084fc);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .gateway-pill {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      padding: 0.2rem 0.6rem;
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid rgba(139, 92, 246, 0.3);
      color: var(--primary-light);
      border-radius: 9999px;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }
    .nav-link {
      color: var(--muted);
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 500;
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      transition: all 0.2s;
      border: 1px solid transparent;
    }
    .nav-link:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--border);
    }
    .nav-link.btn-cta {
      background: linear-gradient(135deg, var(--primary), #7c3aed);
      color: #fff;
      box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
    }
    .nav-link.btn-cta:hover {
      box-shadow: 0 0 25px rgba(139, 92, 246, 0.5);
      transform: translateY(-1px);
    }
    .container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 2.5rem;
      width: 100%;
      flex: 1;
    }
    .hero {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 2.5rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border);
    }
    .hero-title {
      font-size: 2.2rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      margin-bottom: 0.5rem;
    }
    .hero-desc {
      color: var(--muted);
      font-size: 1rem;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      margin-bottom: 2.5rem;
    }
    .kpi-card {
      background: var(--card-bg);
      -webkit-backdrop-filter: blur(12px);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      position: relative;
      overflow: hidden;
    }
    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg, transparent, var(--primary-light), transparent);
      opacity: 0.5;
    }
    .kpi-label {
      color: var(--muted);
      font-size: 0.8rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .kpi-value {
      font-size: 1.8rem;
      font-weight: 700;
      font-family: var(--font-mono);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .grid-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--emerald);
      box-shadow: 0 0 10px var(--emerald);
      display: inline-block;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.9); }
    }
    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }
    .service-card {
      background: var(--card-bg);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1.25rem;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    .service-card:hover {
      background: var(--card-hover);
      border-color: var(--border-glow);
      transform: translateY(-3px);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .card-header-left {
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    .service-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
    }
    .service-name {
      font-size: 1.1rem;
      font-weight: 600;
    }
    .service-port {
      font-family: var(--font-mono);
      font-size: 0.78rem;
      color: var(--muted);
      margin-top: 0.15rem;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
    }
    .status-badge.online {
      background: rgba(16, 185, 129, 0.15);
      color: var(--emerald);
      border: 1px solid rgba(16, 185, 129, 0.3);
      box-shadow: 0 0 12px var(--emerald-glow);
    }
    .status-badge.offline {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }
    .service-desc {
      color: #94a3b8;
      font-size: 0.88rem;
      line-height: 1.45;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .latency-pill {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--muted);
    }
    .card-actions {
      display: flex;
      gap: 0.6rem;
    }
    .btn-action {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border);
      color: #fff;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8rem;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.15s;
    }
    .btn-action:hover {
      background: var(--primary);
      border-color: var(--primary);
    }
    .json-section {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 1.5rem;
      margin-top: 1rem;
    }
    .json-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    pre {
      background: #060608;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.25rem;
      font-family: var(--font-mono);
      font-size: 0.82rem;
      color: #cbd5e1;
      overflow-x: auto;
      max-height: 350px;
    }
    footer {
      text-align: center;
      padding: 2rem;
      color: var(--muted);
      font-size: 0.85rem;
      border-top: 1px solid var(--border);
    }
    :where(a, button):focus-visible { outline: 2px solid var(--primary-light); outline-offset: 3px; }
    @media (max-width: 900px) {
      header { height: auto; min-height: 70px; padding: 0.85rem 1rem; gap: 0.75rem; flex-wrap: wrap; }
      .brand, .nav-links { min-width: 0; flex-wrap: wrap; }
      .nav-links { width: 100%; gap: 0.35rem; }
      .container { padding: 1.5rem 1rem; }
      .hero { align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
      .kpi-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .services-grid { grid-template-columns: minmax(0, 1fr); }
      .json-header, .grid-title { gap: 0.75rem; flex-wrap: wrap; }
    }
    @media (max-width: 520px) {
      .brand-title { font-size: 1rem; }
      .gateway-pill { display: none; }
      .hero-title { font-size: 1.7rem; }
      .kpi-row { grid-template-columns: minmax(0, 1fr); }
      .kpi-card, .service-card, .json-section { min-width: 0; padding: 1rem; }
      .card-top, .card-footer, .card-actions { gap: 0.75rem; flex-wrap: wrap; }
      pre { max-width: 100%; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { scroll-behavior: auto !important; animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">🌐</div>
      <div class="brand-title">GrowthTrack Gateway</div>
      <span class="gateway-pill">Port ${PORT}</span>
    </div>
    <nav class="nav-links">
      <a href="http://localhost:5000/Ultimate/" target="_blank" class="nav-link btn-cta">🚀 Open Ultimate</a>
      <a href="/api/docs" target="_blank" class="nav-link">📖 API Explorer</a>
      <a href="/db" target="_blank" class="nav-link">🗄️ DB Studio</a>
      <a href="/health?format=json" class="nav-link">JSON Feed</a>
    </nav>
  </header>

  <main class="container">
    <section class="hero">
      <div>
        <h1 class="hero-title">Ecosystem Health & Proxy Matrix</h1>
        <p class="hero-desc">Local service reachability and proxy status. Companion data migration into Ultimate is still in progress.</p>
      </div>
      <div>
        <span class="status-badge ${onlineCount > 0 ? 'online' : 'offline'}" style="font-size: 0.85rem; padding: 0.4rem 1rem;">
          <span class="live-dot" style="background: ${onlineCount > 0 ? 'var(--emerald)' : 'var(--danger)'}"></span>
          ${onlineCount}/${totalCount} Services Reachable
        </span>
      </div>
    </section>

    <div class="kpi-row">
      <div class="kpi-card">
        <span class="kpi-label">Gateway Status</span>
        <span class="kpi-value" style="color: var(--emerald)">ONLINE</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Active Proxies</span>
        <span class="kpi-value">${onlineCount} <span style="font-size: 0.9rem; color: var(--muted)">/ ${totalCount}</span></span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Gateway Port</span>
        <span class="kpi-value">${PORT}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Average Latency</span>
        <span class="kpi-value">${avgLatency ?? '—'} <span style="font-size: 0.9rem; color: var(--muted)">${avgLatency == null ? '' : 'ms'}</span></span>
      </div>
    </div>

    <div class="grid-title">
      <span>Local services and migration sources</span>
      <span style="font-size: 0.82rem; color: var(--muted); font-family: var(--font-mono)">Auto-refreshes every 10s</span>
    </div>

    <div class="services-grid">
      ${services.map(s => {
        const meta = serviceMeta[s.id] || { name: s.name, icon: '📦', port: '?', desc: '', ui: s.checked };
        const actionUrl = meta.ui || s.checked;
        return `
        <div class="service-card">
          <div class="card-top">
            <div class="card-header-left">
              <div class="service-icon">${meta.icon}</div>
              <div>
                <div class="service-name">${meta.name}</div>
                <div class="service-port">Port :${meta.port} • /api/${s.id}</div>
              </div>
            </div>
            <span class="status-badge ${s.online ? 'online' : 'offline'}">
              <span class="live-dot" style="background: ${s.online ? 'var(--emerald)' : 'var(--danger)'}"></span>
              ${s.online ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <div class="service-desc">${meta.desc}</div>
          <div class="card-footer">
            <span class="latency-pill">${s.online ? `⚡ ${s.latency} ms` : 'Unreachable'}</span>
            <div class="card-actions">
              ${actionUrl ? `<a href="${actionUrl}" target="_blank" class="btn-action">Open App ↗</a>` : ''}
              <a href="/api/${s.id}/health" target="_blank" class="btn-action" style="background:transparent; border-color:rgba(255,255,255,0.1)">API ↗</a>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <section class="json-section">
      <div class="json-header">
        <span style="font-weight: 600; font-size: 0.95rem;">Raw Health Payload (JSON)</span>
        <a href="/health?format=json" target="_blank" class="btn-action">Direct JSON Feed ↗</a>
      </div>
      <pre><code>${JSON.stringify(payload, null, 2)}</code></pre>
    </section>
  </main>

  <footer>
    GrowthTrack Workspace Unified Gateway • Running on Node ${process.version} • PID ${process.pid}
  </footer>

  <script>
    setTimeout(() => { window.location.reload(); }, 10000);
  </script>
</body>
</html>`;
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
      const payload = {
        status: 'online',
        gateway: { port: PORT },
        services,
        products: PRODUCTS.map(({ id, name, icon, color, uiUrl, apiPrefix, description }) => ({ id, name, icon, color, uiUrl, apiPrefix, description })),
      };

      if (req.headers.accept?.includes('text/html') && url.searchParams.get('format') !== 'json') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(renderGatewayHtml(services, payload));
      }

      return json(res, 200, payload);
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
