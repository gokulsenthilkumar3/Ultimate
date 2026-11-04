/* Local read-only console. Database values are rendered as text, never HTML. */
let tables = [], currentRows = [], currentColumns = [], sources = [];
let currentTable = '', currentPage = 1, limit = 50, totalRows = 0, activeTab = 'data';
let generation = 0, dataRequest = 0, schemaRequest = 0, queryRequest = 0;
let dataLoading = false, queryLoading = false, drawerTrigger;
let selectedColumns = new Set(), pageSort = { column: null, direction: 1 }, inspectedRow;
const el = id => document.getElementById(id);
const apiBase = location.pathname.startsWith('/db') ? '/db/api' : '/api';
const sourceId = () => el('database-source').value;
const provider = () => sources.find(source => source.id === sourceId())?.provider || '';
const textValue = value => value == null ? 'null' : typeof value === 'object' ? JSON.stringify(value) : String(value);

async function dbFetch(route, options) {
  const response = await fetch(apiBase + route + (route.includes('?') ? '&' : '?') + 'source=' + encodeURIComponent(sourceId()), options);
  if (!response.ok) throw new Error('Database unavailable or query not permitted. Check the connection and try again.');
  return response.json();
}

function connectionStatus(text, state) {
  el('source-status').textContent = text;
  el('connection-dot').dataset.state = state;
}

function emptyGrid(target, message) {
  const body = el(target + '-tbody');
  el(target + '-thead')?.replaceChildren();
  const row = document.createElement('tr'), cell = document.createElement('td');
  cell.colSpan = 100;
  cell.className = 'empty-cell'; cell.textContent = message;
  row.append(cell); body.replaceChildren(row);
}

function updateControls() {
  const usable = Boolean(currentTable) && !dataLoading;
  el('refresh-data').disabled = !usable;
  el('sample-rows').disabled = !currentTable;
  el('row-search').disabled = !usable;
  const rows = visibleRows();
  el('export-csv').disabled = !usable || !rows.length;
  el('export-json').disabled = !usable || !rows.length;
  el('btn-prev').disabled = !usable || currentPage <= 1;
  el('btn-next').disabled = !usable || currentPage * limit >= totalRows;
  el('page-size').disabled = !usable;
  el('column-menu').inert = !usable;
  if (!usable) el('column-menu').open = false;
}

async function init() {
  try {
    const stored = localStorage.getItem('ultimate-db-theme');
    if (stored === 'light' || stored === 'dark') document.documentElement.dataset.theme = stored;
    const density = localStorage.getItem('ultimate-db-density');
    if (density === 'comfortable' || density === 'compact') setDensity(density);
  } catch { /* Browser storage may be unavailable. Keep the default theme/density. */ }
  updateThemeLabel();
  emptyGrid('data', 'Choose a table from the sidebar to explore its records.');
  emptyGrid('schema', 'Choose a table to inspect its columns.');
  emptyGrid('sql', 'Run a read-only query to see results here.');
  updateControls();
  try {
    const response = await fetch(apiBase + '/sources');
    if (!response.ok) throw new Error('Sources unavailable');
    sources = await response.json();
    el('database-source').replaceChildren(...sources.map(source => {
      const option = document.createElement('option'); option.value = source.id;
      option.textContent = source.name + ' · ' + source.provider + (source.online ? '' : ' · Offline');
      return option;
    }));
    await changeSource();
  } catch {
    connectionStatus('Console unavailable · Reload to retry', 'offline');
    renderTableList([], 'Could not load connections. Reload to retry.');
  }
}

