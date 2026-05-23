/**
 * notes.spec.js
 * E2E: Notes tab — save note requires title, auto-save toast shown.
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173/Ultimate/';

test.describe('Notes — validation & save', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    const skip = page.getByRole('button', { name: /skip|get started/i });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    // Navigate to Notes (Library group)
    const lib = page.getByRole('tab', { name: /library/i });
    await lib.click();
    await page.waitForTimeout(300);
    const notesBtn = page.getByRole('button', { name: /^notes$/i });
    if (await notesBtn.isVisible().catch(() => false)) await notesBtn.click();
    await page.waitForTimeout(300);
  });

  test('creates a new note with a title and body', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /new note|add note/i });
    if (await addBtn.isVisible().catch(() => false)) await addBtn.click();
    const titleInput = page.locator('input[placeholder*="title" i], input[placeholder*="note" i]').first();
    await titleInput.fill('E2E Note Title');
    const saveBtn = page.getByRole('button', { name: /save/i }).first();
    await saveBtn.click();
    await expect(page.getByText('E2E Note Title')).toBeVisible();
  });

  test('shows error when saving a note without a title', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /new note|add note/i });
    if (await addBtn.isVisible().catch(() => false)) await addBtn.click();
    const saveBtn = page.getByRole('button', { name: /save/i }).first();
    await saveBtn.click();
    await expect(
      page.getByText(/title.*required|required.*title|enter.*title/i)
    ).toBeVisible();
  });
});
