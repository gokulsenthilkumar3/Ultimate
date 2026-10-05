import { readFile } from 'node:fs/promises';
import { test, expect, emptyState, OWNER } from './foundation-fixture';
import type { Page } from '@playwright/test';

async function notesFixture(page: Page, rejectUpdates = false) {
  const notes = [
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

test('narrow Notes imports with keyboard review, persists, and exports the current draft', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 780 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await notesFixture(page);
  await page.goto('/workspace/notes');
  await expect(page.getByRole('heading', { name: 'My Notes' })).toBeVisible();
  await expect(page.locator('.note-card-title').first()).toHaveCSS('color', 'rgb(32, 39, 34)');
  await expect(page.getByRole('button', { name: 'New', exact: true })).toHaveCSS('background-color', 'rgb(121, 80, 12)');
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
    const draftsPath = '/src/lib/drafts.ts';
    const keysPath = '/src/domains/workspace/adapters/noteDraftKeys.ts';
    const { listDrafts } = await import(draftsPath);
    const { getNoteDraftKey } = await import(keysPath);
    const row = (await listDrafts('isolated-test-owner')).find((draft: { module: string }) => draft.module === 'workspace-note:note-1');
    return { ciphertext: row.data.ciphertext instanceof ArrayBuffer, plaintext: JSON.stringify(row).includes('Private unfinished text for recovery'), extractable: (await getNoteDraftKey('isolated-test-owner')).extractable };
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
