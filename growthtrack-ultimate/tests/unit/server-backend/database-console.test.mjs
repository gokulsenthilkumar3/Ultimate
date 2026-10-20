import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createSqliteSource } from '../../../scripts/database-sources.mjs';
import { createDatabaseStudio } from '../../../scripts/db-studio.mjs';
import vm from 'node:vm';

test('console keeps source selection isolated and database access read-only', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ultimate-console-'));
  const sources = new Map();
  for (const [id, value] of [['first', 1], ['second', 2]]) {
    const filename = path.join(directory, `${id}.db`);
    const writer = new DatabaseSync(filename);
    writer.exec(`CREATE TABLE fixture (id INTEGER PRIMARY KEY); INSERT INTO fixture VALUES (${value})`); writer.close();
    sources.set(id, { name: id, provider: 'SQLite', adapter: createSqliteSource(filename) });
  }
  const server = createDatabaseStudio({ sources });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const html = await (await fetch(base)).text();
    new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
    const status = await (await fetch(base + '/api/sources')).json();
    assert.ok(status.every(source => source.online));
    for (const [id, value] of [['first', 1], ['second', 2]]) {
      const rows = await (await fetch(`${base}/api/table/fixture?source=${id}`)).json();
      assert.deepEqual(rows.rows, [{ id: value }]);
    }
    assert.equal((await fetch(`${base}/api/tables?source=unknown`)).status, 400);
    assert.equal((await fetch(`${base}/api/table/fixture?source=first&page=NaN`)).status, 400);
    assert.equal((await fetch(`${base}/api/table/${encodeURIComponent('fixture"; DROP TABLE fixture;--')}?source=first`)).status, 400);
    const post = query => fetch(base + '/api/query?source=first', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
    assert.equal((await post('DELETE FROM fixture')).status, 403);
    assert.equal((await post("WITH x AS (SELECT 1) DELETE FROM fixture")).status, 400);
    assert.deepEqual((await (await post('SELECT * FROM fixture')).json()).rows, [{ id: 1 }]);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); for (const id of ['first', 'second']) fs.unlinkSync(path.join(directory, `${id}.db`)); fs.rmdirSync(directory); }
});
