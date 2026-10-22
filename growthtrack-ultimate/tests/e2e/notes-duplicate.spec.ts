import { test, expect, emptyState } from './foundation-fixture';

test('Notes retries a lost duplicate acknowledgement, persists one copy and retains its original', async ({ page }) => {
  const original = { id: 'source-note', title: 'Research', content: '# Work\n\n[[target|Next step]]', tags: ['work'], color: '#6366f1', pinned: true, starred: true, kind: 'workspace', revision: 1, deletedAt: null, updatedAt: '2026-10-22T10:00:00.000Z' };
  const notes: any[] = [original]; const creates: any[] = [];
  let loseAcknowledgement = true;
  await page.route('**/api/capabilities', route => route.fulfill({ json: { workspace: { notes: { apiVersion: 1 } } } }));
  await page.route('**/api/state', route => route.fulfill({ json: { ...emptyState(), notes } }));
  await page.route(url => url.pathname.startsWith('/api/v1/workspace/notes'), async route => {
    if (new URL(route.request().url()).pathname.endsWith('/sync')) return route.fulfill({ json: { changes: [], cursor: 0, hasMore: false } });
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON(); creates.push(payload);
      let saved = notes.find(note => note.id === payload.id);
      if (!saved) { saved = { ...payload, kind: 'workspace', revision: 1, deletedAt: null, updatedAt: original.updatedAt }; notes.push(saved); }
      if (loseAcknowledgement) { loseAcknowledgement = false; return route.fulfill({ status: 503, json: { error: 'Fixture lost acknowledgement' } }); }
      return route.fulfill({ json: saved });
    }
    return route.fulfill({ json: { items: notes, nextCursor: null } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workspace/notes');
  await page.getByRole('button', { name: 'Open note: Research', exact: true }).click();
  const duplicate = page.getByRole('button', { name: 'Duplicate note', exact: true });
  await duplicate.focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Retry duplicate', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Note content' })).toHaveValue(original.content);
  expect(creates).toHaveLength(2); expect(creates[0]).toEqual(creates[1]);
  expect(notes).toHaveLength(2); expect(notes[0]).toEqual(original);
  expect(notes[1]).toMatchObject({ title: 'Research (copy)', pinned: false, starred: false, revision: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open note: Research (copy)', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Open note: Research (copy)', exact: true }).click();
  await expect(page.locator('.notes-markdown-preview')).toContainText('Next step');
  await page.locator('.notes-detail-pane').screenshot({ path: test.info().outputPath('notes-copy-mobile.png') });
});
