export function renderServerHealthHtml(payload) {
  const isHealthy = payload.status === 'online';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GrowthTrack Server — Core API Health & Diagnostics</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #08080c;
      --card-bg: rgba(20, 20, 28, 0.75);
      --card-hover: rgba(28, 28, 40, 0.9);
      --border: rgba(255, 255, 255, 0.08);
      --primary: #8b5cf6;
      --primary-light: #c084fc;
      --emerald: #10b981;
      --emerald-glow: rgba(16, 185, 129, 0.3);
      --danger: #ef4444;
      --text: #f4f4f6;
      --muted: #a1a1aa;
      --font-sans: 'Outfit', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 0%, #171133 0%, var(--bg) 70%);
      color: var(--text);
      font-family: var(--font-sans);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: rgba(12, 12, 18, 0.85);
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
      font-size: 1.2rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: linear-gradient(to right, #fff, #c084fc);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .port-pill {
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
      gap: 1rem;
    }
    .nav-link {
      color: var(--muted);
      text-decoration: none;
      font-size: 0.85rem;
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
    .nav-link.cta {
      background: linear-gradient(135deg, var(--primary), #7c3aed);
      color: #fff;
    }
    .container {
      max-width: 1200px;
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
    .live-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-family: var(--font-mono);
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.4rem 1rem;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.15);
      color: var(--emerald);
      border: 1px solid rgba(16, 185, 129, 0.3);
      box-shadow: 0 0 15px var(--emerald-glow);
    }
    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--emerald);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.9); }
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      margin-bottom: 2.5rem;
    }
    .kpi-card {
      background: var(--card-bg);
      -webkit-backdrop-filter: blur(14px);
      backdrop-filter: blur(14px);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      position: relative;
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
      font-size: 0.78rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .kpi-value {
      font-size: 1.7rem;
      font-weight: 700;
      font-family: var(--font-mono);
      display: flex;
      align-items: baseline;
      gap: 0.4rem;
    }
    .progress-bar-bg {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      margin-top: 0.5rem;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary), var(--emerald));
      border-radius: 9999px;
      transition: width 0.5s ease;
    }
    .section-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
    }
    .subsystems-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
      margin-bottom: 2.5rem;
    }
    .subsystem-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s;
    }
    .subsystem-card:hover {
      background: var(--card-hover);
      border-color: rgba(255, 255, 255, 0.15);
      transform: translateY(-2px);
    }
    .subsystem-name {
      font-weight: 600;
      font-size: 1rem;
      margin-bottom: 0.2rem;
    }
    .subsystem-desc {
      font-size: 0.82rem;
      color: var(--muted);
      font-family: var(--font-mono);
    }
    .status-pill {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.12);
      color: var(--emerald);
      border: 1px solid rgba(16, 185, 129, 0.25);
    }
    .json-box {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 1.5rem;
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
      max-height: 320px;
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
      .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .subsystems-grid { grid-template-columns: minmax(0, 1fr); }
      .json-header { gap: 0.75rem; flex-wrap: wrap; }
    }
    @media (max-width: 520px) {
      .brand-title { font-size: 1rem; }
      .port-pill { display: none; }
      .hero-title { font-size: 1.7rem; }
      .kpi-grid { grid-template-columns: minmax(0, 1fr); }
      .kpi-card, .json-box { min-width: 0; padding: 1rem; }
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
      <div class="brand-icon">⚡</div>
      <div class="brand-title">GrowthTrack Server</div>
      <span class="port-pill">Direct API :${payload.port}</span>
    </div>
    <nav class="nav-links">
      <a href="http://127.0.0.1:5000/Ultimate/" target="_blank" rel="noopener noreferrer" class="nav-link cta">🚀 Open Ultimate</a>
      <a href="/api/docs" target="_blank" rel="noopener noreferrer" class="nav-link">📖 API Explorer</a>
      <a href="http://localhost:5556" target="_blank" rel="noopener noreferrer" class="nav-link">🗄️ DB Studio</a>
      <a href="http://localhost:3000/health" target="_blank" rel="noopener noreferrer" class="nav-link">🌐 Gateway Hub</a>
      <a href="/api/health?format=json" class="nav-link">Raw JSON</a>
    </nav>
  </header>

  <main class="container">
    <section class="hero">
      <div>
        <h1 class="hero-title">Core API Diagnostics & Telemetry</h1>
        <p class="hero-desc">Live engine performance metrics, SQLite database telemetry, and domain subsystems.</p>
      </div>
      <div>
        <span class="live-badge">
          <span class="live-dot"></span>
          ${payload.status.toUpperCase()} • PID ${process.pid}
        </span>
      </div>
    </section>

    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Database Connection</span>
        <span class="kpi-value" style="color: var(--emerald)">${payload.database.status}</span>
        <span style="font-size: 0.78rem; color: var(--muted); font-family: var(--font-mono)">${payload.database.file} • ${payload.database.latencyMs} ms</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Uptime</span>
        <span class="kpi-value">${payload.uptimeFormatted}</span>
        <span style="font-size: 0.78rem; color: var(--muted); font-family: var(--font-mono)">${payload.uptimeSeconds} seconds running</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Memory Heap</span>
        <span class="kpi-value">${payload.memory.heapUsedMB} <span style="font-size: 0.85rem; color: var(--muted)">/ ${payload.memory.heapTotalMB} MB</span></span>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${payload.memory.heapPercent}%"></div>
        </div>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Runtime</span>
        <span class="kpi-value">${payload.nodeVersion}</span>
        <span style="font-size: 0.78rem; color: var(--muted); font-family: var(--font-mono)">${payload.platform}</span>
      </div>
    </div>

    <div class="section-title">Domain Subsystems & Handlers</div>
    <div class="subsystems-grid">
      ${Object.entries(payload.subsystems).map(([key, val]) => `
        <div class="subsystem-card">
          <div>
            <div class="subsystem-name">${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
            <div class="subsystem-desc">${val}</div>
          </div>
          <span class="status-pill">CONFIGURED</span>
        </div>
      `).join('')}
    </div>

    <section class="json-box">
      <div class="json-header">
        <span style="font-weight: 600; font-size: 0.95rem;">Raw Telemetry Payload</span>
        <a href="/api/health?format=json" target="_blank" class="nav-link" style="padding: 0.25rem 0.6rem; font-size: 0.78rem;">View Raw JSON ↗</a>
      </div>
      <pre><code>${JSON.stringify(payload, null, 2)}</code></pre>
    </section>
  </main>

  <footer>
    GrowthTrack Ultimate v${payload.version} • Built with Node.js & Prisma ORM
  </footer>

  <script>
    setTimeout(() => { window.location.reload(); }, 15000);
  </script>
</body>
</html>`;
}
