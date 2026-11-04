import { readFileSync } from 'node:fs';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createDatabaseSources } from './database-sources.mjs';

const PORT = Number(process.env.DB_STUDIO_PORT || 5556);

const viewFile = name => readFileSync(new URL('./db-studio/' + name, import.meta.url), 'utf8');
const html = viewFile('console.html')
  .replace('/* STUDIO_STYLES */', () => viewFile('console.css'))
  .replace('/* STUDIO_SCRIPT */', () => viewFile('console.js'));
function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(data));
}

export function createDatabaseStudio({ sources = createDatabaseSources() } = {}) {
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/db')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  if (req.method === 'GET' && url.pathname === '/api/sources') {
    const status = await Promise.all([...sources].map(async ([id, source]) => {
      try { await source.adapter.ping(); return { id, name: source.name, provider: source.provider, online: true }; }
      catch { return { id, name: source.name, provider: source.provider, online: false }; }
    }));
    return json(res, 200, status);
  }
  const source = sources.get(url.searchParams.get('source') || 'ultimate');
  if (!source) return json(res, 400, { error: 'Unknown database source' });

  if (req.method === 'GET' && url.pathname === '/api/tables') {
    try {
      return json(res, 200, await source.adapter.tables());
    } catch (e) {
      return json(res, 503, { error: 'Database unavailable' });
    }
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/table/')) {
    let tableName;
    try { tableName = decodeURIComponent(url.pathname.slice('/api/table/'.length)); }
    catch { return json(res, 400, { error: 'Invalid table name' }); }
    const page = Number(url.searchParams.get('page') || 1);
    const limit = Number(url.searchParams.get('limit') || 50);
    if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 250) return json(res, 400, { error: 'Invalid pagination' });

    try {
      return json(res, 200, await source.adapter.rows(tableName, page, limit));
    } catch (e) {
      return json(res, 400, { error: 'Table unavailable' });
    }
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/schema/')) {
    let tableName;
    try { tableName = decodeURIComponent(url.pathname.slice('/api/schema/'.length)); }
    catch { return json(res, 400, { error: 'Invalid table name' }); }
    try {
      return json(res, 200, await source.adapter.schema(tableName));
    } catch (e) {
      return json(res, 400, { error: 'Table unavailable' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/query') {
    let body = '';
    let oversized = false;
    req.on('data', chunk => { if (body.length + chunk.length > 64 * 1024) oversized = true; else body += chunk; });
    req.on('end', async () => {
      if (oversized) return json(res, 413, { error: 'Query is too large' });
      try {
        const { query } = JSON.parse(body || '{}');
        if (!query || typeof query !== 'string') return json(res, 400, { error: 'Query string required' });
        const trimmed = query.trim().toUpperCase();
        if (!/^(SELECT|WITH|PRAGMA|EXPLAIN)\b/.test(trimmed)) {
          return json(res, 403, { error: 'Only read-only queries are permitted in Studio.' });
        }
        return json(res, 200, await source.adapter.query(query));
      } catch (e) {
        return json(res, 400, { error: 'Read-only query could not be completed' });
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});
server.on('close', () => { for (const source of sources.values()) source.adapter.close?.(); });
return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createDatabaseStudio().listen(PORT, '127.0.0.1', () => console.log(`[db-studio] All local databases at http://localhost:${PORT}`));
}
