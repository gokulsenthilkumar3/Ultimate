import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const dbPath = path.join(root, 'dev.db');
const PORT = Number(process.env.DB_STUDIO_PORT || 5556);

let db;
try {
  db = new DatabaseSync(dbPath, { readOnly: true });
  console.log(`[db-studio] Connected to SQLite database: ${dbPath}`);
} catch (err) {
  console.error(`[db-studio] Failed to open SQLite database at ${dbPath}:`, err.message);
  process.exit(1);
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GrowthTrack DB Studio — Visual SQLite Workbench</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #07070a;
      --sidebar: #0e0e14;
      --card: #151520;
      --card-hover: #1c1c2b;
      --border: rgba(255, 255, 255, 0.08);
      --border-focus: rgba(139, 92, 246, 0.5);
      --text: #f4f4f7;
      --muted: #a1a1aa;
      --primary: #8b5cf6;
      --primary-light: #c084fc;
      --primary-dim: rgba(139, 92, 246, 0.12);
      --emerald: #10b981;
      --emerald-dim: rgba(16, 185, 129, 0.12);
      --danger: #ef4444;
      --font-sans: 'Outfit', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    header {
      background: var(--sidebar);
      border-bottom: 1px solid var(--border);
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.75rem;
      flex-shrink: 0;
      z-index: 20;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      font-weight: 700;
      font-size: 1.15rem;
    }
    .brand-icon {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, var(--primary), #06b6d4);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      box-shadow: 0 0 15px rgba(139, 92, 246, 0.35);
    }
    .badge {
      background: var(--primary-dim);
      color: var(--primary-light);
      border: 1px solid rgba(139, 92, 246, 0.25);
      padding: 0.18rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-family: var(--font-mono);
    }
    .header-stats {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      font-size: 0.82rem;
      color: var(--muted);
      font-family: var(--font-mono);
    }
    .stat-chip {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--emerald);
      box-shadow: 0 0 8px var(--emerald);
    }
    .header-links {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .header-btn {
      color: var(--muted);
      text-decoration: none;
      font-size: 0.82rem;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.03);
      transition: all 0.15s;
    }
    .header-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .sidebar {
      width: 290px;
      background: var(--sidebar);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .sidebar-search {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--border);
    }
    .search-input {
      width: 100%;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.5rem 0.85rem;
      color: var(--text);
      font-size: 0.85rem;
      outline: none;
      transition: all 0.2s;
    }
    .search-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 10px rgba(139, 92, 246, 0.2);
    }
    .table-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.6rem;
      list-style: none;
    }
    .table-item {
      padding: 0.55rem 0.85rem;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.88rem;
      color: #cbd5e1;
      transition: all 0.15s;
      margin-bottom: 0.2rem;
    }
    .table-item button { display: flex; align-items: center; justify-content: space-between; gap: .5rem; width: 100%; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
    .table-item:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }
    .table-item.active {
      background: var(--primary-dim);
      color: var(--primary-light);
      font-weight: 600;
      border-left: 3px solid var(--primary);
    }
    .table-count-badge {
      font-size: 0.72rem;
      font-family: var(--font-mono);
      background: rgba(255, 255, 255, 0.06);
      padding: 0.12rem 0.45rem;
      border-radius: 4px;
      color: var(--muted);
    }
    .table-item.active .table-count-badge {
      background: rgba(139, 92, 246, 0.25);
      color: #fff;
    }
    .main-workspace {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #0a0a0f;
    }
    .nav-tabs {
      background: var(--sidebar);
      border-bottom: 1px solid var(--border);
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem 1.75rem 0;
    }
    .nav-tab {
      border: 0;
      background: transparent;
      font-family: inherit;
      padding: 0.55rem 1.1rem;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      color: var(--muted);
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.15s;
    }
    .nav-tab:hover { color: #fff; }
    .nav-tab.active {
      color: var(--primary-light);
      border-bottom-color: var(--primary);
      font-weight: 600;
    }
    .panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 1.5rem;
    }
    .panel.hidden { display: none; }
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .table-meta {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .table-title {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .actions-group {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .btn {
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.45rem 0.9rem;
      border-radius: 7px;
      font-size: 0.84rem;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.2); }
    .btn-primary {
      background: linear-gradient(135deg, var(--primary), #7c3aed);
      border-color: var(--primary);
      color: #fff;
      font-weight: 600;
    }
    .btn-primary:hover {
      box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
    }
    .grid-container {
      flex: 1;
      overflow: auto;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--card);
      position: relative;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.84rem;
    }
    th {
      position: sticky;
      top: 0;
      background: #181822;
      text-align: left;
      padding: 0.75rem 0.95rem;
      border-bottom: 1px solid var(--border);
      font-weight: 600;
      color: #e2e8f0;
      white-space: nowrap;
      z-index: 5;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s;
    }
    th:hover { background: #222230; }
    td {
      padding: 0.6rem 0.95rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #cbd5e1;
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: var(--font-mono);
      font-size: 0.8rem;
    }
    tr { cursor: pointer; transition: background 0.1s; }
    tr:hover td { background: rgba(255, 255, 255, 0.03); color: #fff; }
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
      font-size: 0.85rem;
      color: var(--muted);
    }
    .page-controls { display: flex; gap: 0.5rem; align-items: center; }
    select.page-select {
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.35rem 0.6rem;
      border-radius: 6px;
      font-size: 0.82rem;
      outline: none;
    }
    /* SQL Runner Panel */
    .sql-input {
      width: 100%;
      height: 120px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1rem;
      color: #fff;
      font-family: var(--font-mono);
      font-size: 0.9rem;
      line-height: 1.5;
      resize: vertical;
      outline: none;
      margin-bottom: 1rem;
      transition: all 0.2s;
    }
    .sql-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
    }
    .sql-snippets {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .snippet-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      color: var(--muted);
      padding: 0.25rem 0.6rem;
      border-radius: 5px;
      font-size: 0.78rem;
      font-family: var(--font-mono);
      cursor: pointer;
      transition: all 0.15s;
    }
    .snippet-btn:hover {
      background: var(--primary-dim);
      color: var(--primary-light);
      border-color: var(--primary);
    }
    /* Modal / Drawer for row inspect */
    .drawer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: 100;
      display: none;
      justify-content: flex-end;
    }
    .drawer-overlay.active { display: flex; }
    .drawer {
      width: 550px;
      background: #111118;
      border-left: 1px solid var(--border);
      height: 100%;
      display: flex;
      flex-direction: column;
      box-shadow: -10px 0 30px rgba(0, 0, 0, 0.7);
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    .drawer-header {
      padding: 1.25rem 1.75rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .field-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.85rem 1rem;
    }
    .field-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--primary-light);
      font-family: var(--font-mono);
      margin-bottom: 0.35rem;
    }
    .field-value {
      font-family: var(--font-mono);
      font-size: 0.84rem;
      color: #f1f5f9;
      white-space: pre-wrap;
      word-break: break-all;
    }
    :where(button, a, input, textarea, .table-item, .nav-tab, tbody tr[tabindex]):focus-visible {
      outline: 2px solid var(--primary-light);
      outline-offset: 2px;
    }
    @media (max-width: 900px) {
      body { height: auto; min-height: 100dvh; overflow-x: hidden; overflow-y: auto; }
      header { height: auto; min-height: 60px; padding: 0.85rem 1rem; gap: 0.75rem; flex-wrap: wrap; }
      .brand, .header-links, .header-stats { min-width: 0; flex-wrap: wrap; }
      .header-links { width: 100%; gap: 0.5rem; }
      .layout { display: block; overflow: visible; min-width: 0; }
      .sidebar { width: 100%; max-height: 260px; border-right: 0; border-bottom: 1px solid var(--border); }
      .main-workspace { min-width: 0; min-height: 620px; overflow: visible; }
      .nav-tabs { overflow-x: auto; padding: 0.4rem 1rem 0; }
      .nav-tab { white-space: nowrap; }
      .panel { min-height: 520px; overflow: visible; padding: 1rem; }
      .grid-container { min-height: 360px; max-width: 100%; }
      .toolbar, .actions-group { min-width: 0; flex-wrap: wrap; }
      .drawer { max-width: 100vw; }
    }
    @media (max-width: 520px) {
      .brand { font-size: 1rem; }
      .header-stats { width: 100%; }
      .header-btn { min-height: 40px; display: inline-flex; align-items: center; }
      .table-meta { flex-wrap: wrap; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { scroll-behavior: auto !important; animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">🗄️</div>
      <span>GrowthTrack DB Studio</span>
      <span class="badge">SQLite dev.db</span>
    </div>
    <div class="header-stats">
      <div class="stat-chip"><span class="live-dot"></span> SQLite 3 Engine</div>
      <div class="stat-chip">Tables: <span id="stat-tables-count" style="color:#fff; font-weight:600">0</span></div>
      <div class="stat-chip">Records: <span id="stat-records-count" style="color:#fff; font-weight:600">0</span></div>
    </div>
    <div class="header-links">
      <a href="http://localhost:5000/Ultimate/" target="_blank" class="header-btn" style="color:#c084fc; border-color:rgba(139,92,246,0.3)">🚀 Ultimate UI (:5000)</a>
      <a href="http://localhost:3001/api/docs" target="_blank" class="header-btn">📖 API Explorer (:3001)</a>
      <a href="http://localhost:3000/health" target="_blank" class="header-btn">🌐 Gateway (:3000)</a>
    </div>
  </header>

  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-search">
        <input type="text" id="table-search" class="search-input" placeholder="Search 40 tables..." oninput="filterTables()">
      </div>
      <ul id="table-list" class="table-list"></ul>
    </aside>

    <main class="main-workspace">
      <div class="nav-tabs">
        <button type="button" id="tab-data" class="nav-tab active" onclick="switchTab('data')">📊 Table Data Grid</button>
        <button type="button" id="tab-schema" class="nav-tab" onclick="switchTab('schema')">📐 Schema & Types</button>
        <button type="button" id="tab-sql" class="nav-tab" onclick="switchTab('sql')">⚡ SQL Query Runner</button>
      </div>

      <!-- Panel: Data Grid -->
      <div id="panel-data" class="panel">
        <div class="toolbar">
          <div class="table-meta">
            <span id="current-table-name" class="table-title">Select a table</span>
            <span id="current-table-badge" class="badge" style="display:none">0 rows</span>
          </div>
          <div class="actions-group">
            <button class="btn" onclick="exportCSV()">📥 Export CSV</button>
            <button class="btn" onclick="exportJSON()">📦 Export JSON</button>
            <button class="btn btn-primary" onclick="loadTableData()">↻ Refresh</button>
          </div>
        </div>

        <div class="grid-container">
          <table id="data-table">
            <thead id="data-thead"></thead>
            <tbody id="data-tbody"></tbody>
          </table>
        </div>

        <div class="pagination-bar">
          <span id="page-info">Showing 0 records</span>
          <div class="page-controls">
            <label style="font-size:0.8rem">Per Page:</label>
            <select class="page-select" id="page-size" onchange="changeLimit(this.value)">
              <option value="25">25</option>
              <option value="50" selected>50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
            <button id="btn-prev" class="btn" onclick="prevPage()">← Previous</button>
            <button id="btn-next" class="btn" onclick="nextPage()">Next →</button>
          </div>
        </div>
      </div>

      <!-- Panel: Schema -->
      <div id="panel-schema" class="panel hidden">
        <div class="toolbar">
          <div class="table-meta">
            <span class="table-title">Schema Architecture: <span id="schema-table-name" style="color:var(--primary-light)">-</span></span>
          </div>
        </div>
        <div class="grid-container">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Column Name</th>
                <th>SQL Type</th>
                <th>Nullability</th>
                <th>Default Value</th>
                <th>Key Constraint</th>
              </tr>
            </thead>
            <tbody id="schema-tbody"></tbody>
          </table>
        </div>
      </div>

      <!-- Panel: SQL Runner -->
      <div id="panel-sql" class="panel hidden">
        <div class="toolbar">
          <div class="table-meta">
            <span class="table-title">Interactive SQL Console</span>
          </div>
          <button class="btn btn-primary" onclick="runSql()">▶ Execute Query (Ctrl+Enter)</button>
        </div>

        <div class="sql-snippets">
          <span style="font-size:0.8rem; color:var(--muted); align-self:center;">Templates:</span>
          <button class="snippet-btn" onclick="setQuery('SELECT * FROM User LIMIT 10;')">SELECT Users</button>
          <button class="snippet-btn" onclick="setQuery('SELECT id, title, priority, status FROM Task ORDER BY createdAt DESC LIMIT 20;')">Recent Tasks</button>
          <button class="snippet-btn" onclick="setQuery('SELECT name, type FROM sqlite_master WHERE type=\\'table\\' ORDER BY name;')">Show Tables</button>
          <button class="snippet-btn" onclick="setQuery('PRAGMA database_list;')">PRAGMA DB List</button>
        </div>

        <textarea id="sql-input" class="sql-input" placeholder="SELECT * FROM User LIMIT 10;"></textarea>
        <div id="sql-status" style="font-size: 0.85rem; color: var(--muted); margin-bottom: 0.75rem;"></div>

        <div class="grid-container">
          <table>
            <thead id="sql-thead"></thead>
            <tbody id="sql-tbody"></tbody>
          </table>
        </div>
      </div>
    </main>
  </div>

  <!-- Row Detail Drawer -->
  <div id="row-drawer" class="drawer-overlay" onclick="closeDrawer(event)">
    <div class="drawer" onclick="event.stopPropagation()">
      <div class="drawer-header">
        <div>
          <h3 style="font-size:1.1rem; font-weight:700">Record Inspector</h3>
          <span id="drawer-subtitle" style="font-size:0.8rem; color:var(--muted); font-family:var(--font-mono)"></span>
        </div>
        <button class="btn" onclick="closeDrawer()" aria-label="Close record inspector" style="padding:0.25rem 0.6rem">✕</button>
      </div>
      <div id="drawer-body" class="drawer-body"></div>
    </div>
  </div>

  <script>
    let tables = [];
    let currentTable = '';
    let currentPage = 1;
    let limit = 50;
    let currentRows = [];
    let currentColumns = [];

    async function init() {
      const res = await fetch('/api/tables');
      tables = await res.json();
      document.getElementById('stat-tables-count').innerText = tables.length;
      const totalRecs = tables.reduce((acc, t) => acc + (t.count || 0), 0);
      document.getElementById('stat-records-count').innerText = totalRecs.toLocaleString();
      renderTableList(tables);
      if (tables.length > 0) {
        selectTable(tables[0].name);
      }
    }

    function renderTableList(list) {
      const ul = document.getElementById('table-list');
      ul.replaceChildren(...list.map(t => {
        const item = document.createElement('li');
        item.className = 'table-item' + (t.name === currentTable ? ' active' : '');
        const button = document.createElement('button');
        button.type = 'button';
        button.onclick = () => selectTable(t.name);
        button.setAttribute('aria-current', t.name === currentTable ? 'true' : 'false');
        const name = document.createElement('span');
        name.textContent = t.name;
        const count = document.createElement('span');
        count.className = 'table-count-badge';
        count.textContent = String(t.count);
        button.append(name, count);
        item.append(button);
        return item;
      }));
    }

    function filterTables() {
      const q = document.getElementById('table-search').value.toLowerCase();
      renderTableList(tables.filter(t => t.name.toLowerCase().includes(q)));
    }

    function switchTab(tab) {
      document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(el => el.classList.add('hidden'));
      document.getElementById('tab-' + tab).classList.add('active');
      document.getElementById('panel-' + tab).classList.remove('hidden');
      if (tab === 'schema') loadSchema();
    }

    async function selectTable(name) {
      currentTable = name;
      currentPage = 1;
      document.getElementById('current-table-name').innerText = name;
      document.getElementById('schema-table-name').innerText = name;
      filterTables();
      await loadTableData();
    }

    function changeLimit(val) {
      limit = Number(val);
      currentPage = 1;
      loadTableData();
    }

    function renderGrid(thead, tbody, columns, rows, onInspect) {
      const header = document.createElement('tr');
      for (const column of columns) {
        const th = document.createElement('th');
        th.textContent = column;
        header.append(th);
      }
      thead.replaceChildren(header);
      if (!rows.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = columns.length || 1;
        td.textContent = 'No records';
        tr.append(td);
        tbody.replaceChildren(tr);
        return;
      }
      tbody.replaceChildren(...rows.map((row, index) => {
        const tr = document.createElement('tr');
        if (onInspect) {
          tr.tabIndex = 0;
          tr.setAttribute('aria-label', 'Inspect row ' + (index + 1));
          tr.onclick = () => onInspect(index);
          tr.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onInspect(index); } };
        }
        for (const column of columns) {
          const td = document.createElement('td');
          const value = row[column];
          td.textContent = value == null ? 'null' : typeof value === 'object' ? JSON.stringify(value) : String(value);
          td.title = td.textContent;
          tr.append(td);
        }
        return tr;
      }));
    }

    async function loadTableData() {
      if (!currentTable) return;
      const res = await fetch(\`/api/table/\${encodeURIComponent(currentTable)}?page=\${currentPage}&limit=\${limit}\`);
      const data = await res.json();
      currentRows = data.rows || [];
      currentColumns = data.columns || [];

      const badge = document.getElementById('current-table-badge');
      badge.style.display = 'inline-block';
      badge.innerText = \`\${data.total.toLocaleString()} total rows\`;

      renderGrid(document.getElementById('data-thead'), document.getElementById('data-tbody'), currentColumns, currentRows, inspectRow);

      const totalPages = Math.ceil(data.total / limit) || 1;
      document.getElementById('page-info').innerText = \`Page \${currentPage} of \${totalPages} (\${data.total} rows)\`;
      document.getElementById('btn-prev').disabled = currentPage <= 1;
      document.getElementById('btn-next').disabled = currentPage >= totalPages;
    }

    function inspectRow(idx) {
      const row = currentRows[idx];
      if (!row) return;
      document.getElementById('drawer-subtitle').innerText = \`Table: \${currentTable} • Row #\${idx + 1}\`;
      const body = document.getElementById('drawer-body');
      body.replaceChildren(...currentColumns.map(col => {
        let val = row[col];
        let formatted = val;
        let isJson = false;
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try {
            formatted = JSON.stringify(JSON.parse(val), null, 2);
            isJson = true;
          } catch {}
        }
        const card = document.createElement('div');
        card.className = 'field-card';
        const label = document.createElement('div');
        label.className = 'field-label';
        label.textContent = col + (isJson ? ' [JSON]' : '');
        const value = document.createElement('div');
        value.className = 'field-value';
        value.textContent = val == null ? 'null' : typeof formatted === 'object' ? JSON.stringify(formatted) : String(formatted);
        card.append(label, value);
        return card;
      }));
      document.getElementById('row-drawer').classList.add('active');
    }

    function closeDrawer(e) {
      document.getElementById('row-drawer').classList.remove('active');
    }

    async function loadSchema() {
      if (!currentTable) return;
      const res = await fetch(\`/api/schema/\${encodeURIComponent(currentTable)}\`);
      const schema = await res.json();
      const tbody = document.getElementById('schema-tbody');
      tbody.replaceChildren(...schema.map(c => {
        const tr = document.createElement('tr');
        for (const value of [c.cid, c.name, c.type || 'TEXT', c.notnull ? 'NOT NULL' : 'NULLABLE', c.dfl_value ?? '—', c.pk ? 'PRIMARY KEY' : '—']) {
          const td = document.createElement('td');
          td.textContent = String(value);
          tr.append(td);
        }
        return tr;
      }));
    }

    function prevPage() {
      if (currentPage > 1) { currentPage--; loadTableData(); }
    }
    function nextPage() {
      currentPage++; loadTableData();
    }

    function setQuery(sql) {
      document.getElementById('sql-input').value = sql;
      runSql();
    }

    async function runSql() {
      const q = document.getElementById('sql-input').value.trim();
      if (!q) return;
      const status = document.getElementById('sql-status');
      status.innerText = '⚡ Executing query...';
      const t0 = performance.now();
      try {
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q })
        });
        const data = await res.json();
        const duration = (performance.now() - t0).toFixed(2);
        if (!res.ok) {
          status.innerText = \`❌ Error (\${duration}ms): \${data.error}\`;
          status.style.color = 'var(--danger)';
          return;
        }
        status.innerText = \`✓ Query executed in \${duration}ms — returned \${data.rows.length} rows\`;
        status.style.color = 'var(--emerald)';

        const thead = document.getElementById('sql-thead');
        const tbody = document.getElementById('sql-tbody');
        const cols = data.columns || [];
        renderGrid(thead, tbody, cols, data.rows || []);
      } catch (err) {
        status.innerText = 'Network error: ' + err.message;
        status.style.color = 'var(--danger)';
      }
    }

    document.getElementById('sql-input').addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') runSql();
    });

    function exportJSON() {
      const blob = new Blob([JSON.stringify(currentRows, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = \`\${currentTable}-export.json\`;
      a.click();
    }

    function exportCSV() {
      if (!currentRows.length) return;
      const cols = currentColumns;
      const lines = [cols.join(',')];
      currentRows.forEach(row => {
        lines.push(cols.map(c => JSON.stringify(row[c] ?? '')).join(','));
      });
      const blob = new Blob([lines.join('\\n')], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = \`\${currentTable}-export.csv\`;
      a.click();
    }

    init();
  </script>
</body>
</html>`;

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/db')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  if (req.method === 'GET' && url.pathname === '/api/tables') {
    try {
      const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name`).all();
      const result = tables.map(t => {
        const countRow = db.prepare(`SELECT COUNT(*) as count FROM "${t.name}"`).get();
        return { name: t.name, count: countRow ? countRow.count : 0 };
      });
      return json(res, 200, result);
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/table/')) {
    const tableName = decodeURIComponent(url.pathname.slice('/api/table/'.length));
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const limit = Math.min(250, Math.max(1, Number(url.searchParams.get('limit') || 50)));
    const offset = (page - 1) * limit;

    try {
      const cols = db.prepare(`PRAGMA table_info("${tableName}")`).all().map(c => c.name);
      const totalRow = db.prepare(`SELECT COUNT(*) as total FROM "${tableName}"`).get();
      const rows = db.prepare(`SELECT * FROM "${tableName}" LIMIT ${limit} OFFSET ${offset}`).all();
      return json(res, 200, { columns: cols, rows, total: totalRow ? totalRow.total : 0, page, limit });
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/schema/')) {
    const tableName = decodeURIComponent(url.pathname.slice('/api/schema/'.length));
    try {
      const schema = db.prepare(`PRAGMA table_info("${tableName}")`).all();
      return json(res, 200, schema);
    } catch (e) {
      return json(res, 500, { error: e.message });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/query') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { query } = JSON.parse(body || '{}');
        if (!query || typeof query !== 'string') return json(res, 400, { error: 'Query string required' });
        const trimmed = query.trim().toUpperCase();
        if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('PRAGMA') && !trimmed.startsWith('EXPLAIN')) {
          return json(res, 403, { error: 'Only read-only queries (SELECT, PRAGMA, EXPLAIN) are permitted in Studio.' });
        }
        const rows = db.prepare(query).all();
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        return json(res, 200, { columns, rows });
      } catch (e) {
        return json(res, 400, { error: e.message });
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[db-studio] Running at http://localhost:${PORT}`);
});