async function changeSource() {
  const revision = ++generation;
  dataRequest++; schemaRequest++; queryRequest++;
  currentTable = ''; currentPage = 1; currentRows = []; currentColumns = []; totalRows = 0;
  selectedColumns = new Set(); pageSort = { column: null, direction: 1 }; renderColumnOptions();
  dataLoading = false; queryLoading = false; tables = [];
  closeDrawer();
  el('table-search').value = ''; el('row-search').value = '';
  el('sql-input').value = ''; el('sql-status').textContent = 'Results will appear below. Run with Ctrl+Enter or ⌘+Enter.';
  el('sql-status').classList.remove('error-text'); el('run-sql').disabled = false;
  el('current-table-name').textContent = 'Select a table'; el('schema-table-name').textContent = '/ Select a table';
  el('table-context').textContent = 'Choose a table to explore';
  el('current-table-badge').hidden = true;
  el('stat-tables-count').textContent = '0'; el('stat-records-count').textContent = '—';
  el('provider-name').textContent = provider() || '—';
  el('page-info').textContent = 'No table selected'; el('page-number').textContent = '1 / 1';
  el('last-updated').textContent = 'Not refreshed yet';
  el('data-status').textContent = 'Connecting to database…';
  el('data-status').classList.remove('error-text');
  el('schema-status').textContent = 'Column types and constraints';
  el('schema-status').classList.remove('error-text');
  el('data-grid').setAttribute('aria-busy', 'false');
  emptyGrid('data', 'Loading tables…'); emptyGrid('schema', 'Choose a table to inspect its columns.');
  emptyGrid('sql', 'Run a read-only query to see results here.');
  renderTableList([], 'Loading tables…'); connectionStatus('Connecting…', 'loading'); updateControls();
  try {
    const result = await dbFetch('/tables');
    if (revision !== generation) return;
    tables = result;
    el('stat-tables-count').textContent = tables.length.toLocaleString();
    el('stat-records-count').textContent = tables.reduce((count, table) => count + table.count, 0).toLocaleString();
    connectionStatus('Connected · Read only', 'online');
    filterTables();
    if (tables.length) await selectTable(tables[0].name);
    else { emptyGrid('data', 'This database has no tables.'); el('data-status').textContent = 'No tables available.'; }
  } catch {
    if (revision !== generation) return;
    connectionStatus('Database unavailable', 'offline');
    renderTableList([], 'This connection is offline. Choose another database or reload to retry.');
    emptyGrid('data', 'Connection unavailable. Choose another database or reload to retry.');
    el('data-status').textContent = 'Unable to connect to this database.';
    el('data-status').classList.add('error-text');
  }
}

function renderTableList(list, empty = 'No tables match your search.') {
  el('table-list').replaceChildren(...list.map(table => {
    const item = document.createElement('li'); item.className = 'table-item' + (table.name === currentTable ? ' active' : '');
    const button = document.createElement('button'); button.type = 'button'; button.onclick = () => selectTable(table.name);
    button.setAttribute('aria-current', String(table.name === currentTable));
    const name = document.createElement('span'); name.textContent = table.name; name.title = table.name;
    const count = document.createElement('span'); count.className = 'table-count-badge'; count.textContent = table.count.toLocaleString();
    button.append(name, count); item.append(button); return item;
  }));
  if (!list.length) { const item = document.createElement('li'); item.className = 'list-empty'; item.textContent = empty; el('table-list').append(item); }
}

function filterTables() {
  const query = el('table-search').value.trim().toLowerCase();
  renderTableList(tables.filter(table => table.name.toLowerCase().includes(query)));
}

function switchTab(tab, focus = false) {
  activeTab = tab;
  for (const name of ['data', 'schema', 'sql']) {
    const selected = name === tab;
    el('tab-' + name).classList.toggle('active', selected);
    el('tab-' + name).setAttribute('aria-selected', String(selected));
    el('tab-' + name).tabIndex = selected ? 0 : -1;
    el('panel-' + name).hidden = !selected;
    el('panel-' + name).classList.toggle('hidden', !selected);
  }
  if (focus) el('tab-' + tab).focus();
  if (tab === 'schema') loadSchema();
}

async function selectTable(name) {
  currentTable = name; currentPage = 1; closeDrawer();
  schemaRequest++; selectedColumns = new Set(); pageSort = { column: null, direction: 1 }; renderColumnOptions();
  el('current-table-name').textContent = name;
  el('schema-table-name').textContent = '/ ' + name;
  el('table-context').textContent = name;
  el('row-search').value = ''; filterTables();
  await Promise.all([loadTableData(), activeTab === 'schema' ? loadSchema() : Promise.resolve()]);
}

