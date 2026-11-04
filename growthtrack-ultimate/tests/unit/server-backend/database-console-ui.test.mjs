import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createDatabaseStudio } from '../../../scripts/db-studio.mjs';

const require = createRequire(new URL('../../../package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const waitFor = async predicate => {
  const deadline = Date.now() + 4000;
  while (!predicate()) { if (Date.now() > deadline) throw new Error('UI did not settle'); await new Promise(resolve => setTimeout(resolve, 10)); }
};

async function consoleFixture(run) {
  const row = { id: 1, title: '<img src=x onerror=alert(1)>', detail: 'comma, "quote"\nnew line', formula: '=1+1' };
  const adapter = {
    ping: async () => {}, tables: async () => [{ name: 'Records', count: 51 }, { name: 'Empty', count: 0 }],
    rows: async (name, page, limit) => ({ columns: Object.keys(row), rows: name === 'Empty' ? [] : [{ ...row, id: page }], total: name === 'Empty' ? 0 : 51, page, limit }),
    schema: async () => [{ cid: 0, name: 'id', type: 'INTEGER', notnull: 1, pk: 1, dflt_value: null }],
    query: async () => ({ columns: ['result'], rows: [{ result: 1 }] }),
  };
  const server = createDatabaseStudio({ sources: new Map([
    ['first', { name: 'First', provider: 'SQLite', adapter }],
    ['second', { name: 'Second', provider: 'PostgreSQL', adapter: { ...adapter, tables: async () => [{ name: 'Other', count: 1 }] } }],
  ]) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  let dom;
  try {
    const html = await (await fetch(base)).text();
    dom = new JSDOM(html, { url: base, runScripts: 'dangerously', beforeParse(window) {
      window.fetch = (route, options) => fetch(new URL(route, base), options);
      window.URL.createObjectURL = () => 'blob:test'; window.URL.revokeObjectURL = () => {};
      window.Blob = Blob;
    } });
    await waitFor(() => dom.window.document.getElementById('data-status').textContent.startsWith('Select a record'));
    await run(dom.window, row);
  } finally { dom?.window.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test('record filters, inspector keyboard focus, tabs and empty table state', async () => consoleFixture(async window => {
  const document = window.document, el = id => document.getElementById(id);
  assert.equal(el('current-table-name').textContent, 'Records');
  assert.equal(el('data-tbody').querySelector('img'), null);
  assert.ok(el('data-tbody').textContent.includes('<img'));
  const record = el('data-tbody').querySelector('tr'); record.focus();
  record.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal(el('row-drawer').hidden, false);
  assert.equal(document.activeElement.id, 'close-drawer');
  assert.equal(document.querySelector('.main-workspace').inert, true);
  el('row-drawer').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(el('row-drawer').hidden, true); assert.equal(document.activeElement, record);
  el('row-search').value = 'missing'; window.filterRows();
  assert.match(el('data-tbody').textContent, /No records on this page/);
  assert.equal(el('export-csv').disabled, true);
  el('tab-data').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(el('tab-schema').getAttribute('aria-selected'), 'true');
  await waitFor(() => el('schema-status').textContent === '1 columns');
  assert.match(el('schema-tbody').textContent, /Primary key/);
  await window.selectTable('Empty');
  window.switchTab('data');
  assert.equal(el('page-info').textContent, '0 records');
  assert.equal(el('btn-next').disabled, true);
  assert.equal(el('export-json').disabled, true);
}));

test('pagination, retry errors, safe CSV exports and theme persistence', async () => consoleFixture(async window => {
  const el = id => window.document.getElementById(id);
  window.nextPage();
  await waitFor(() => el('page-number').textContent === '2 / 2');
  assert.match(el('data-tbody').querySelector('tr').getAttribute('aria-label'), /51/);
  assert.equal(el('btn-next').disabled, true);
  let blob, revoked;
  window.URL.createObjectURL = value => { blob = value; return 'blob:test'; };
  window.HTMLAnchorElement.prototype.click = () => {};
  window.URL.revokeObjectURL = value => { revoked = value; };
  window.exportCSV();
  const csv = await blob.text();
  assert.match(csv, /"comma, ""quote""\nnew line"/);
  assert.ok(csv.includes('"\'=1+1"')); assert.ok(csv.includes('\r\n'));
  await waitFor(() => revoked === 'blob:test');
  window.toggleTheme(); assert.equal(window.document.documentElement.dataset.theme, 'dark');
  assert.equal(window.localStorage.getItem('ultimate-db-theme'), 'dark');
  const originalFetch = window.fetch;
  window.fetch = async () => { throw new Error('offline'); };
  await window.loadTableData();
  assert.match(el('data-status').textContent, /unavailable/);
  assert.equal(el('export-csv').disabled, true); assert.equal(el('refresh-data').disabled, false);
  window.fetch = originalFetch; await window.loadTableData();
  assert.equal(el('export-csv').disabled, false);
}));

test('switching sources discards delayed SQL and row results and uses provider-specific templates', async () => consoleFixture(async window => {
  const el = id => window.document.getElementById(id), originalFetch = window.fetch;
  let resolveQuery, resolveRows;
  window.fetch = (route, options) => {
    if (route.includes('/query')) return new Promise(resolve => { resolveQuery = resolve; });
    if (route.includes('/table/Records')) return new Promise(resolve => { resolveRows = resolve; });
    return originalFetch(route, options);
  };
  window.setQuery('SELECT 1');
  const query = window.runSql(), rows = window.loadTableData();
  el('database-source').value = 'second'; await window.changeSource();
  resolveQuery({ ok: true, json: async () => ({ columns: ['old'], rows: [{ old: 'STALE' }] }) });
  resolveRows({ ok: true, json: async () => ({ columns: ['old'], rows: [{ old: 'STALE' }], total: 1 }) });
  await Promise.all([query, rows]);
  assert.equal(el('current-table-name').textContent, 'Other');
  assert.ok(!el('data-tbody').textContent.includes('STALE'));
  assert.ok(!el('sql-tbody').textContent.includes('STALE'));
  window.setCatalogQuery(); assert.match(el('sql-input').value, /pg_tables/);
  window.setSampleQuery(); assert.equal(el('sql-input').value, 'SELECT * FROM "Other" LIMIT 25;');
  window.fetch = async () => ({ ok: true, json: async () => ({ columns: ['id'], rows: Array.from({ length: 600 }, (_, id) => ({ id })) }) });
  await window.runSql();
  assert.equal(el('sql-tbody').children.length, 250);
  assert.match(el('sql-status').textContent, /600 rows returned · Showing first 250/);
  window.fetch = async () => ({ ok: false });
  await window.runSql();
  assert.match(el('sql-status').textContent, /could not be completed/);
  assert.equal(el('run-sql').disabled, false);
}));

async function loadMultipleRows(window) {
  const originalFetch = window.fetch;
  const rows = [{ id: 10, title: 'Zebra', extra: 'hidden detail' }, { id: 2, title: 'Alpha', extra: 'other detail' }, { id: null, title: 'Null record', extra: null }];
  window.fetch = (route, options) => route.includes('/table/Records')
    ? Promise.resolve({ ok: true, json: async () => ({ columns: ['id', 'title', 'extra'], rows, total: rows.length }) })
    : originalFetch(route, options);
  await window.loadTableData();
}

test('column controls, page-local sorting and density preserve the exported view', async () => consoleFixture(async window => {
  const el = id => window.document.getElementById(id);
  await loadMultipleRows(window);
  const ids = () => [...el('data-tbody').rows].map(row => row.cells[1].textContent);
  window.sortPage('id'); assert.deepEqual(ids(), ['2', '10', 'null']);
  assert.equal(el('data-thead').querySelectorAll('th')[1].getAttribute('aria-sort'), 'ascending');
  window.sortPage('id'); assert.deepEqual(ids(), ['10', '2', 'null']);
  el('column-option-1').click(); el('column-option-2').click();
  assert.equal(el('column-count').textContent, '1/3');
  assert.equal(el('column-option-0').disabled, true);
  assert.equal(el('data-tbody').rows[0].cells.length, 2);
  let blob;
  window.URL.createObjectURL = value => { blob = value; return 'blob:test'; };
  window.HTMLAnchorElement.prototype.click = () => {};
  window.exportJSON();
  assert.deepEqual(JSON.parse(await blob.text()), [{ id: 10 }, { id: 2 }, { id: null }]);
  window.setDensity('compact');
  assert.equal(window.document.documentElement.dataset.density, 'compact');
  assert.equal(window.localStorage.getItem('ultimate-db-density'), 'compact');
  assert.equal(el('density-compact').getAttribute('aria-pressed'), 'true');
  window.resetPageView();
  assert.equal(el('column-count').textContent, '3/3'); assert.equal(el('clear-view').hidden, true);
  el('column-menu').open = true;
  el('column-menu').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(el('column-menu').open, false);
  assert.equal(window.document.activeElement.tagName, 'SUMMARY');
  await window.selectTable('Empty');
  assert.equal(el('column-count').textContent, '4/4');
}));

test('inspector navigation, field search, clipboard feedback and focus remain within the dialog', async () => consoleFixture(async window => {
  const document = window.document, el = id => document.getElementById(id);
  await loadMultipleRows(window);
  window.sortPage('id');
  el('data-tbody').rows[0].click();
  assert.equal(el('inspect-position').textContent, '1 of 3 on this page');
  assert.equal(el('inspect-prev').disabled, true);
  let copied;
  Object.defineProperty(window.navigator, 'clipboard', { configurable: true, value: { writeText: async text => { copied = text; } } });
  await window.copyRecord();
  assert.equal(JSON.parse(copied).id, 2);
  assert.match(el('copy-status').textContent, /copied to clipboard/);
  el('field-search').value = 'missing'; window.renderInspectorFields();
  assert.match(el('drawer-body').textContent, /No fields match/);
  el('field-search').focus();
  el('field-search').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  assert.equal(document.activeElement, el('close-drawer'));
  el('close-drawer').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
  assert.equal(document.activeElement, el('field-search'));
  window.stepRecord(1);
  assert.equal(el('inspect-position').textContent, '2 of 3 on this page');
  assert.equal(el('field-search').value, ''); assert.match(el('drawer-body').textContent, /Zebra/);
  window.navigator.clipboard.writeText = async () => { throw new Error('denied'); };
  await window.copyRecord(); assert.match(el('copy-status').textContent, /Could not copy/);
  window.closeDrawer();
  assert.equal(document.activeElement, el('data-tbody').rows[1]);
  assert.equal(el('drawer-body').children.length, 0);
}));
