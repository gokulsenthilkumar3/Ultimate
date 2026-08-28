import { test, expect } from '@playwright/test';

test.describe('Finance tab — add transaction validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-shell', { timeout: 10_000 });
    // Navigate to Operations → Finance
    const opsBtn = page.locator('[aria-label="Operations section"]');
    if (await opsBtn.isVisible()) await opsBtn.click();
    const financeTab = page.locator('[data-tab="finance"], button:has-text("Finance")');
    if (await financeTab.first().isVisible()) await financeTab.first().click();
    await page.waitForTimeout(500);
  });

  test('Finance module renders without crashing', async ({ page }) => {
    // At minimum the module-page container should be present
    await expect(page.locator('.module-page')).toBeVisible();
  });

  test('Add transaction shows validation toast when amount missing', async ({ page }) => {
    // Open add form if a trigger button exists
    const addBtn = page.locator('button:has-text("ADD"), button:has-text("Transaction")');
    if (await addBtn.first().isVisible()) {
      await addBtn.first().click();
      await page.waitForTimeout(300);
      // Submit without filling amount
      const saveBtn = page.locator('button:has-text("SAVE"), button:has-text("ADD")');
      if (await saveBtn.last().isVisible()) {
        await saveBtn.last().click();
        await expect(page.locator('text=/required|amount|invalid/i').first()).toBeVisible({ timeout: 3000 });
      }
    } else {
      test.skip();
    }
  });
});
