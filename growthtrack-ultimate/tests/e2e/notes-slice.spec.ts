import { readFile } from 'node:fs/promises';
import { test, expect, emptyState, OWNER } from './foundation-fixture';
import type { Page } from '@playwright/test';

async function tokenColor(page: Page, token: string) {
  return page.evaluate(name => {
    const probe = document.createElement('span');
    probe.style.color = `var(${name})`;
    document.body.appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);
}

async function notesFixture(page: Page, rejectUpdates = false, initialNotes?: any[]) {
  const notes = initialNotes || [
    { id: 'note-1', userId: OWNER.id, title: 'Research', content: 'Original research', tags: ['work'], pinned: true, updatedAt: '2026-10-01T00:00:00.000Z' },
    { id: 'note-2', userId: OWNER.id, title: 'Planning', content: 'Second note', tags: [], pinned: false, updatedAt: '2026-09-30T00:00:00.000Z' },
  ];
  await page.route('**/api/state', route => route.fulfill({ json: { ...emptyState(), notes } }));
  await page.route(url => /^\/api\/notes(?:\/|$)/.test(url.pathname), async route => {
    const request = route.request();
    if (request.method() === 'GET') { await route.fulfill({ json: notes }); return; }
    if (request.method() === 'PUT' && rejectUpdates) {
      await route.fulfill({ status: 409, json: { code: 'VERSION_CONFLICT', error: 'The note changed on another device.' } }); return;
    }
    const payload = request.postDataJSON();
    if (request.method() === 'POST') {
      const note = { ...payload, userId: OWNER.id, updatedAt: new Date().toISOString() };
      notes.push(note);
      await route.fulfill({ json: note }); return;
    }
    const id = new URL(request.url()).pathname.split('/').at(-1);
    const note = notes.find(row => row.id === id);
    if (note && request.method() === 'PUT') {
      Object.assign(note, payload, { updatedAt: new Date().toISOString() });
      await route.fulfill({ json: note }); return;
    }
    await route.fulfill({ status: 404, json: { error: 'Fixture note not found' } });
  });
  return notes;
}

test('large note libraries page and search all records without losing an open draft', async ({ page }) => {
  const rows = Array.from({ length: 201 }, (_, index) => ({ id: `large-${index}`, userId: OWNER.id, title: `Synthetic note ${index}`, content: `Synthetic body ${index}`, tags: [], pinned: false, updatedAt: '2026-10-01T00:00:00.000Z' }));
  await notesFixture(page, false, [...rows, { id: 'journal', userId: OWNER.id, title: 'Private journal', source: 'mind-journal', content: 'Private', tags: [] }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workspace/notes');
  const list = page.getByRole('list', { name: 'Workspace notes' });
  await expect(list.locator(':scope > li')).toHaveCount(25);
  await expect(page.getByRole('button', { name: 'Open note: Private journal', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next notes page' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Page 2 of 9')).toBeVisible();
  await page.getByRole('button', { name: 'Edit Synthetic note 25', exact: true }).click();
  await page.getByRole('textbox', { name: 'Note content' }).fill('Draft retained while paging');
  await page.getByRole('button', { name: 'Previous notes page' }).click();
  await expect(page.getByRole('textbox', { name: 'Note content' })).toHaveValue('Draft retained while paging');
  await page.getByRole('textbox', { name: 'Search notes' }).fill('Synthetic note 200');
  await expect(list.locator(':scope > li')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Open note: Synthetic note 200', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('Notes knowledge navigation works by keyboard with outline focus and backlinks', async ({ page }) => {
  const notes = await notesFixture(page);
  notes[0].content = '# Research outline\n\n[[note-2|Plan next steps]]';
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/workspace/notes');
  await page.getByRole('button', { name: 'Open note: Research' }).click();
  const headingButton = page.getByRole('navigation', { name: 'Note outline' }).getByRole('button', { name: 'Research outline' });
  await headingButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Research outline' })).toBeFocused();
  await page.getByRole('button', { name: 'Plan next steps', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.notes-markdown-preview')).toContainText('Second note');
  const backlink = page.getByRole('navigation', { name: 'Note backlinks' }).getByRole('button', { name: 'Research', exact: true });
  await backlink.focus();
  await page.keyboard.press('Enter');
  await expect(headingButton).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('narrow Notes imports with keyboard review, persists, and exports the current draft', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 780 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await notesFixture(page);
  await page.goto('/workspace/notes');
  await expect(page.getByRole('heading', { name: 'My Notes' })).toBeVisible();
  await expect(page.locator('.note-card-title').first()).toHaveCSS('color', await tokenColor(page, '--gt-text'));
  await expect(page.getByRole('button', { name: 'New', exact: true })).toHaveCSS('background-color', await tokenColor(page, '--gt-action'));
  const importButton = page.getByRole('button', { name: 'Import Markdown', exact: true });
  await importButton.focus();
  await page.getByLabel('Choose Markdown file').setInputFiles({ name: 'Field Notes.md', mimeType: 'text/markdown', buffer: Buffer.from('# Field Notes\n\n## Next\n\nDo the useful work.\n') });
  const dialog = page.getByRole('dialog', { name: 'Preview Markdown import' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Create new note' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('textbox', { name: 'Note title' })).toHaveValue('Field Notes');
  await page.reload();
  await page.getByRole('button', { name: 'Edit Field Notes', exact: true }).click();
  await page.getByRole('textbox', { name: 'Note content' }).fill('Unsaved text for export');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Markdown', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Field Notes.md');
  expect(await readFile((await download.path())!, 'utf8')).toBe('# Field Notes\n\nUnsaved text for export');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
  await page.getByRole('textbox', { name: 'Note content' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('notes-editor-390.png'), fullPage: false });
});

test('Notes route views select pinned records and move focus to the new content', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await notesFixture(page);
  await page.goto('/workspace/notes');
  await page.getByRole('navigation', { name: 'Note views' }).getByRole('button', { name: 'Pinned', exact: true }).click();
  await expect(page).toHaveURL(/\?view=pinned$/);
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Open note: Research' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open note: Planning' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Note views' }).getByRole('button', { name: 'Pinned', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('Notes retains failed edits during switching at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await notesFixture(page, true);
  await page.goto('/workspace/notes?view=editor');
  await page.getByRole('button', { name: 'Open note: Research' }).click();
  await page.getByRole('textbox', { name: 'Note content' }).fill('Preserve the conflicting version');
  await page.getByRole('button', { name: 'Edit Planning', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Save conflict' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Note title' })).toHaveValue('Research');
  await expect(page.getByRole('textbox', { name: 'Note content' })).toHaveValue('Preserve the conflicting version');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('Notes encrypts unfinished text and recovers it after reload without submitting it', async ({ page }) => {
  const notes = await notesFixture(page);
  await page.route('**/api/notes/note-1', route => route.fulfill({ status: 503, json: { error: 'Offline fixture' } }));
  const updates: string[] = [];
  page.on('request', request => { if (request.method() === 'PUT' && new URL(request.url()).pathname.startsWith('/api/notes/')) updates.push(request.url()); });
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/workspace/notes?view=editor');
  await page.getByRole('button', { name: 'Open note: Research' }).click();
  await page.getByRole('textbox', { name: 'Note content' }).fill('Private unfinished text for recovery');
  await expect(page.locator('.notes-local-status')).toHaveText(/Encrypted draft saved on this device/);
  await expect(page.getByRole('status').filter({ hasText: 'Save failed' })).toBeVisible();
  const storage = await page.evaluate(async () => {
    // Inspect the isolated browser's persisted records. Importing /src modules
    // works only with Vite dev and cannot verify a production preview build.
    const read = (name: string, store: string, key: IDBValidKey) => new Promise<any>((resolve, reject) => {
      const open = indexedDB.open(name);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const database = open.result, transaction = database.transaction(store, 'readonly');
        const request = transaction.objectStore(store).get(key);
        transaction.oncomplete = () => { database.close(); resolve(request.result); };
        transaction.onerror = transaction.onabort = () => { database.close(); reject(transaction.error); };
      };
    });
    const row = await read('growthtrack-private-drafts-v1', 'drafts', JSON.stringify(['isolated-test-owner', 'workspace-note:note-1']));
    const storedKey = await read('growthtrack-note-draft-keys-v1', 'keys', 'isolated-test-owner');
    return { ciphertext: row.data.ciphertext instanceof ArrayBuffer, plaintext: JSON.stringify(row).includes('Private unfinished text for recovery'), extractable: storedKey.key.extractable };
  });
  expect(storage).toEqual({ ciphertext: true, plaintext: false, extractable: false });
  await page.reload();
  await page.getByRole('button', { name: 'Review draft: Research' }).click();
  await page.getByRole('button', { name: 'Open recovered editor' }).click();
  await expect(page.getByRole('textbox', { name: 'Note content' })).toHaveValue('Private unfinished text for recovery');
  const beforeReview = updates.length;
  await page.waitForTimeout(1400);
  expect(updates.length).toBe(beforeReview);
  await page.getByRole('button', { name: 'Save a separate copy' }).click();
  await expect(page.getByRole('textbox', { name: 'Note title' })).toHaveValue('Research (recovered)');
  expect(notes.find(note => note.id === 'note-1')?.content).toBe('Original research');
});

test('public skip links bypass navigation with the keyboard', async ({ page }) => {
  await page.route('**/api/auth/me', route => route.fulfill({ status: 401, json: { error: 'Signed out fixture' } }));
  for (const path of ['/welcome', '/login', '/privacy', '/terms']) {
    await page.goto(path);
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeAttached();
    // Establish focus on the first navigation link. Shift+Tab must reach the
    // preceding skip link, then Enter must move directly into the content.
    // Explicit tabIndex=0 on the skip link includes it in Windows WebKit's
    // keyboard traversal even when its default preference skips other links.
    await expect(page.locator('a').first()).toHaveText('Skip to main content');
    await page.locator('a').nth(1).focus();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#public-content')).toBeFocused();
  }
});

test('versioned Notes retries an ambiguous import once and restores a historical revision', async ({ page }) => {
  const notes = await notesFixture(page);
  for (const note of notes) Object.assign(note, { revision: 1, kind: 'workspace', deletedAt: null, color: '#f59e0b', starred: false });
  await page.route('**/api/capabilities', route => route.fulfill({ json: { workspace: { notes: { apiVersion: 1 } }, connections: [] } }));
  const receipts = new Map<string, unknown>();
  const histories = new Map<string, any[]>();
  const imports: any[] = [];
  let ambiguous = true;
  await page.route(url => url.pathname.startsWith('/api/v1/workspace/notes'), async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const id = path.split('/')[5];
    if (request.method() === 'GET' && path.endsWith('/sync')) {
      await route.fulfill({ json: { changes: [], cursor: 0, hasMore: false } }); return;
    }
    if (request.method() === 'GET' && path.endsWith('/revisions')) {
      await route.fulfill({ json: { items: histories.get(id) || [], nextCursor: null } }); return;
    }
    const payload = request.postDataJSON();
    if (request.method() === 'POST' && path.endsWith('/notes')) imports.push(payload);
    if (receipts.has(payload.mutationId)) { await route.fulfill({ json: receipts.get(payload.mutationId) }); return; }
    let saved: any;
    if (request.method() === 'POST' && path.endsWith('/notes')) {
      saved = { ...payload, userId: OWNER.id, revision: 1, kind: 'workspace', deletedAt: null, updatedAt: new Date().toISOString() };
      notes.push(saved); histories.set(saved.id, [{ ...saved, createdAt: saved.updatedAt }]);
    } else {
      saved = notes.find(note => note.id === id);
      if (!saved || saved.revision !== payload.expectedRevision) { await route.fulfill({ status: 409, json: { code: 'VERSION_CONFLICT', error: 'Conflict fixture', current: saved } }); return; }
      const history = histories.get(id) || [];
      const change = path.endsWith('/restore') ? history.find(row => row.revision === payload.revision) : payload;
      Object.assign(saved, { title: change.title || saved.title, content: change.content, revision: saved.revision + 1, updatedAt: new Date().toISOString() });
      history.push({ ...saved, createdAt: saved.updatedAt }); histories.set(id, history);
    }
    const receipt = { ...saved };
    receipts.set(payload.mutationId, receipt);
    if (ambiguous && path.endsWith('/notes')) { ambiguous = false; await route.fulfill({ status: 503, json: { error: 'Response lost after commit' } }); return; }
    await route.fulfill({ json: receipt });
  });
  await page.goto('/workspace/notes');
  await page.getByLabel('Choose Markdown file').setInputFiles({ name: 'History.md', mimeType: 'text/markdown', buffer: Buffer.from('# History\n\nOriginal version') });
  const dialog = page.getByRole('dialog', { name: 'Preview Markdown import' });
  await dialog.getByRole('button', { name: 'Create new note' }).click();
  await expect(page.getByText('The note could not be imported. Your preview is still available to retry.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Create new note' }).click();
  await expect(dialog).toBeHidden();
  expect(imports).toHaveLength(2);
  expect(imports[0].id).toBe(imports[1].id);
  expect(imports[0].mutationId).toBe(imports[1].mutationId);
  expect(notes.filter(note => note.title === 'History')).toHaveLength(1);
  await page.getByRole('textbox', { name: 'Note content' }).fill('Changed version');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'History', exact: true }).click();
  const history = page.getByRole('dialog', { name: 'Note history' });
  await expect(history.getByText('Changed version', { exact: true })).toBeVisible();
  await history.getByRole('button', { name: 'Restore revision 1' }).click();
  await expect(history).toBeHidden();
  expect(notes.find(note => note.id === imports[0].id)?.content).toBe('Original version');
  expect(notes.find(note => note.id === imports[0].id)?.revision).toBe(3);
});
