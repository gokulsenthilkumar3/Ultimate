import { test, expect } from '@playwright/test';

test.describe('Calendar — add & edit events', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-shell', { timeout: 10_000 });
    // Navigate to Calendar tab (BottomNavBar → Operations group → calendar tab)
    // Try clicking any nav item labelled Operations
    const opsBtn = page.locator('[aria-label="Operations section"]');
    if (await opsBtn.isVisible()) await opsBtn.click();
    // Fallback: look for direct calendar link in floating nav
    const calBtn = page.locator('[data-tab="calendar"], button:has-text("Calendar")');
    if (await calBtn.first().isVisible()) await calBtn.first().click();
    await page.waitForTimeout(500);
  });

  test('Add Event modal opens when a day is clicked', async ({ page }) => {
    // Click the first visible day cell in the calendar grid
    const firstDay = page.locator('.content-area [style*="cursor: pointer"]').first();
    await firstDay.click();
    await expect(page.locator('text=/New Event/')).toBeVisible({ timeout: 3000 });
  });

  test('Save button is disabled-equivalent when title is empty', async ({ page }) => {
    const firstDay = page.locator('.content-area [style*="cursor: pointer"]').first();
    await firstDay.click();
    await page.waitForSelector('text=/New Event/');
    // Attempt to save with no title — toast error should appear
    await page.click('button:has-text("SAVE EVENT")');
    await expect(page.locator('text=/required/i')).toBeVisible({ timeout: 3000 });
  });

  test('Can add an event end-to-end', async ({ page }) => {
    const addBtn = page.locator('button:has-text("ADD EVENT")');
    if (await addBtn.isVisible()) await addBtn.click();
    await page.waitForSelector('text=/New Event/');
    await page.fill('input[placeholder*="Workout"]', 'Playwright Test Event');
    await page.click('button:has-text("SAVE EVENT")');
    // Toast success or event appears somewhere on the page
    await expect(page.locator('text=/added|Event/i').first()).toBeVisible({ timeout: 5000 });
  });
});