function renderGrid(target, columns, rows, inspect = false) {
  const head = el(target + '-thead'), body = el(target + '-tbody');
  const header = document.createElement('tr');
  for (const column of [...(inspect ? ['#'] : []), ...columns]) {
    const cell = document.createElement('th'); cell.scope = 'col';
    if (inspect && !header.children.length) { cell.className = 'row-number'; cell.textContent = column; }
    else if (inspect) {
      cell.setAttribute('aria-sort', pageSort.column === column ? (pageSort.direction === 1 ? 'ascending' : 'descending') : 'none');
      const button = document.createElement('button'); button.className = 'column-sort';
      button.textContent = column + (pageSort.column === column ? (pageSort.direction === 1 ? ' ↑' : ' ↓') : ' ↕');
      button.dataset.columnIndex = currentColumns.indexOf(column);
      button.setAttribute('aria-label', 'Sort loaded page by ' + column);
      button.onclick = () => sortPage(column);
      cell.append(button);
    } else cell.textContent = column;
    header.append(cell);
  }
  head.replaceChildren(header);
  if (!rows.length) {
    const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = columns.length + 1;
    cell.className = 'empty-cell'; cell.textContent = el('row-search').value && target === 'data' ? 'No records on this page match your filter.' : 'No records to display.';
    row.append(cell); body.replaceChildren(row); return;
  }
  body.replaceChildren(...rows.map(row => {
    const tr = document.createElement('tr');
    if (inspect) {
      const position = (currentPage - 1) * limit + currentRows.indexOf(row) + 1;
      tr.tabIndex = 0; tr.setAttribute('aria-label', 'Inspect record ' + position);
      tr.dataset.rowIndex = currentRows.indexOf(row);
      tr.onclick = () => inspectRow(row, position, tr);
      tr.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inspectRow(row, position, tr); } };
      const number = document.createElement('td'); number.className = 'row-number'; number.textContent = position; tr.append(number);
    }
    for (const column of columns) {
      const cell = document.createElement('td'), value = row[column];
      cell.textContent = textValue(value); cell.title = cell.textContent;
      if (value == null) cell.className = 'cell-null'; else if (typeof value === 'boolean') cell.className = 'cell-bool';
      tr.append(cell);
    }
    return tr;
  }));
}

function visibleRows() {
  const query = el('row-search').value.trim().toLowerCase();
  const rows = query ? currentRows.filter(row => currentColumns.some(column => textValue(row[column]).toLowerCase().includes(query))) : [...currentRows];
  if (pageSort.column) rows.sort((left, right) => {
    const a = left[pageSort.column], b = right[pageSort.column];
    if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1;
    const compare = typeof a === 'number' && typeof b === 'number' ? a - b : textValue(a).localeCompare(textValue(b), undefined, { numeric: true, sensitivity: 'base' });
    return compare * pageSort.direction;
  });
  return rows;
}

const visibleColumns = () => currentColumns.filter(column => selectedColumns.has(column));
function renderColumnOptions() {
  el('column-count').textContent = selectedColumns.size + '/' + currentColumns.length;
  const focusedId = document.activeElement?.id;
  el('column-options').replaceChildren(...currentColumns.map((column, index) => {
    const label = document.createElement('label'), checkbox = document.createElement('input'), name = document.createElement('span');
    checkbox.type = 'checkbox'; checkbox.id = 'column-option-' + index; checkbox.checked = selectedColumns.has(column);
    checkbox.disabled = selectedColumns.size === 1 && checkbox.checked;
    checkbox.onchange = () => {
      if (checkbox.checked) selectedColumns.add(column); else if (selectedColumns.size > 1) selectedColumns.delete(column);
      if (pageSort.column && !selectedColumns.has(pageSort.column)) pageSort = { column: null, direction: 1 };
      renderColumnOptions(); filterRows();
    };
    name.textContent = column; label.append(checkbox, name); return label;
  }));
  if (focusedId?.startsWith('column-option-')) el(focusedId)?.focus();
}
function showAllColumns() { if (!dataLoading) { selectedColumns = new Set(currentColumns); renderColumnOptions(); filterRows(); } }
function sortPage(column) {
  pageSort = { column, direction: pageSort.column === column && pageSort.direction === 1 ? -1 : 1 };
  filterRows();
  el('data-thead').querySelector('[data-column-index="' + currentColumns.indexOf(column) + '"]')?.focus();
}
function resetPageView() { el('row-search').value = ''; pageSort = { column: null, direction: 1 }; showAllColumns(); }
function setDensity(density) {
  if (!['comfortable', 'compact'].includes(density)) return;
  document.documentElement.dataset.density = density;
  for (const option of ['comfortable', 'compact']) el('density-' + option).setAttribute('aria-pressed', String(option === density));
  try { localStorage.setItem('ultimate-db-density', density); } catch { /* Keep the in-memory preference when storage is unavailable. */ }
}

