// Fixed workload against a disposable loopback console. Never uses local envs,
// configured databases, credentials, or a user-supplied target URL.
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { performance } from 'node:perf_hooks';
import { createSqliteSource } from './database-sources.mjs';
import { createDatabaseStudio } from './db-studio.mjs';

const directory = await mkdtemp(path.join(os.tmpdir(), 'ultimate-load-smoke-'));
const sources = new Map();
const latencies = [];
const concurrency = 8, requests = 200;
let server;
try {
  for (const id of ['first', 'second']) {
    const filename = path.join(directory, `${id}.db`);
    const db = new DatabaseSync(filename);
    try {
      db.exec('CREATE TABLE fixture (id INTEGER PRIMARY KEY, source TEXT NOT NULL)');
      const insert = db.prepare('INSERT INTO fixture VALUES (?, ?)');
      for (let n = 1; n <= 1000; n++) insert.run(n, id);
    } finally { db.close(); }
    sources.set(id, { name: id, provider: 'SQLite', adapter: createSqliteSource(filename) });
  }
  server = createDatabaseStudio({ sources });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (url, options) => fetch(base + url, { ...options, signal: AbortSignal.timeout(10_000) });
  const workers = await Promise.allSettled(Array.from({ length: concurrency }, async (_, worker) => {
    for (let i = worker; i < requests; i += concurrency) {
      const source = i % 2 ? 'first' : 'second';
      const page = i % 4 + 1;
      const start = performance.now();
      const response = await request(`/api/table/fixture?source=${source}&limit=250&page=${page}`);
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.total, 1000);
      assert.equal(data.rows.length, 250);
      assert(data.rows.every(row => row.source === source && row.id > (page - 1) * 250 && row.id <= page * 250));
      latencies.push(performance.now() - start);
    }
  }));
  const failed = workers.find(worker => worker.status === 'rejected');
  if (failed) throw failed.reason;
  assert.equal((await request('/api/table/fixture?source=first&limit=251')).status, 400);
  assert.equal((await request('/api/tables?source=unknown')).status, 400);
  assert.equal((await request('/api/query?source=first', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'DELETE FROM fixture' }) })).status, 403);
  for (const source of sources.values()) assert.equal((await source.adapter.query('SELECT COUNT(*) AS total FROM fixture')).rows[0].total, 1000);
  latencies.sort((a, b) => a - b);
  const report = { scope: 'Disposable SQLite database console only; not production capacity or authenticated application API coverage', concurrency, requests, completed: latencies.length, p50Ms: latencies[Math.ceil(requests * .5) - 1], p95Ms: latencies[Math.ceil(requests * .95) - 1] };
  const output = path.resolve(import.meta.dirname, '../../.gstack/benchmark-reports');
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'api-load-smoke.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  server?.closeAllConnections();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  if (!server) for (const source of sources.values()) await source.adapter.close();
  await rm(directory, { recursive: true, force: true });
}

