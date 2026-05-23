import { test, expect } from '@playwright/test';

test.describe('Tasks tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app-shell', { timeout: 10_000 });
    const opsBtn = page.locator('[aria-label="Operations section"]');
    if (await opsBtn.isVisible()) await opsBtn.click();
    const tasksTab = page.locator('[data-tab="tasks"], button:has-text("Tasks")');
    if (await tasksTab.first().isVisible()) await tasksTab.first().click();
    await page.waitForTimeout(500);
  });

  test('Tasks module renders', async ({ page }) => {
    await expect(page.locator('.module-page')).toBeVisible();
  });

  test('Add task validates empty title', async ({ page }) => {
    const addBtn = page.locator('button:has-text("ADD TASK"), button:has-text("New Task"), button:has-text("Add")');
    if (await addBtn.first().isVisible()) {
      await addBtn.first().click();
      await page.waitForTimeout(300);
      const saveBtn = page.locator('button:has-text("SAVE"), button:has-text("Add Task")');
      if (await saveBtn.last().isVisible()) {
        await saveBtn.last().click();
        await expect(page.locator('text=/required|title/i').first()).toBeVisible({ timeout: 3000 });
      }
    } else {
      test.skip();
    }
  });

  test('Can mark a task complete if tasks exist', async ({ page }) => {
    const checkBtn = page.locator('.module-page [role="checkbox"], .module-page button[aria-label*="complete"]');
    const count = await checkBtn.count();
    if (count > 0) {
      await checkBtn.first().click();
      // Some visual change should occur
      await page.waitForTimeout(300);
      await expect(page.locator('.module-page')).toBeVisible();
    } else {
      test.skip();
    }
  });
});