function filterRows() {
  const rows = visibleRows();
  renderGrid('data', visibleColumns(), rows, true);
  el('data-status').textContent = el('row-search').value.trim() ? rows.length + ' of ' + currentRows.length + ' loaded records match · Exports use these matches' : 'Select a record to inspect · Sort and filter apply to this page';
  el('clear-view').hidden = !el('row-search').value.trim() && !pageSort.column && selectedColumns.size === currentColumns.length;
  updateControls();
}

async function loadTableData() {
  if (!currentTable) return;
  const request = ++dataRequest, revision = generation;
  const showingAllColumns = selectedColumns.size === currentColumns.length;
  dataLoading = true; currentRows = []; currentColumns = []; closeDrawer();
  el('data-status').textContent = 'Loading records…'; el('data-status').classList.remove('error-text');
  el('data-grid').setAttribute('aria-busy', 'true'); emptyGrid('data', 'Loading records…'); updateControls();
  try {
    const data = await dbFetch('/table/' + encodeURIComponent(currentTable) + '?page=' + currentPage + '&limit=' + limit);
    if (revision !== generation || request !== dataRequest) return;
    totalRows = data.total;
    const pages = Math.max(1, Math.ceil(totalRows / limit));
    if (currentPage > pages) { currentPage = pages; return await loadTableData(); }
    currentRows = data.rows || []; currentColumns = data.columns || [];
    if (showingAllColumns || !selectedColumns.size) selectedColumns = new Set(currentColumns);
    else { selectedColumns = new Set(currentColumns.filter(column => selectedColumns.has(column))); if (!selectedColumns.size) selectedColumns = new Set(currentColumns); }
    if (!currentColumns.includes(pageSort.column)) pageSort = { column: null, direction: 1 };
    renderColumnOptions();
    el('current-table-badge').hidden = false; el('current-table-badge').textContent = totalRows.toLocaleString() + ' records';
    el('page-info').textContent = totalRows ? ((currentPage - 1) * limit + 1).toLocaleString() + '–' + Math.min(currentPage * limit, totalRows).toLocaleString() + ' of ' + totalRows.toLocaleString() + ' records' : '0 records';
    el('page-number').textContent = currentPage + ' / ' + pages;
    el('last-updated').textContent = 'Refreshed ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    dataLoading = false; filterRows();
  } catch {
    if (revision !== generation || request !== dataRequest) return;
    emptyGrid('data', 'Could not load records. Use Refresh to try again.');
    el('data-status').textContent = 'Records unavailable. Refresh to retry.'; el('data-status').classList.add('error-text');
    el('page-info').textContent = 'Records unavailable';
  } finally {
    if (revision === generation && request === dataRequest) { dataLoading = false; el('data-grid').setAttribute('aria-busy', 'false'); updateControls(); }
  }
}

async function loadSchema() {
  if (!currentTable) return;
  const revision = generation, request = ++schemaRequest;
  el('schema-status').textContent = 'Loading columns…'; el('schema-status').classList.remove('error-text');
  emptyGrid('schema', 'Loading columns…');
  try {
    const schema = await dbFetch('/schema/' + encodeURIComponent(currentTable));
    if (revision !== generation || request !== schemaRequest) return;
    el('schema-status').textContent = schema.length + ' columns';
    el('schema-tbody').replaceChildren(...schema.map(column => {
      const row = document.createElement('tr');
      for (const value of [column.cid + 1, column.name, column.type || 'TEXT', column.notnull ? 'Not null' : 'Nullable', column.dflt_value ?? '—', column.pk ? 'Primary key' : '—']) {
        const cell = document.createElement('td'); cell.textContent = String(value); row.append(cell);
      }
      return row;
    }));
  } catch {
    if (revision !== generation || request !== schemaRequest) return;
    el('schema-status').textContent = 'Schema unavailable · Select Schema again to retry'; el('schema-status').classList.add('error-text');
    emptyGrid('schema', 'Could not load the schema. Select the Schema tab to retry.');
  }
}

function prevPage() { if (!dataLoading && currentPage > 1) { currentPage--; loadTableData(); } }
function nextPage() { if (!dataLoading && currentPage * limit < totalRows) { currentPage++; loadTableData(); } }
function changeLimit(value) { limit = Number(value); currentPage = 1; loadTableData(); }
function setQuery(query) { el('sql-input').value = query; el('sql-input').focus(); }
function setSampleQuery() { if (currentTable) setQuery('SELECT * FROM "' + currentTable.replaceAll('"', '""') + '" LIMIT 25;'); }
function setCatalogQuery() { setQuery(provider() === 'PostgreSQL' ? "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" : "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;"); }

async function runSql() {
  const query = el('sql-input').value.trim();
  if (!query || queryLoading) return;
  const revision = generation, request = ++queryRequest, started = performance.now();
  queryLoading = true; el('run-sql').disabled = true; el('sql-status').textContent = 'Running read-only query…';
  el('sql-status').classList.remove('error-text'); emptyGrid('sql', 'Running query…');
  try {
    const data = await dbFetch('/query', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
    if (revision !== generation || request !== queryRequest) return;
    const rows = data.rows || [];
    renderGrid('sql', data.columns || [], rows.slice(0, 250));
    el('sql-status').textContent = rows.length + ' rows returned' + (rows.length > 250 ? ' · Showing first 250; add LIMIT to narrow the query' : '') + ' · ' + Math.round(performance.now() - started) + ' ms';
  } catch {
    if (revision !== generation || request !== queryRequest) return;
    el('sql-status').textContent = 'Query could not be completed. Check the connection, SQL syntax and read-only permissions.';
    el('sql-status').classList.add('error-text'); emptyGrid('sql', 'No query results. Update your query and try again.');
  } finally { if (revision === generation && request === queryRequest) { queryLoading = false; el('run-sql').disabled = false; } }
}

function inspectRow(row, position, trigger) {
  drawerTrigger = trigger; inspectedRow = row;
  el('drawer-subtitle').textContent = currentTable + ' · Record ' + position;
  const rows = visibleRows(), index = rows.indexOf(row);
  el('inspect-position').textContent = (index + 1) + ' of ' + rows.length + ' on this page';
  el('inspect-prev').disabled = index <= 0; el('inspect-next').disabled = index >= rows.length - 1;
  el('field-search').value = ''; el('copy-status').textContent = 'Read only · Press Esc to close';
  renderInspectorFields();
  const wasHidden = el('row-drawer').hidden;
  el('row-drawer').hidden = false;
  document.querySelector('.main-workspace').inert = true; document.querySelector('.sidebar').inert = true;
  if (wasHidden) el('close-drawer').focus();
}

function renderInspectorFields() {
  if (!inspectedRow) return;
  const query = el('field-search').value.trim().toLowerCase();
  const columns = currentColumns.filter(column => !query || column.toLowerCase().includes(query) || textValue(inspectedRow[column]).toLowerCase().includes(query));
  el('field-count').textContent = columns.length + ' of ' + currentColumns.length + ' fields';
  el('drawer-body').replaceChildren(...columns.map(column => {
    const card = document.createElement('div'); card.className = 'field-card';
    const label = document.createElement('div'); label.className = 'field-label'; label.textContent = column;
    const value = document.createElement('div'); value.className = 'field-value';
    let formatted = inspectedRow[column];
    if (typeof formatted === 'string' && (formatted.trim().startsWith('[') || formatted.trim().startsWith('{'))) { try { formatted = JSON.parse(formatted); } catch { /* Preserve malformed JSON as plain text. */ } }
    value.textContent = formatted == null ? 'null' : typeof formatted === 'object' ? JSON.stringify(formatted, null, 2) : String(formatted);
    card.append(label, value); return card;
  }));
  if (!columns.length) { const empty = document.createElement('p'); empty.className = 'inspector-empty'; empty.textContent = 'No fields match your search.'; el('drawer-body').append(empty); }
}

function stepRecord(direction) {
  const rows = visibleRows(), index = rows.indexOf(inspectedRow) + direction;
  if (index < 0 || index >= rows.length) return;
  const row = rows[index], originalIndex = currentRows.indexOf(row);
  const trigger = el('data-tbody').querySelector('[data-row-index="' + originalIndex + '"]');
  inspectRow(row, (currentPage - 1) * limit + originalIndex + 1, trigger);
  if (document.activeElement.disabled) el('close-drawer').focus();
}
async function copyRecord() {
  const row = inspectedRow;
  if (!row || el('row-drawer').hidden) return;
  try { await navigator.clipboard.writeText(JSON.stringify(row, null, 2)); if (row === inspectedRow) el('copy-status').textContent = 'Record JSON copied to clipboard'; }
  catch { if (row === inspectedRow) el('copy-status').textContent = 'Could not copy. Select and copy the field text instead.'; }
}

function closeDrawer() {
  if (el('row-drawer').hidden) return;
  el('row-drawer').hidden = true;
  inspectedRow = undefined; el('drawer-body').replaceChildren();
  document.querySelector('.main-workspace').inert = false; document.querySelector('.sidebar').inert = false;
  if (drawerTrigger?.isConnected) drawerTrigger.focus();
}

function download(content, extension, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url;
  link.download = currentTable.replace(/[^a-zA-Z0-9_-]/g, '_') + '-page-' + currentPage + '.' + extension;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportJSON() { if (!dataLoading && currentTable && visibleRows().length) download(JSON.stringify(visibleRows().map(row => Object.fromEntries(visibleColumns().map(column => [column, row[column]]))), null, 2), 'json', 'application/json'); }
function csvCell(value) {
  let text = value == null ? '' : textValue(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
function exportCSV() {
  if (dataLoading || !currentTable || !visibleRows().length) return;
  const columns = visibleColumns();
  const lines = [columns.map(csvCell).join(','), ...visibleRows().map(row => columns.map(column => csvCell(row[column])).join(','))];
  download(lines.join('\r\n'), 'csv', 'text/csv;charset=utf-8');
}
function updateThemeLabel() { const dark = document.documentElement.dataset.theme === 'dark'; el('theme-toggle').textContent = dark ? 'Light theme' : 'Dark theme'; el('theme-toggle').setAttribute('aria-label', 'Switch to ' + (dark ? 'light' : 'dark') + ' theme'); }
function toggleTheme() { document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; updateThemeLabel(); try { localStorage.setItem('ultimate-db-theme', document.documentElement.dataset.theme); } catch { /* The selected theme still applies without persistence. */ } }

el('sql-input').addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); runSql(); } });
document.querySelector('.nav-tabs').addEventListener('keydown', event => {
  const names = ['data', 'schema', 'sql']; let index = names.indexOf(activeTab);
  if (event.key === 'ArrowRight') index = (index + 1) % 3;
  else if (event.key === 'ArrowLeft') index = (index + 2) % 3;
  else if (event.key === 'Home') index = 0;
  else if (event.key === 'End') index = 2;
  else return;
  event.preventDefault(); switchTab(names[index], true);
});
el('row-drawer').addEventListener('click', event => { if (event.target === el('row-drawer')) closeDrawer(); });
el('row-drawer').addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); }
  else if (event.key === 'Tab') {
    const controls = [...el('row-drawer').querySelectorAll('button:not(:disabled), input:not(:disabled)')];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
document.addEventListener('click', event => { if (!el('column-menu').contains(event.target)) el('column-menu').open = false; });
el('column-menu').addEventListener('keydown', event => { if (event.key === 'Escape') { el('column-menu').open = false; el('column-menu').querySelector('summary').focus(); } });
// Public handlers used by the standalone HTML view.
Object.assign(window, { changeSource, filterTables, switchTab, loadTableData, filterRows, setDensity, showAllColumns, resetPageView, prevPage, nextPage, changeLimit, runSql, setSampleQuery, setCatalogQuery, setQuery, closeDrawer, stepRecord, copyRecord, renderInspectorFields, exportCSV, exportJSON, toggleTheme });
init();
